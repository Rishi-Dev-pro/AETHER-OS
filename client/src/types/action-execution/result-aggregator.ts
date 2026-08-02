/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Deterministic Result Aggregator (`result-aggregator.ts`)
 *
 * @file result-aggregator.ts
 * @description Pure, stateless component that aggregates worker execution results, calculates stage outcomes,
 * constructs execution summaries, and builds immutable ExecutionResultEnvelopes with zero side effects.
 *
 * @module @aether/action-execution/result-aggregator
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { ExecutionStatus } from "./enums";
import type { ExecutionWorkerResult } from "./engine-types";
import type { ResolvedExecutionStep } from "./resolver-types";
import type {
  StepExecutionResult,
  StageExecutionResult,
  ExecutionSummary,
  CleanupReport,
  ResultAggregationReport,
  ExecutionResultEnvelope,
} from "./result-types";
import { ResultAggregationError } from "./result-errors";
import { deepFreeze } from "./factories";

export class ResultAggregator {
  /**
   * Aggregates raw ExecutionWorkerResults into a deterministically ordered list of StepExecutionResults.
   */
  public static aggregateStepResults(
    workerResults: readonly ExecutionWorkerResult[],
    resolvedSteps?: readonly ResolvedExecutionStep[]
  ): readonly Readonly<StepExecutionResult>[] {
    if (!Array.isArray(workerResults)) {
      throw new ResultAggregationError("unknown", "workerResults must be an array.");
    }

    const stepMap = new Map<string, ResolvedExecutionStep>();
    if (resolvedSteps) {
      for (const step of resolvedSteps) {
        stepMap.set(step.stepId, step);
      }
    }

    const aggregated: StepExecutionResult[] = workerResults.map((wr) => {
      const stepDef = stepMap.get(wr.stepId);
      const sequenceIndex = stepDef?.sequenceIndex ?? 0;
      const targetTool = stepDef?.targetTool ?? "unknown";
      const unitId = stepDef?.unitEntry?.metadata?.unitId ?? "unknown";
      const durationMs = Math.max(0, wr.endTimestampMs - wr.startTimestampMs);
      const status = wr.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;

      const stepRes: StepExecutionResult = {
        stepId: wr.stepId,
        sequenceIndex,
        targetTool,
        unitId,
        status,
        success: wr.success,
        startTimestampMs: wr.startTimestampMs,
        endTimestampMs: wr.endTimestampMs,
        durationMs,
        outputData: wr.outputData,
        errorDetails: wr.error
          ? {
              code: (wr.error as unknown as Record<string, unknown>).code as string ?? "ERR_STEP_EXECUTION",
              message: wr.error.message,
              stack: wr.error.stack,
            }
          : undefined,
      };

      return deepFreeze(stepRes);
    });

    // Deterministic sorting by sequenceIndex ascending, then stepId
    aggregated.sort((a, b) => {
      if (a.sequenceIndex !== b.sequenceIndex) {
        return a.sequenceIndex - b.sequenceIndex;
      }
      return a.stepId.localeCompare(b.stepId);
    });

    return deepFreeze(aggregated);
  }

  /**
   * Aggregates step results into stage execution result summaries based on resolved stage topologies.
   */
  public static aggregateStageResults(
    resolvedStages: readonly Readonly<{ readonly stageIndex: number; readonly stepIds: readonly string[] }>[],
    stepResults: readonly Readonly<StepExecutionResult>[]
  ): readonly Readonly<StageExecutionResult>[] {
    if (!Array.isArray(resolvedStages) || !Array.isArray(stepResults)) {
      throw new ResultAggregationError("unknown", "resolvedStages and stepResults must be valid arrays.");
    }

    const stepResultMap = new Map<string, Readonly<StepExecutionResult>>();
    for (const sr of stepResults) {
      stepResultMap.set(sr.stepId, sr);
    }

    const stageResults: StageExecutionResult[] = [];

    const sortedStages = [...resolvedStages].sort((a, b) => a.stageIndex - b.stageIndex);

    for (const stage of sortedStages) {
      const stageStepResults: Readonly<StepExecutionResult>[] = [];
      let stageSuccess = true;
      let minStartMs = Number.MAX_SAFE_INTEGER;
      let maxEndMs = 0;

      for (const stepId of stage.stepIds) {
        const sr = stepResultMap.get(stepId);
        if (sr) {
          stageStepResults.push(sr);
          if (!sr.success) {
            stageSuccess = false;
          }
          if (sr.startTimestampMs < minStartMs) {
            minStartMs = sr.startTimestampMs;
          }
          if (sr.endTimestampMs > maxEndMs) {
            maxEndMs = sr.endTimestampMs;
          }
        } else {
          stageSuccess = false;
        }
      }

      const startTimestampMs = minStartMs === Number.MAX_SAFE_INTEGER ? Date.now() : minStartMs;
      const endTimestampMs = maxEndMs === 0 ? startTimestampMs : maxEndMs;
      const totalDurationMs = Math.max(0, endTimestampMs - startTimestampMs);

      const stageRes: StageExecutionResult = {
        stageIndex: stage.stageIndex,
        stepIds: deepFreeze([...stage.stepIds]),
        stepResults: deepFreeze(stageStepResults),
        success: stageSuccess,
        startTimestampMs,
        endTimestampMs,
        totalDurationMs,
      };

      stageResults.push(deepFreeze(stageRes));
    }

    return deepFreeze(stageResults);
  }

  /**
   * Constructs an ExecutionSummary metric report from aggregated stage and step outcomes.
   */
  public static buildExecutionSummary(
    planId: string,
    overallStatus: ExecutionStatus,
    stageResults: readonly Readonly<StageExecutionResult>[],
    stepResults: readonly Readonly<StepExecutionResult>[]
  ): Readonly<ExecutionSummary> {
    if (!planId) {
      throw new ResultAggregationError("unknown", "planId is required to build execution summary.");
    }

    const totalSteps = stepResults.length;
    const completedSteps = stepResults.filter((s) => s.success).length;
    const failedSteps = totalSteps - completedSteps;
    const totalStages = stageResults.length;

    let minStartMs = Number.MAX_SAFE_INTEGER;
    let maxEndMs = 0;

    for (const sr of stepResults) {
      if (sr.startTimestampMs < minStartMs) {
        minStartMs = sr.startTimestampMs;
      }
      if (sr.endTimestampMs > maxEndMs) {
        maxEndMs = sr.endTimestampMs;
      }
    }

    const now = Date.now();
    const startTimestampMs = minStartMs === Number.MAX_SAFE_INTEGER ? now : minStartMs;
    const endTimestampMs = maxEndMs === 0 ? startTimestampMs : maxEndMs;
    const totalDurationMs = Math.max(0, endTimestampMs - startTimestampMs);

    const overallSuccess =
      overallStatus === ExecutionStatus.COMPLETED && failedSteps === 0;

    const summary: ExecutionSummary = {
      planId,
      totalSteps,
      completedSteps,
      failedSteps,
      totalStages,
      status: overallStatus,
      success: overallSuccess,
      startTimestampMs,
      endTimestampMs,
      totalDurationMs,
    };

    return deepFreeze(summary);
  }

  /**
   * Bundles all aggregated execution outputs into a master immutable ExecutionResultEnvelope.
   */
  public static createExecutionEnvelope(
    planId: string,
    summary: Readonly<ExecutionSummary>,
    stageResults: readonly Readonly<StageExecutionResult>[],
    stepResults: readonly Readonly<StepExecutionResult>[],
    cleanupReport: Readonly<CleanupReport>
  ): Readonly<ExecutionResultEnvelope> {
    if (!planId || !summary || !cleanupReport) {
      throw new ResultAggregationError(planId ?? "unknown", "Incomplete parameters for ExecutionResultEnvelope creation.");
    }

    const nowMs = Date.now();
    const aggregationReport: ResultAggregationReport = {
      aggregationId: `agg_${planId}_${nowMs}`,
      planId,
      aggregatedAtMs: nowMs,
      totalStepResultsCount: stepResults.length,
      totalStageResultsCount: stageResults.length,
      isComplete: true,
    };

    const envelope: ExecutionResultEnvelope = {
      envelopeId: `env_${planId}_${nowMs}`,
      planId,
      summary: deepFreeze(summary),
      stageResults: deepFreeze([...stageResults]),
      stepResults: deepFreeze([...stepResults]),
      cleanupReport: deepFreeze(cleanupReport),
      aggregationReport: deepFreeze(aggregationReport),
      createdTimestampMs: nowMs,
    };

    return deepFreeze(envelope);
  }
}
