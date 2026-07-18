import { interactionRegistry } from "./interactionRegistry";
import { performHitTest } from "./hitTesting";
import { useInteractionStore } from "../store/interactionStore";
import { useCameraStore } from "../store/cameraStore";
import { cognitiveTrigger } from "../services/cognitiveTrigger";
import type { PointerState, InteractionEventType, InteractionEvent } from "./interactionTypes";
import type { VisionPointer } from "../types/vision";

class InteractionEngine {
  private isInitialized = false;
  private unsubscribeCamera: (() => void) | null = null;

  // Track historical states for edge transitions
  private prevPointerVisible = false;
  private prevPinching = false;
  private currentHoveredId: string | null = null;
  private currentPressedId: string | null = null;
  private pressStartElementId: string | null = null;

  // Relative movement state history
  private prevRawX: number | null = null;
  private prevRawY: number | null = null;
  private lastTime = 0;
  private lastTimeSource: "python" | "browser" | null = null;

  // Freeze coordinate buffer for Pinch Lock
  private freezeX = 0.5;
  private freezeY = 0.5;

  /**
   * Initializes the engine by subscribing to the pointer coordinate updates stream
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    let lastPointer: VisionPointer | null = null;

    this.unsubscribeCamera = useCameraStore.subscribe((state) => {
      const currentPointer = state.pointer;
      if (currentPointer !== lastPointer) {
        lastPointer = currentPointer;
        this.update(currentPointer);
      }
    });
  }

  /**
   * Shuts down the subscription and resets interaction states
   */
  shutdown() {
    if (this.unsubscribeCamera) {
      this.unsubscribeCamera();
      this.unsubscribeCamera = null;
    }
    this.isInitialized = false;
    this.reset();
  }

  /**
   * Clear state variables and resets state store
   */
  reset() {
    this.prevPointerVisible = false;
    this.prevPinching = false;
    this.currentHoveredId = null;
    this.currentPressedId = null;
    this.pressStartElementId = null;
    this.prevRawX = null;
    this.prevRawY = null;
    this.lastTime = 0;
    this.lastTimeSource = null;

    useInteractionStore.getState().clearInteractionState();
  }

  /**
   * Core processing function. Executed on every coordinate update frame.
   * Employs relative delta calculation, sigmoid acceleration, and coordinate lock.
   */
  update(rawPointer: VisionPointer) {
    const startTime = performance.now();

    // 1. Check for pointer tracking loss
    if (!rawPointer || !rawPointer.visible) {
      if (this.prevPointerVisible) {
        this.handleTrackingLost();
      }
      return;
    }

    const currentSource = typeof rawPointer.timestamp === "number" ? "python" : "browser";
    const frameTime = rawPointer.timestamp ?? performance.now();
    let dt = 0.0333; // Default 30 FPS pacing fallback
    if (this.lastTime !== 0 && this.prevPointerVisible && this.lastTimeSource === currentSource) {
      dt = (frameTime - this.lastTime) / 1000.0;
    }
    dt = Math.max(0.020, dt); // Floor at 20ms (50fps cap) to prevent velocity spikes
    this.lastTime = frameTime;
    this.lastTimeSource = currentSource;

    const store = useInteractionStore.getState();
    const config = store.config;
    const virtualPointer = store.virtualPointer;

    // 2. Initialize relative anchors on first hand detection frame
    if (!this.prevPointerVisible || this.prevRawX === null || this.prevRawY === null) {
      store.setAnchor({ x: rawPointer.x, y: rawPointer.y });
      this.prevRawX = rawPointer.x;
      this.prevRawY = rawPointer.y;
      this.prevPointerVisible = true;
      this.prevPinching = rawPointer.pinching;
      
      // Seed freeze coordinates
      this.freezeX = virtualPointer.x;
      this.freezeY = virtualPointer.y;
      return;
    }

    // 3. Compute relative deltas relative to previous frame
    const deltaX = rawPointer.x - this.prevRawX;
    const deltaY = rawPointer.y - this.prevRawY;
    this.prevRawX = rawPointer.x;
    this.prevRawY = rawPointer.y;

    // Apply Dead Zone filtering to suppress hand tremor at rest
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const fDeltaX = absDeltaX < config.deadZone ? 0 : deltaX;
    const fDeltaY = absDeltaY < config.deadZone ? 0 : deltaY;

    // 4. Compute Dynamic Gain via Sigmoid Velocity Scaling
    let gain = config.sensitivity;
    if (config.accelerationEnabled && (fDeltaX !== 0 || fDeltaY !== 0)) {
      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dt;
      const exponent = -config.accelerationCurve * (velocity - config.accelerationThreshold);
      const accelFactor = config.accelerationMinGain + (config.accelerationMaxGain - config.accelerationMinGain) / (1.0 + Math.exp(exponent));
      gain *= accelFactor;
    }

    // 5. Accumulate virtual coordinates with boundaries clamped [0, 1] and apply horizontal/vertical gains
    let targetX = virtualPointer.x + fDeltaX * gain * config.horizontalGain;
    let targetY = virtualPointer.y + fDeltaY * gain * config.verticalGain;
    
    targetX = Math.max(0.0, Math.min(1.0, targetX));
    targetY = Math.max(0.0, Math.min(1.0, targetY));

    // 6. Handle Pinch Lock (Freezes coordinates during active pinch)
    const pinchStart = rawPointer.pinching && !this.prevPinching;
    const pinchEnd = !rawPointer.pinching && this.prevPinching;

    if (rawPointer.pinching) {
      if (pinchStart) {
        // Freeze coordinates at the exact moment before pinch registration
        this.freezeX = virtualPointer.x;
        this.freezeY = virtualPointer.y;
      }
      targetX = this.freezeX;
      targetY = this.freezeY;
    } else {
      this.freezeX = targetX;
      this.freezeY = targetY;
    }

    // Update relative coordinate tracker in the store
    store.setVirtualPointer({ x: targetX, y: targetY });

    // Compute absolute window pixels coordinate mapping
    const windowX = targetX * window.innerWidth;
    const windowY = targetY * window.innerHeight;

    const pointerState: PointerState = {
      x: targetX,
      y: targetY,
      windowX,
      windowY,
      visible: true,
      pinching: rawPointer.pinching,
    };

    // Update state store pointer
    store.updatePointer(pointerState);

    // 7. Perform hit testing
    const elements = interactionRegistry.getElements();
    const hitElementId = performHitTest(windowX, windowY, elements);

    // 8. Evaluate Hover transitions
    if (hitElementId !== this.currentHoveredId) {
      if (this.currentHoveredId) {
        this.emitEvent("hoverend", this.currentHoveredId, pointerState);
      }
      this.currentHoveredId = hitElementId;
      if (hitElementId) {
        this.emitEvent("hoverstart", hitElementId, pointerState);
      }
      store.setHoveredId(hitElementId);
    }

    // 9. Evaluate Pinch/Press transitions
    if (pinchStart) {
      this.pressStartElementId = hitElementId;
      this.currentPressedId = hitElementId;
      if (hitElementId) {
        this.emitEvent("pressstart", hitElementId, pointerState);
      }
      store.setPressedId(hitElementId);
    } else if (pinchEnd) {
      cognitiveTrigger.notify("pinch_release");
      if (this.currentPressedId) {
        this.emitEvent("pressend", this.currentPressedId, pointerState);
      }

      // Check if release occurred on the same element that was pressed
      if (hitElementId && hitElementId === this.pressStartElementId) {
        this.emitEvent("click", hitElementId, pointerState);
        cognitiveTrigger.notify("click");
        
        // Dispatch synthetic click
        const element = elements.get(hitElementId);
        if (element) {
          try {
            element.click();
          } catch (err) {
            console.error(`[InteractionEngine] Synthetic click failed for target ${hitElementId}:`, err);
          }
        }
      }

      this.currentPressedId = null;
      this.pressStartElementId = null;
      store.setPressedId(null);
    } else if (fDeltaX !== 0 || fDeltaY !== 0) {
      // Emit pointermove if position shifted
      this.emitEvent("pointermove", hitElementId, pointerState);
    }

    this.prevPointerVisible = true;
    this.prevPinching = rawPointer.pinching;

    // Verify performance constraint (Performance budget: < 0.05ms)
    const duration = performance.now() - startTime;
    if (duration > 0.05) {
      console.warn(`[InteractionEngine] Processing frame exceeded budget: ${duration.toFixed(4)}ms`);
    }
  }

  /**
   * Force resets hover/press states when pointer tracking is dropped
   */
  private handleTrackingLost() {
    const pointerState: PointerState = {
      x: 0.5,
      y: 0.5,
      windowX: 0,
      windowY: 0,
      visible: false,
      pinching: false,
    };

    if (this.currentHoveredId) {
      this.emitEvent("hoverend", this.currentHoveredId, pointerState);
    }
    if (this.currentPressedId) {
      this.emitEvent("pressend", this.currentPressedId, pointerState);
    }

    this.reset();
  }

  /**
   * Log interaction event
   */
  private emitEvent(type: InteractionEventType, targetId: string | null, pointer: PointerState) {
    const event: InteractionEvent = {
      type,
      targetId,
      timestamp: Date.now(),
      pointer,
    };
    useInteractionStore.getState().addEvent(event);
  }
}

export const interactionEngine = new InteractionEngine();
