import type { TriggerType } from "../types/cognitive";

export type TriggerCallback = (type: TriggerType) => void;

class CognitiveTrigger {
  private listeners: Set<TriggerCallback> = new Set();

  /**
   * Subscribes to cognitive trigger notifications.
   * Returns an unsubscribe function.
   */
  subscribe(callback: TriggerCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifies all subscribers that a telemetry trigger occurred.
   */
  notify(type: TriggerType): void {
    this.listeners.forEach((callback) => {
      try {
        callback(type);
      } catch (err) {
        console.error(`[CognitiveTrigger] Callback failed for trigger ${type}:`, err);
      }
    });
  }
}

export const cognitiveTrigger = new CognitiveTrigger();
