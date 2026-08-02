/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Worker Dispatcher (`worker-dispatcher.ts`)
 *
 * @file worker-dispatcher.ts
 * @description Worker allocation, execution tracking, cancellation, and abort handling component.
 * Performs no scheduling, no retries, and no result aggregation.
 *
 * @module @aether/action-execution/worker-dispatcher
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import type { ResolvedExecutionStep } from "./resolver-types";
import type { ExecutionWorker, ExecutionWorkerResult, ExecutionWorkerState } from "./engine-types";
import { WorkerDispatchError, ExecutionCancellationError } from "./engine-errors";

interface ActiveWorkerEntry {
  worker: ExecutionWorker;
  abortController?: AbortController;
  status: ExecutionWorkerState;
}

export class WorkerDispatcher {
  private readonly _activeWorkers: Map<string, ActiveWorkerEntry> = new Map();
  private _counter = 0;

  /**
   * Dispatches a worker to execute a resolved step descriptor.
   */
  public async dispatchWorker(
    step: ResolvedExecutionStep,
    abortSignal?: AbortSignal,
    customWorker?: ExecutionWorker
  ): Promise<ExecutionWorkerResult> {
    if (!step || !step.descriptor) {
      throw new WorkerDispatchError(step?.stepId ?? "unknown", "Invalid step descriptor provided.");
    }

    this._counter++;
    const workerId = customWorker?.workerId ?? `worker_${step.stepId}_${Date.now()}_${this._counter}`;
    const internalAbortController = new AbortController();

    // Link external abort signal to internal abort controller if provided
    if (abortSignal) {
      if (abortSignal.aborted) {
        internalAbortController.abort(abortSignal.reason ?? new ExecutionCancellationError("AbortSignal already triggered"));
      } else {
        abortSignal.addEventListener(
          "abort",
          () => {
            internalAbortController.abort(abortSignal.reason ?? new ExecutionCancellationError("External AbortSignal triggered"));
          },
          { once: true }
        );
      }
    }

    let currentStatus: ExecutionWorkerState = "ALLOCATED";
    let startedAtMs = 0;
    let completedAtMs = 0;

    const defaultWorker: ExecutionWorker = {
      workerId,
      unitId: step.unitEntry?.metadata?.unitId ?? step.targetTool,
      stepId: step.stepId,
      get status() {
        return currentStatus;
      },
      get startedAtMs() {
        return startedAtMs;
      },
      get completedAtMs() {
        return completedAtMs;
      },
      execute: async (descriptor, signal) => {
        startedAtMs = Date.now();
        currentStatus = "RUNNING";

        if (signal?.aborted) {
          currentStatus = "ABORTED";
          completedAtMs = Date.now();
          throw signal.reason ?? new ExecutionCancellationError(`Worker ${workerId} aborted before start`);
        }

        try {
          let outputData: unknown = { executed: true, stepId: descriptor.stepId };
          
          // Execute adapter if present on unit entry
          if (step.unitEntry && typeof (step.unitEntry as unknown as Record<string, unknown>).execute === "function") {
            outputData = await ((step.unitEntry as unknown as Record<string, unknown>).execute as (d: unknown) => Promise<unknown>)(descriptor);
          }

          if (signal?.aborted) {
            currentStatus = "ABORTED";
            completedAtMs = Date.now();
            throw signal.reason ?? new ExecutionCancellationError(`Worker ${workerId} aborted during execution`);
          }

          completedAtMs = Date.now();
          currentStatus = "COMPLETED";

          return Object.freeze({
            workerId,
            stepId: step.stepId,
            success: true,
            startTimestampMs: startedAtMs,
            endTimestampMs: completedAtMs,
            outputData,
          });
        } catch (err: unknown) {
          completedAtMs = Date.now();
          if (signal?.aborted) {
            currentStatus = "ABORTED";
          } else {
            currentStatus = "FAILED";
          }

          const error = err instanceof Error ? err : new Error(String(err));
          return Object.freeze({
            workerId,
            stepId: step.stepId,
            success: false,
            startTimestampMs: startedAtMs,
            endTimestampMs: completedAtMs,
            error,
          });
        }
      },
    };

    const workerToUse = customWorker ?? defaultWorker;
    const workerEntry: ActiveWorkerEntry = {
      worker: workerToUse,
      abortController: internalAbortController,
      status: "ALLOCATED",
    };

    this._activeWorkers.set(workerId, workerEntry);

    try {
      workerEntry.status = "RUNNING";
      const result = await workerToUse.execute(step.descriptor, internalAbortController.signal);
      workerEntry.status = workerToUse.status;
      return result;
    } catch (err: unknown) {
      if (internalAbortController.signal.aborted) {
        workerEntry.status = "ABORTED";
      } else {
        workerEntry.status = "FAILED";
      }

      const error = err instanceof Error ? err : new Error(String(err));
      throw new WorkerDispatchError(workerId, error.message, { stepId: step.stepId, originalError: error });
    } finally {
      // Retain completed state snapshot but remove from active execution lookup if finished
      if (workerEntry.status === "COMPLETED" || workerEntry.status === "FAILED" || workerEntry.status === "ABORTED" || workerEntry.status === "CANCELLED") {
        // Keep in tracking map for trackWorker but marked inactive if needed
      }
    }
  }

  /**
   * Cancels an active worker by ID.
   */
  public cancelWorker(workerId: string): boolean {
    const entry = this._activeWorkers.get(workerId);
    if (!entry || entry.status === "COMPLETED" || entry.status === "CANCELLED" || entry.status === "ABORTED") {
      return false;
    }

    entry.status = "CANCELLED";
    entry.abortController?.abort(new ExecutionCancellationError(`Worker '${workerId}' was cancelled.`));
    return true;
  }

  /**
   * Aborts an active worker by ID with a reason.
   */
  public abortWorker(workerId: string, reason: string = "Worker aborted"): boolean {
    const entry = this._activeWorkers.get(workerId);
    if (!entry || entry.status === "COMPLETED" || entry.status === "CANCELLED" || entry.status === "ABORTED") {
      return false;
    }

    entry.status = "ABORTED";
    entry.abortController?.abort(new ExecutionCancellationError(reason));
    return true;
  }

  /**
   * Look up worker instance by workerId.
   */
  public trackWorker(workerId: string): ExecutionWorker | undefined {
    return this._activeWorkers.get(workerId)?.worker;
  }

  /**
   * Returns list of currently active workers.
   */
  public getActiveWorkers(): readonly ExecutionWorker[] {
    const active: ExecutionWorker[] = [];
    for (const entry of this._activeWorkers.values()) {
      if (entry.status === "ALLOCATED" || entry.status === "RUNNING") {
        active.push(entry.worker);
      }
    }
    return Object.freeze(active);
  }

  /**
   * Clears active worker tracking.
   */
  public clearAll(): void {
    this._activeWorkers.clear();
  }
}
