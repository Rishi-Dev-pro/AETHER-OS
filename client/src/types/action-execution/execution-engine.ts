/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Engine Runtime (`execution-engine.ts`)
 *
 * @file execution-engine.ts
 * @description Core deterministic runtime coordinator executing already-resolved execution descriptors.
 * Manages lifecycle control, finite state machine transitions, stage dispatching, worker dispatching,
 * timeout enforcement, and cancellation. Performs no result aggregation or telemetry.
 *
 * @module @aether/action-execution/execution-engine
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import type { ResolvedExecutionPlan, ResolvedExecutionStep, ExecutionDescriptor } from "./resolver-types";
import type {
  ExecutionRuntimeState,
  ExecutionEngineOptions,
  ExecutionWorkerResult,
  ExecutionWorker,
} from "./engine-types";
import { LifecycleController } from "./lifecycle-controller";
import { StageDispatcher } from "./stage-dispatcher";
import { WorkerDispatcher } from "./worker-dispatcher";
import { TimeoutManager } from "./timeout-manager";
import {
  ExecutionTimeoutError,
  ExecutionCancellationError,
  ExecutionEngineError,
  WorkerDispatchError,
} from "./engine-errors";

export class ExecutionEngine {
  private readonly _lifecycle: LifecycleController;
  private readonly _stageDispatcher: StageDispatcher;
  private readonly _workerDispatcher: WorkerDispatcher;
  private readonly _timeoutManager: TimeoutManager;

  constructor() {
    this._lifecycle = new LifecycleController("CREATED");
    this._stageDispatcher = new StageDispatcher();
    this._workerDispatcher = new WorkerDispatcher();
    this._timeoutManager = new TimeoutManager();
  }

  /**
   * Returns current engine FSM state.
   */
  public currentState(): ExecutionRuntimeState {
    return this._lifecycle.currentState();
  }

  /**
   * Returns the internal LifecycleController instance.
   */
  public getLifecycleController(): LifecycleController {
    return this._lifecycle;
  }

  /**
   * Returns the internal StageDispatcher instance.
   */
  public getStageDispatcher(): StageDispatcher {
    return this._stageDispatcher;
  }

  /**
   * Returns the internal WorkerDispatcher instance.
   */
  public getWorkerDispatcher(): WorkerDispatcher {
    return this._workerDispatcher;
  }

  /**
   * Returns the internal TimeoutManager instance.
   */
  public getTimeoutManager(): TimeoutManager {
    return this._timeoutManager;
  }

  /**
   * Executes a resolved execution plan deterministically through all stages and workers.
   */
  public async executeExecutionPlan(
    plan: ResolvedExecutionPlan,
    options: ExecutionEngineOptions = {}
  ): Promise<ExecutionRuntimeState> {
    this._lifecycle.initialize("CREATED");

    if (!plan || !plan.planId || !plan.resolvedStages || !plan.resolvedSteps) {
      this._lifecycle.transition("FAILED");
      throw new ExecutionEngineError("Invalid or incomplete ResolvedExecutionPlan provided.");
    }

    this._lifecycle.transition("VALIDATED");
    this._lifecycle.transition("READY");
    this._lifecycle.transition("RUNNING");

    // Check for immediate abort signal
    if (options.abortSignal?.aborted) {
      this._lifecycle.transition("ABORTED");
      throw new ExecutionCancellationError(
        options.abortSignal.reason?.toString() ?? "Execution aborted prior to stage dispatch."
      );
    }

    let globalTimeoutId: string | undefined;
    let globalAbortController: AbortController | undefined;

    if (options.defaultTimeoutMs && options.defaultTimeoutMs > 0) {
      const created = this._timeoutManager.createTimeout(
        `plan_${plan.planId}`,
        options.defaultTimeoutMs,
        () => {
          if (this._lifecycle.currentState() === "RUNNING" || this._lifecycle.currentState() === "WAITING") {
            this._lifecycle.transition("TIMED_OUT");
          }
        }
      );
      globalTimeoutId = created.timeoutId;
      globalAbortController = created.abortController;
    }

    try {
      await this._stageDispatcher.dispatchStages(plan, (stageIndex, stepIds) =>
        this.executeExecutionStage(stageIndex, stepIds, plan, options, globalAbortController?.signal)
      );

      if (globalTimeoutId) {
        this._timeoutManager.cancelTimeout(globalTimeoutId);
      }

      this._lifecycle.transition("COMPLETED");
      return "COMPLETED";
    } catch (err: unknown) {
      if (globalTimeoutId) {
        this._timeoutManager.cancelTimeout(globalTimeoutId);
      }

      if (this._lifecycle.currentState() !== "COMPLETED") {
        if (
          err instanceof ExecutionTimeoutError ||
          (globalAbortController && globalAbortController.signal.aborted)
        ) {
          if (this._lifecycle.currentState() !== "TIMED_OUT") {
            this._lifecycle.transition("TIMED_OUT");
          }
        } else if (
          err instanceof ExecutionCancellationError ||
          (options.abortSignal && options.abortSignal.aborted)
        ) {
          if (this._lifecycle.currentState() !== "ABORTED") {
            this._lifecycle.transition("ABORTED");
          }
        } else {
          if (this._lifecycle.currentState() !== "FAILED") {
            this._lifecycle.transition("FAILED");
          }
        }
      }

      throw err;
    } finally {
      this._timeoutManager.clearAll();
    }
  }

  /**
   * Executes a single execution stage containing stepIds.
   */
  public async executeExecutionStage(
    stageIndex: number,
    stepIds: readonly string[],
    plan: ResolvedExecutionPlan,
    options: ExecutionEngineOptions = {},
    parentAbortSignal?: AbortSignal
  ): Promise<void> {
    const stepMap = new Map<string, ResolvedExecutionStep>();
    for (const step of plan.resolvedSteps) {
      stepMap.set(step.stepId, step);
    }

    await this._stageDispatcher.dispatchStage(stageIndex, stepIds, async (stepId) => {
      const step = stepMap.get(stepId);
      if (!step) {
        throw new WorkerDispatchError(stepId, `Step '${stepId}' not found in resolved steps map.`);
      }
      await this.executeExecutionStep(step, options, parentAbortSignal);
    });
  }

  /**
   * Executes a single resolved execution step via WorkerDispatcher.
   */
  public async executeExecutionStep(
    step: ResolvedExecutionStep,
    options: ExecutionEngineOptions = {},
    parentAbortSignal?: AbortSignal
  ): Promise<ExecutionWorkerResult> {
    const timeoutDurationMs = step.descriptor.timeoutMs > 0 ? step.descriptor.timeoutMs : (options.defaultTimeoutMs ?? 0);

    let timeoutId: string | undefined;
    let stepAbortController: AbortController | undefined;

    if (timeoutDurationMs > 0) {
      const created = this._timeoutManager.createTimeout(`step_${step.stepId}`, timeoutDurationMs);
      timeoutId = created.timeoutId;
      stepAbortController = created.abortController;
    }

    // Combine parent abort signal and step timeout abort signal
    const combinedAbortController = new AbortController();

    const forwardAbort = (signal?: AbortSignal) => {
      if (signal?.aborted && !combinedAbortController.signal.aborted) {
        combinedAbortController.abort(signal.reason ?? new ExecutionCancellationError("Execution step aborted"));
      }
    };

    if (options.abortSignal) {
      forwardAbort(options.abortSignal);
      options.abortSignal.addEventListener("abort", () => forwardAbort(options.abortSignal), { once: true });
    }
    if (parentAbortSignal) {
      forwardAbort(parentAbortSignal);
      parentAbortSignal.addEventListener("abort", () => forwardAbort(parentAbortSignal), { once: true });
    }
    if (stepAbortController) {
      forwardAbort(stepAbortController.signal);
      stepAbortController.signal.addEventListener("abort", () => forwardAbort(stepAbortController?.signal), { once: true });
    }

    try {
      const result = await this._workerDispatcher.dispatchWorker(step, combinedAbortController.signal);
      if (timeoutId) {
        this._timeoutManager.cancelTimeout(timeoutId);
      }

      if (!result.success) {
        throw result.error ?? new WorkerDispatchError(step.stepId, `Step execution failed for step ${step.stepId}`);
      }

      return result;
    } catch (err: unknown) {
      if (timeoutId) {
        this._timeoutManager.cancelTimeout(timeoutId);
      }
      throw err;
    }
  }

  /**
   * Invokes an ExecutionWorker directly with a given descriptor.
   */
  public async executeWorker(
    worker: ExecutionWorker,
    descriptor: ExecutionDescriptor,
    abortSignal?: AbortSignal
  ): Promise<ExecutionWorkerResult> {
    if (!worker || typeof worker.execute !== "function") {
      throw new WorkerDispatchError("unknown", "Invalid ExecutionWorker instance provided.");
    }
    return worker.execute(descriptor, abortSignal);
  }
}
