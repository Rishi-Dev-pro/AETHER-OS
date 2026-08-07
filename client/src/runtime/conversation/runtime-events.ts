/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Runtime Events (`runtime-events.ts`)
 *
 * @file runtime-events.ts
 * @description Pure runtime, subscription-based event system emitting and tracking lifecycle events.
 *
 * @module @aether/runtime/conversation/runtime-events
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type { RuntimeEvent, RuntimeEventType } from "./conversation-types";

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

type EventListener<T extends RuntimeEvent = RuntimeEvent> = (event: T) => void;

interface Subscription {
  readonly id: string;
  readonly eventType: RuntimeEventType | "*";
  readonly listener: EventListener;
}

/**
 * Pure runtime event bus without external EventEmitter dependencies.
 */
export class RuntimeEvents {
  private subscriptions = new Map<string, Subscription>();
  private eventHistory: RuntimeEvent[] = [];
  private subCounter = 0;

  /**
   * Subscribes a listener to a specific event type or all events ('*').
   *
   * @param eventType Target event type or '*'.
   * @param listener Callback function.
   * @returns Subscription ID string.
   */
  public subscribe<T extends RuntimeEvent = RuntimeEvent>(
    eventType: RuntimeEventType | "*",
    listener: (event: T) => void
  ): string {
    this.subCounter++;
    const id = `sub_${this.subCounter}_${Date.now()}`;
    this.subscriptions.set(id, {
      id,
      eventType,
      listener: listener as EventListener,
    });
    return id;
  }

  /**
   * Unsubscribes a listener by ID.
   *
   * @param subscriptionId Target subscription ID.
   * @returns True if removed, false otherwise.
   */
  public unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Emits a runtime event to subscribed listeners and records it in event history.
   *
   * @param event RuntimeEvent instance.
   */
  public emit(event: RuntimeEvent): void {
    const frozenEvent = deepFreeze({ ...event });
    this.eventHistory.push(frozenEvent);

    for (const sub of this.subscriptions.values()) {
      if (sub.eventType === "*" || sub.eventType === event.type) {
        try {
          sub.listener(frozenEvent);
        } catch {
          // Isolate listener failures
        }
      }
    }
  }

  /**
   * Returns immutable snapshot of recorded event history.
   */
  public createSnapshot(): ReadonlyArray<RuntimeEvent> {
    return Object.freeze([...this.eventHistory]);
  }

  /**
   * Clears event history.
   */
  public clear(): void {
    this.eventHistory = [];
  }
}
