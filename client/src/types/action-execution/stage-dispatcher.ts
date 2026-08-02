/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Stage Dispatcher (`stage-dispatcher.ts`)
 *
 * @file stage-dispatcher.ts
 * @description Deterministic stage scheduling component ensuring sequential stage execution
 * (Stage N cannot execute before Stage N-1 completes) and parallel worker execution inside a stage.
 *
 * @module @aether/action-execution/stage-dispatcher
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import type { ResolvedExecutionPlan } from "./resolver-types";
import { StageDispatchError } from "./engine-errors";

export class StageDispatcher {
  /**
   * Validates that all step dependencies in the plan strictly belong to earlier execution stages.
   */
  public validateStageDependencies(plan: ResolvedExecutionPlan): boolean {
    if (!plan || !plan.resolvedStages || !plan.resolvedSteps) {
      return false;
    }

    // Map each stepId to its stageIndex
    const stepToStageMap = new Map<string, number>();
    for (const stage of plan.resolvedStages) {
      for (const stepId of stage.stepIds) {
        stepToStageMap.set(stepId, stage.stageIndex);
      }
    }

    // Check every step's dependencies
    for (const step of plan.resolvedSteps) {
      const stepStage = stepToStageMap.get(step.stepId);
      if (stepStage === undefined) {
        return false;
      }

      if (step.dependencies) {
        for (const dep of step.dependencies) {
          const prereqStage = stepToStageMap.get(dep.stepId);
          // Dependency must exist and belong to an earlier stage
          if (prereqStage === undefined || prereqStage >= stepStage) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Executes stages sequentially in strict ascending stage order.
   * Stage N cannot execute before Stage N-1 completes.
   */
  public async dispatchStages(
    plan: ResolvedExecutionPlan,
    stageExecutor: (stageIndex: number, stepIds: readonly string[]) => Promise<void>
  ): Promise<void> {
    if (!this.validateStageDependencies(plan)) {
      throw new StageDispatchError(
        -1,
        "Stage dependency validation failed. Step dependencies violate topological stage ordering."
      );
    }

    const sortedStages = [...plan.resolvedStages].sort((a, b) => a.stageIndex - b.stageIndex);

    for (let i = 0; i < sortedStages.length; i++) {
      const stage = sortedStages[i];
      // Enforce sequential stage index requirement
      if (stage.stageIndex !== i) {
        throw new StageDispatchError(
          stage.stageIndex,
          `Non-sequential stage index detected. Expected stage ${i}, received ${stage.stageIndex}.`
        );
      }

      try {
        await stageExecutor(stage.stageIndex, stage.stepIds);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new StageDispatchError(stage.stageIndex, `Stage execution failed: ${msg}`);
      }
    }
  }

  /**
   * Dispatches steps within a single stage in parallel.
   */
  public async dispatchStage(
    stageIndex: number,
    stepIds: readonly string[],
    workerExecutor: (stepId: string) => Promise<void>
  ): Promise<void> {
    if (stepIds.length === 0) {
      return;
    }

    try {
      // Parallel worker execution inside a stage
      await Promise.all(stepIds.map((stepId) => workerExecutor(stepId)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new StageDispatchError(stageIndex, `Intra-stage worker dispatch failed: ${msg}`);
    }
  }
}
