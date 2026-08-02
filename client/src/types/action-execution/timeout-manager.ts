/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Timeout Manager (`timeout-manager.ts`)
 *
 * @file timeout-manager.ts
 * @description Manages execution timeouts, integrates with AbortController, clears timers cleanly,
 * and raises deterministic ExecutionTimeoutError exceptions.
 *
 * @module @aether/action-execution/timeout-manager
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { ExecutionTimeoutError } from "./engine-errors";
import type { ExecutionTimeout } from "./engine-types";

interface TimeoutEntry {
  readonly timeoutId: string;
  readonly targetId: string;
  readonly durationMs: number;
  readonly createdAtMs: number;
  readonly abortController: AbortController;
  readonly timerRef: ReturnType<typeof setTimeout>;
  isCancelled: boolean;
  isTimedOut: boolean;
}

export class TimeoutManager {
  private readonly _activeTimeouts: Map<string, TimeoutEntry> = new Map();
  private _counter = 0;

  /**
   * Creates a deterministic timeout timer bound to an AbortController.
   */
  public createTimeout(
    targetId: string,
    durationMs: number,
    onTimeout?: () => void
  ): { timeoutId: string; abortController: AbortController } {
    this._counter++;
    const timeoutId = `timeout_${targetId}_${Date.now()}_${this._counter}`;
    const abortController = new AbortController();

    const timerRef = setTimeout(() => {
      const entry = this._activeTimeouts.get(timeoutId);
      if (entry && !entry.isCancelled) {
        entry.isTimedOut = true;
        const err = new ExecutionTimeoutError(targetId, durationMs);
        abortController.abort(err);
        if (onTimeout) {
          try {
            onTimeout();
          } catch {
            // Suppress callback exception inside timer dispatch
          }
        }
      }
    }, durationMs);

    const entry: TimeoutEntry = {
      timeoutId,
      targetId,
      durationMs,
      createdAtMs: Date.now(),
      abortController,
      timerRef,
      isCancelled: false,
      isTimedOut: false,
    };

    this._activeTimeouts.set(timeoutId, entry);

    return { timeoutId, abortController };
  }

  /**
   * Cancels a pending timeout and cleans up timer resources.
   */
  public cancelTimeout(timeoutId: string): boolean {
    const entry = this._activeTimeouts.get(timeoutId);
    if (!entry || entry.isCancelled || entry.isTimedOut) {
      return false;
    }

    clearTimeout(entry.timerRef);
    entry.isCancelled = true;
    this._activeTimeouts.delete(timeoutId);
    return true;
  }

  /**
   * Checks whether a specific timeout has triggered.
   */
  public checkTimeout(timeoutId: string): boolean {
    const entry = this._activeTimeouts.get(timeoutId);
    return entry ? entry.isTimedOut : false;
  }

  /**
   * Returns metadata for an active timeout descriptor.
   */
  public getTimeoutDescriptor(timeoutId: string): ExecutionTimeout | undefined {
    const entry = this._activeTimeouts.get(timeoutId);
    if (!entry) return undefined;
    return Object.freeze({
      timeoutId: entry.timeoutId,
      durationMs: entry.durationMs,
      targetId: entry.targetId,
      createdAtMs: entry.createdAtMs,
      isCancelled: entry.isCancelled,
    });
  }

  /**
   * Cancels and clears all active timeouts.
   */
  public clearAll(): void {
    for (const [timeoutId, entry] of this._activeTimeouts.entries()) {
      if (!entry.isCancelled && !entry.isTimedOut) {
        clearTimeout(entry.timerRef);
        entry.isCancelled = true;
      }
      this._activeTimeouts.delete(timeoutId);
    }
  }
}
