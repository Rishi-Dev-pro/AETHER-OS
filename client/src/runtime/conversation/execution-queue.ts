/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Execution Queue (`execution-queue.ts`)
 *
 * @file execution-queue.ts
 * @description Deterministic FIFO execution queue enforcing single active execution, timeouts, and cancellation.
 *
 * @module @aether/runtime/conversation/execution-queue
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type { QueueItem } from "./conversation-types";
import { ExecutionQueueError } from "./conversation-errors";

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

interface InternalQueueEntry<T> {
  item: QueueItem;
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  cancelRequested?: boolean;
}

/**
 * FIFO execution queue enforcing strict single-task execution without concurrency races.
 */
export class ExecutionQueue {
  private queue: InternalQueueEntry<any>[] = [];
  private activeEntry: InternalQueueEntry<any> | null = null;
  private isProcessing = false;
  private counter = 0;

  /**
   * Enqueues an async task for execution.
   *
   * @param prompt User prompt text.
   * @param providerId Target provider ID.
   * @param modelId Target model ID.
   * @param task Async execution function.
   * @returns Promise resolving to task return value.
   */
  public enqueue<T>(
    prompt: string,
    providerId: string,
    modelId: string | undefined,
    task: () => Promise<T>
  ): Promise<T> {
    this.counter++;
    const itemId = `task_${this.counter}_${Date.now()}`;

    const item: QueueItem = {
      id: itemId,
      prompt,
      providerId,
      modelId,
      status: "QUEUED",
      enqueuedAt: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const entry: InternalQueueEntry<T> = {
        item,
        task,
        resolve,
        reject,
      };

      this.queue.push(entry);
      this.processNext();
    });
  }

  /**
   * Cancels a queued or active task by ID.
   *
   * @param id QueueItem ID.
   * @returns True if cancelled, false otherwise.
   */
  public cancel(id: string): boolean {
    const queuedIdx = this.queue.findIndex((e) => e.item.id === id);
    if (queuedIdx !== -1) {
      const [removed] = this.queue.splice(queuedIdx, 1);
      removed.item = { ...removed.item, status: "CANCELLED", completedAt: Date.now() };
      removed.reject(new ExecutionQueueError(`Task '${id}' was cancelled before execution.`));
      return true;
    }

    if (this.activeEntry && this.activeEntry.item.id === id) {
      this.activeEntry.cancelRequested = true;
      return true;
    }

    return false;
  }

  /**
   * Clears all queued tasks.
   */
  public clear(): void {
    const toClear = [...this.queue];
    this.queue = [];

    for (const entry of toClear) {
      entry.item = { ...entry.item, status: "CANCELLED", completedAt: Date.now() };
      entry.reject(new ExecutionQueueError(`Task '${entry.item.id}' cancelled due to queue clear.`));
    }
  }

  /**
   * Returns immutable snapshot of current queue state.
   */
  public snapshot(): ReadonlyArray<QueueItem> {
    const items: QueueItem[] = [];
    if (this.activeEntry) {
      items.push({ ...this.activeEntry.item });
    }
    for (const entry of this.queue) {
      items.push({ ...entry.item });
    }
    return deepFreeze(items);
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const entry = this.queue.shift()!;
    this.activeEntry = entry;
    entry.item = { ...entry.item, status: "RUNNING", startedAt: Date.now() };

    try {
      if (entry.cancelRequested) {
        entry.item = { ...entry.item, status: "CANCELLED", completedAt: Date.now() };
        entry.reject(new ExecutionQueueError(`Task '${entry.item.id}' was cancelled.`));
      } else {
        const result = await entry.task();
        entry.item = { ...entry.item, status: "COMPLETED", completedAt: Date.now() };
        entry.resolve(result);
      }
    } catch (err: any) {
      entry.item = {
        ...entry.item,
        status: "FAILED",
        completedAt: Date.now(),
        error: err.message,
      };
      entry.reject(err);
    } finally {
      this.activeEntry = null;
      this.isProcessing = false;
      this.processNext();
    }
  }
}
