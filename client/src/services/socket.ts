import { io, Socket } from "socket.io-client";
import { useSocketStore } from "../store/socketStore";
import { useSystemStore } from "../store/systemStore";
import { useVisionStore } from "../store/visionStore";
import { useCameraStore } from "../store/cameraStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const IS_DEV = import.meta.env.DEV;

let socket: Socket | null = null;
let heartbeatInterval: any = null;

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
    logDev("Received vision update:", data);
    if (data && data.payload) {
      const { frame, payload } = data;
      useVisionStore.getState().updateVisionData(payload);
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
        useCameraStore.getState().updateDetectedItems({ faces: 0, hands: 0, objects: 0, emotion: "None" });
      } else {
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

          // Get emotion
          let detectedEmotion = "None";
          if (Array.isArray(payload.emotions) && payload.emotions.length > 0) {
            const first = payload.emotions[0];
            detectedEmotion = typeof first === "object" ? (first as any).label : first;
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
  });

  /**
   * Received when the Python Vision Engine crashes unexpectedly.
   * Resets all camera state and flips the UI toggle back to OFF.
   */
  s.on("camera:crashed", (data: any) => {
    logDev("Camera crashed notification:", data);
    useCameraStore.getState().resetCameraFeed();
    useCameraStore.getState().setCameraEnabled(false);
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
