import type { StructuredContext } from "../types/cognitive";

export class IntentTriggerPolicy {
  /**
   * Deterministically evaluates whether a StructuredContext contains actionable 
   * interaction telemetry to justify executing the intent classification pipeline.
   */
  static isActionable(context: StructuredContext): boolean {
    // 1. Voice Interaction Check (Current Primary Modality)
    const hasVoiceInput = !!(context.voice?.transcript && context.voice.transcript.trim());
    if (hasVoiceInput) {
      return true;
    }

    // 2. Future Modality Extension Hooks
    // Currently, voice is the only production interaction modality that drives intents.
    // Additional interaction modality checks will be registered here (e.g., gesture
    // threshold breaches, gaze interaction focus shifts, browser events, or automation triggers).
    /*
    const hasGestureInput = this.checkGestureInput(context);
    if (hasGestureInput) return true;

    const hasGazeInput = this.checkGazeInput(context);
    if (hasGazeInput) return true;

    const hasBrowserEvent = this.checkBrowserEvent(context);
    if (hasBrowserEvent) return true;
    */

    return false;
  }
}
