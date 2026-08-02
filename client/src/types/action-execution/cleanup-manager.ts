/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Cleanup Manager (`cleanup-manager.ts`)
 *
 * @file cleanup-manager.ts
 * @description Idempotent resource disposal component responsible for clearing active workers,
 * cancelling timeouts, disposing temporary execution resources, and emitting a CleanupReport.
 *
 * @module @aether/action-execution/cleanup-manager
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import type { WorkerDispatcher } from "./worker-dispatcher";
import type { TimeoutManager } from "./timeout-manager";
import type { CleanupReport } from "./result-types";
import { CleanupError } from "./result-errors";
import { deepFreeze } from "./factories";

export class CleanupManager {
  private _counter = 0;

  /**
   * Idempotently cleans up active worker instances.
   */
  public cleanupWorkers(workerDispatcher?: WorkerDispatcher): number {
    if (!workerDispatcher) {
      return 0;
    }

    try {
      const activeCount = workerDispatcher.getActiveWorkers().length;
      workerDispatcher.clearAll();
      return activeCount;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CleanupError("workers", msg);
    }
  }

  /**
   * Idempotently clears all active timer references from TimeoutManager.
   */
  public cleanupTimeouts(timeoutManager?: TimeoutManager): number {
    if (!timeoutManager) {
      return 0;
    }

    try {
      timeoutManager.clearAll();
      return 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CleanupError("timeouts", msg);
    }
  }

  /**
   * Idempotently disposes an arbitrary collection of execution resources (AbortControllers, cleanups, objects).
   */
  public cleanupExecutionResources(resources?: readonly unknown[]): number {
    if (!resources || !Array.isArray(resources)) {
      return 0;
    }

    let cleaned = 0;
    for (const item of resources) {
      if (!item) continue;

      try {
        if (typeof item === "function") {
          item();
          cleaned++;
        } else if (item instanceof AbortController) {
          if (!item.signal.aborted) {
            item.abort("Cleanup resource disposal");
          }
          cleaned++;
        } else if (typeof (item as Record<string, unknown>).dispose === "function") {
          ((item as Record<string, unknown>).dispose as () => void)();
          cleaned++;
        } else if (typeof (item as Record<string, unknown>).clear === "function") {
          ((item as Record<string, unknown>).clear as () => void)();
          cleaned++;
        }
      } catch {
        // Suppress individual resource cleanup exceptions to ensure full idempotent teardown
      }
    }

    return cleaned;
  }

  /**
   * Executes a full deterministic resource teardown for an execution session.
   */
  public cleanupSession(
    planId: string,
    options: {
      workerDispatcher?: WorkerDispatcher;
      timeoutManager?: TimeoutManager;
      additionalResources?: readonly unknown[];
    } = {}
  ): Readonly<CleanupReport> {
    if (!planId || planId.trim() === "") {
      throw new CleanupError("session", "planId is required for session cleanup.");
    }

    this._counter++;
    const nowMs = Date.now();
    const details: string[] = [];

    // Order: Workers -> Timeouts -> Resources
    const workersCleanedCount = this.cleanupWorkers(options.workerDispatcher);
    details.push(`Cleaned ${workersCleanedCount} active workers.`);

    const timeoutsCleanedCount = this.cleanupTimeouts(options.timeoutManager);
    details.push(`Cleaned active timers.`);

    const resourcesDisposedCount = this.cleanupExecutionResources(options.additionalResources);
    details.push(`Disposed ${resourcesDisposedCount} additional execution resources.`);

    const report: CleanupReport = {
      cleanupId: `cleanup_${planId}_${nowMs}_${this._counter}`,
      planId,
      timestampMs: nowMs,
      workersCleanedCount,
      timeoutsCleanedCount,
      resourcesDisposedCount,
      success: true,
      details: deepFreeze(details),
    };

    return deepFreeze(report);
  }
}
