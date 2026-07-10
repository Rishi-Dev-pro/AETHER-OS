import { io, Socket } from "socket.io-client";
import { useSocketStore } from "../store/socketStore";
import { useSystemStore } from "../store/systemStore";
import { useVisionStore } from "../store/visionStore";
import { useCameraStore } from "../store/cameraStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const IS_DEV = import.meta.env.DEV;

let socket: Socket | null = null;
let heartbeatInterval: any = null;
let lastNodeDrops = 0;

const logDev = (...args: any[]) => {
  if (IS_DEV) {
    console.log("[Socket.IO]", ...args);
  }
};

export const getSocket = (): Socket => {
  if (!socket) {
    logDev(`Initializing Socket.IO client, connecting to: ${SOCKET_URL}`);
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    setupSocketListeners(socket);
  }
  return socket;
};

// ── Camera Lifecycle Emitters ────────────────────────────────────────────

/**
 * Emits camera:start to the backend to spawn the Python Vision Engine.
 */
export const emitCameraStart = () => {
  const s = getSocket();
  logDev("Emitting camera:start");
  s.emit("camera:start");
};

/**
 * Emits camera:stop to the backend to gracefully stop the Python Vision Engine.
 */
export const emitCameraStop = () => {
  const s = getSocket();
  logDev("Emitting camera:stop");
  s.emit("camera:stop");
};

// ─────────────────────────────────────────────────────────────────────────

const setupSocketListeners = (s: Socket) => {
  s.on("connect", () => {
    logDev("Socket connected. ID:", s.id);
    useSocketStore.getState().setSocketConnected(true);

    // Emit connection event and wait for server acknowledgment
    logDev("Emitting client:connected event...");
    s.emit("client:connected", { socketId: s.id }, (ack: any) => {
      logDev("client:connected acknowledged by server:", ack);
      if (ack && ack.connected) {
        useSocketStore.getState().setBackendConnected(true);
      }
    });

    // Start heartbeat
    startHeartbeat(s);
  });

  s.on("disconnect", (reason) => {
    logDev("Socket disconnected. Reason:", reason);
    useSocketStore.getState().setSocketConnected(false);
    useSocketStore.getState().setBackendConnected(false);
    stopHeartbeat();
  });

  s.on("connect_error", (error) => {
    logDev("Socket connection error:", error.message);
    useSocketStore.getState().setSocketConnected(false);
    useSocketStore.getState().setBackendConnected(false);
  });

  s.on("socket:pong", () => {
    const store = useSocketStore.getState();
    if (store.lastPing) {
      const currentLatency = Date.now() - store.lastPing;
      logDev(`Heartbeat returned. Latency: ${currentLatency}ms`);
      store.updateLatency(currentLatency);
      
      // Sync latency with SystemStore
      useSystemStore.getState().updateMetrics({ latency: currentLatency });
    }
  });

  s.on("server:status", (data) => {
    logDev("Server status broadcast update received:", data);
  });

  s.on("vision:update", (data: any) => {
    const tBrowserReceive = Date.now();
    logDev("Received vision update:", data);
    if (data && data.payload) {
      const { frame, payload, profile } = data;

      // Real-time Age Check (Drop stale frames)
      if (profile && profile.tPythonStart) {
        const age = tBrowserReceive - profile.tPythonStart;
        if (age > 150) {
          console.warn(`[Socket.IO Client] Dropping stale frame (age: ${age}ms)`);
          useVisionStore.getState().incrementDroppedFrames(1);
          return;
        }
      }

      // Sync server-side dropped frames
      if (profile && typeof profile.droppedFramesNode === "number") {
        const nodeDiff = profile.droppedFramesNode - lastNodeDrops;
        if (nodeDiff > 0) {
          useVisionStore.getState().incrementDroppedFrames(nodeDiff);
          lastNodeDrops = profile.droppedFramesNode;
        }
      }

      useVisionStore.getState().updateVisionData(payload);

      // Update pointer engine state
      const pointer = payload.pointer || { x: 0, y: 0, visible: false, pinching: false };
      if (profile && typeof profile.tPythonStart === "number") {
        pointer.timestamp = profile.tPythonStart;
      }
      useCameraStore.getState().setPointer(pointer);

      if (profile) {
        const nodeReceiveDuration = profile.tNodeReceive && profile.tPythonEnd
          ? profile.tNodeReceive - profile.tPythonEnd
          : 0;
        const browserReceiveDuration = profile.tNodeEmitTimestamp
          ? tBrowserReceive - profile.tNodeEmitTimestamp
          : 0;

        const browserProfile = {
          ...profile,
          tNodeReceive: nodeReceiveDuration,
          tBrowserReceive: browserReceiveDuration,
        };

        useVisionStore.getState().updateProfile(browserProfile);

        if (frame) {
          const img = new Image();
          img.src = frame;
          const startDecode = performance.now();
          img.decode()
            .then(() => {
              const tImageDecode = performance.now() - startDecode;
              useVisionStore.getState().updateRenderTime("tImageDecode", tImageDecode);
            })
            .catch(() => {
              useVisionStore.getState().updateRenderTime("tImageDecode", 0);
            });
        }
      }

      useCameraStore.getState().updateCameraFeed(
        frame,
        payload.camera,
        payload.fps,
        payload.frameWidth,
        payload.frameHeight
      );

      // Map faces to targetBoxes
      if (!payload.camera || !frame) {
        useCameraStore.getState().setTargetBoxes([]);
        useCameraStore.getState().setFaceLandmarks([]);
        useCameraStore.getState().setHands([]);
        useCameraStore.getState().setPointer({ x: 0, y: 0, visible: false, pinching: false });
        useCameraStore.getState().updateDetectedItems({ faces: 0, hands: 0, objects: 0, emotion: "None" });
      } else {
        const gestures = Array.isArray(payload.gestures) ? payload.gestures : [];
        const pinches = Array.isArray(payload.pinches) ? payload.pinches : [];
        const rawHands = Array.isArray(payload.hands) ? payload.hands : [];
        const hands = rawHands.map((hand: any) => {
          const gestureObj = gestures.find((g: any) => g.handId === hand.id);
          const pinchObj = pinches.find((p: any) => p.handId === hand.id);
          return {
            ...hand,
            gesture: gestureObj ? gestureObj.gesture : undefined,
            pinch: pinchObj ? {
              active: pinchObj.active,
              state: pinchObj.state,
              strength: pinchObj.strength,
              distance: pinchObj.distance
            } : undefined
          };
        });
        useCameraStore.getState().setHands(hands);

        if (Array.isArray(payload.faces)) {
          const boxes = payload.faces.map((face: any) => {
            const xPercent = payload.frameWidth > 0 ? (face.bbox.x / payload.frameWidth) * 100 : 0;
            const yPercent = payload.frameHeight > 0 ? (face.bbox.y / payload.frameHeight) * 100 : 0;
            return {
              id: face.id.toString(),
              label: "FACE DETECTED",
              x: xPercent,
              y: yPercent,
              w: face.bbox.width,
              h: face.bbox.height,
              confidence: Math.round(face.confidence * 100)
            };
          });
          useCameraStore.getState().setTargetBoxes(boxes);

          // Extract face landmarks for Face Mesh overlay
          const landmarkEntries = payload.faces
            .filter((face: any) => Array.isArray(face.landmarks) && face.landmarks.length > 0)
            .map((face: any) => ({
              id: face.id.toString(),
              landmarks: face.landmarks,
            }));
          useCameraStore.getState().setFaceLandmarks(landmarkEntries);

          // Get emotion
          let detectedEmotion = "None";
          if (Array.isArray(payload.faces) && payload.faces.length > 0) {
            const primaryFace = payload.faces[0];
            if (primaryFace.emotion) {
              detectedEmotion = primaryFace.emotion.dominant || "None";
            }
          }

          useCameraStore.getState().updateDetectedItems({
            faces: payload.faces.length,
            hands: Array.isArray(payload.hands) ? payload.hands.length : 0,
            objects: Array.isArray(payload.objects) ? payload.objects.length : 0,
            emotion: detectedEmotion
          });
        }
      }
    } else {
      // Compatibility fallback
      useVisionStore.getState().updateVisionData(data);
    }
  });

  // ── Camera Lifecycle Listeners ───────────────────────────────────────

  /**
   * Received when the backend confirms the camera has been stopped.
   */
  s.on("camera:stopped", (data: any) => {
    logDev("Camera stopped confirmed by backend:", data);
    useCameraStore.getState().resetCameraFeed();
    lastNodeDrops = 0;
    useVisionStore.setState({ droppedFrames: 0 });
  });

  /**
   * Received when the Python Vision Engine crashes unexpectedly.
   * Resets all camera state and flips the UI toggle back to OFF.
   */
  s.on("camera:crashed", (data: any) => {
    logDev("Camera crashed notification:", data);
    useCameraStore.getState().resetCameraFeed();
    useCameraStore.getState().setCameraEnabled(false);
    lastNodeDrops = 0;
    useVisionStore.setState({ droppedFrames: 0 });
  });

  // ─────────────────────────────────────────────────────────────────────
};

const startHeartbeat = (s: Socket) => {
  stopHeartbeat();
  logDev("Starting heartbeat pinger (10s intervals)...");
  heartbeatInterval = setInterval(() => {
    const store = useSocketStore.getState();
    const now = Date.now();
    store.setLastPing(now);
    logDev("Sending socket:ping...");
    s.emit("socket:ping");
  }, 10000);
};

const stopHeartbeat = () => {
  if (heartbeatInterval) {
    logDev("Stopping heartbeat pinger...");
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};
