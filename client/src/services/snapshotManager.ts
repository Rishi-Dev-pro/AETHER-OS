import { useCameraStore } from "../store/cameraStore";
import { useVisionStore } from "../store/visionStore";
import { useVoiceStore } from "../store/voiceStore";
import { useSocketStore } from "../store/socketStore";
import { useSystemStore } from "../store/systemStore";
import { useInteractionStore } from "../store/interactionStore";
import { useCognitiveStore } from "../store/cognitiveStore";
import { COGNITIVE_CONFIG } from "../config/cognitiveConfig";
import type { PerceptionSnapshot, TriggerType } from "../types/cognitive";
import { cognitiveTrigger } from "./cognitiveTrigger";
import { buildCognitiveContext } from "./contextBuilder";
import { getSessionSocketId } from "../utils/sessionAccessor";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "snap_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
};

class SnapshotManager {
  private history: PerceptionSnapshot[] = [];
  private pollingIntervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribeTrigger: (() => void) | null = null;
  private sessionInitTime: number = Date.now();
  private isInitialized = false;

  /**
   * Initializes the snapshot manager by subscribing to triggers and starting the polling timer.
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.sessionInitTime = Date.now();

    // Subscribe to cognitive trigger event bus
    this.unsubscribeTrigger = cognitiveTrigger.subscribe((type) => {
      this.takeSnapshot(type);
    });

    // Start passive low-frequency polling timer
    this.startTimer();
  }

  /**
   * Shuts down the snapshot manager by clearing intervals and trigger subscriptions.
   */
  shutdown() {
    this.stopTimer();
    if (this.unsubscribeTrigger) {
      this.unsubscribeTrigger();
      this.unsubscribeTrigger = null;
    }
    this.isInitialized = false;
  }

  /**
   * Returns the internal history of snapshots (private FIFO queue).
   */
  getHistory(): PerceptionSnapshot[] {
    return this.history;
  }

  /**
   * Aggregates live Zustand states and registers the snapshot/context.
   */
  takeSnapshot(type: TriggerType) {
    try {
      const cameraState = useCameraStore.getState();
      const visionState = useVisionStore.getState();
      const voiceState = useVoiceStore.getState();
      const socketState = useSocketStore.getState();
      const systemState = useSystemStore.getState();
      const interactionState = useInteractionStore.getState();

      const timestamp = Date.now();
      const snapshotId = generateUUID();

      // Retrieve socket connection info via transport-independent registry accessor
      const socketId = getSessionSocketId();

      // Map vision faces to snapshot schema (filter out raw mesh arrays)
      const faces = (visionState.activeFaces || []).map((face) => ({
        id: face.id,
        confidence: face.confidence,
        bbox: face.boundingBox ? {
          x: face.boundingBox.x,
          y: face.boundingBox.y,
          w: face.boundingBox.w,
          h: face.boundingBox.h,
        } : undefined,
        looking: face.looking,
        dominantEmotion: face.emotion?.dominant || undefined,
      }));

      // Map hands from cameraState which holds normalized gestures/pinches
      const hands = (cameraState.hands || []).map((hand) => ({
        id: hand.id,
        handedness: hand.handedness || hand.side || "unknown",
        gesture: hand.gesture,
        pinchActive: hand.pinch?.active ?? false,
        pinchStrength: hand.pinch?.strength ?? 0,
      }));

      // Find the last interaction event type in queue
      const latestEvent = interactionState.events[interactionState.events.length - 1];
      const lastInteractionType = latestEvent ? latestEvent.type : null;

      // Construct the snapshot payload (with cloned structures for pointer states)
      const snapshot: PerceptionSnapshot = {
        metadata: {
          snapshotId,
          schemaVersion: COGNITIVE_CONFIG.schemaVersion,
          builderVersion: COGNITIVE_CONFIG.builderVersion,
          timestamp,
          triggerType: type,
        },
        session: {
          sessionId: "session_" + this.sessionInitTime,
          socketId,
        },
        vision: {
          cameraActive: cameraState.isCameraEnabled,
          fps: cameraState.fps,
          faceCount: cameraState.detectedItems.faces,
          emotionSummary: cameraState.detectedItems.emotion,
          faces,
          handCount: cameraState.detectedItems.hands,
          hands,
          pointer: { ...cameraState.pointer }, // Cloned reference to ensure immutability
        },
        voice: {
          isListening: voiceState.isListening,
          isSpeaking: voiceState.isSpeaking,
          transcript: voiceState.transcript,
          isFinal: voiceState.isFinal,
          confidence: voiceState.confidence,
        },
        interaction: {
          hoveredElementId: interactionState.hoveredId,
          pressedElementId: interactionState.pressedId,
          virtualPointer: { ...interactionState.virtualPointer }, // Cloned reference to ensure immutability
          lastInteractionType,
        },
        environment: {
          latency: socketState.latency,
          systemFps: systemState.fps,
          resolution: `${window.innerWidth}x${window.innerHeight}`,
        },
      };

      // Perform change-aware snapshot checks to eliminate duplicate/spammy state writes
      const lastSnapshot = this.history[this.history.length - 1];
      if (
        lastSnapshot &&
        type !== "passive_timer" &&
        type !== "explicit"
      ) {
        if (!this.hasSnapshotChanged(lastSnapshot, snapshot)) {
          return;
        }
      }

      // Generate structured context deterministically
      const context = buildCognitiveContext(snapshot);
      context.contextMetadata.timeOffsetMs = timestamp - this.sessionInitTime;

      // Commit to the Cognitive Zustand Store
      useCognitiveStore.getState().setCognitiveData(snapshot, context);

      // Manage the internal FIFO queue history limits
      this.history.push(snapshot);
      if (this.history.length > COGNITIVE_CONFIG.snapshotHistoryLimit) {
        this.history.shift();
      }
    } catch (err) {
      console.error("[SnapshotManager] Critical error taking snapshot:", err);
    }
  }

  /**
   * Lightweight semantic check comparing current candidate snapshot and previous history snapshot.
   */
  private hasSnapshotChanged(last: PerceptionSnapshot, curr: PerceptionSnapshot): boolean {
    // 1. Pointer checks (movement delta, visibility, pinch active state)
    const lp = last.vision.pointer;
    const cp = curr.vision.pointer;
    const threshold = COGNITIVE_CONFIG.pointerMovementThreshold;
    const pMoved =
      Math.abs((cp.x || 0) - (lp.x || 0)) > threshold ||
      Math.abs((cp.y || 0) - (lp.y || 0)) > threshold ||
      cp.visible !== lp.visible ||
      cp.pinching !== lp.pinching;
    if (pMoved) return true;

    // 2. Hovered/Pressed target element checks
    if (curr.interaction.hoveredElementId !== last.interaction.hoveredElementId) return true;
    if (curr.interaction.pressedElementId !== last.interaction.pressedElementId) return true;

    // 3. Hands checks (count, gestures, pinch metrics)
    if (curr.vision.handCount !== last.vision.handCount) return true;
    if (curr.vision.hands.length !== last.vision.hands.length) return true;
    for (let i = 0; i < curr.vision.hands.length; i++) {
      const ch = curr.vision.hands[i];
      const lh = last.vision.hands[i];
      if (
        !lh ||
        ch.id !== lh.id ||
        ch.gesture !== lh.gesture ||
        ch.pinchActive !== lh.pinchActive ||
        Math.abs(ch.pinchStrength - lh.pinchStrength) > 0.05
      ) {
        return true;
      }
    }

    // 4. Face checks (count, looking focus, emotions)
    if (curr.vision.faceCount !== last.vision.faceCount) return true;
    if (curr.vision.emotionSummary !== last.vision.emotionSummary) return true;
    if (curr.vision.faces.length !== last.vision.faces.length) return true;
    for (let i = 0; i < curr.vision.faces.length; i++) {
      const cf = curr.vision.faces[i];
      const lf = last.vision.faces[i];
      if (
        !lf ||
        cf.id !== lf.id ||
        cf.looking !== lf.looking ||
        cf.dominantEmotion !== lf.dominantEmotion
      ) {
        return true;
      }
    }

    // 5. Voice checks (listening states, interim/final transcript text changes)
    if (curr.voice.isListening !== last.voice.isListening) return true;
    if (curr.voice.isSpeaking !== last.voice.isSpeaking) return true;
    if (curr.voice.transcript !== last.voice.transcript) return true;
    if (curr.voice.isFinal !== last.voice.isFinal) return true;

    return false;
  }

  private startTimer() {
    this.stopTimer();
    this.pollingIntervalId = setInterval(() => {
      cognitiveTrigger.notify("passive_timer");
    }, COGNITIVE_CONFIG.pollingIntervalMs);
  }

  private stopTimer() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }
}

export const snapshotManager = new SnapshotManager();
