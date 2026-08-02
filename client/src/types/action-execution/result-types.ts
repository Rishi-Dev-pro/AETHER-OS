/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Result Pipeline & Cleanup Contracts (`result-types.ts`)
 *
 * @file result-types.ts
 * @description Pure readonly interfaces and runtime contracts for step execution results,
 * stage execution results, execution summaries, cleanup reports, aggregation reports,
 * and final execution result envelopes.
 *
 * @module @aether/action-execution/result-types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import type { ExecutionStatus } from "./enums";

/**
 * Immutable outcome contract for an individual plan step.
 */
export interface StepExecutionResult {
  readonly stepId: string;
  readonly sequenceIndex: number;
  readonly targetTool: string;
  readonly unitId: string;
  readonly status: ExecutionStatus;
  readonly success: boolean;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  readonly durationMs: number;
  readonly outputData?: unknown;
  readonly errorDetails?: {
    readonly code: string;
    readonly message: string;
    readonly stack?: string;
  };
}

/**
 * Immutable aggregated result for an execution stage.
 */
export interface StageExecutionResult {
  readonly stageIndex: number;
  readonly stepIds: readonly string[];
  readonly stepResults: readonly Readonly<StepExecutionResult>[];
  readonly success: boolean;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  readonly totalDurationMs: number;
}

/**
 * Immutable summary metric report for plan execution.
 */
export interface ExecutionSummary {
  readonly planId: string;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly failedSteps: number;
  readonly totalStages: number;
  readonly status: ExecutionStatus;
  readonly success: boolean;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  readonly totalDurationMs: number;
}

/**
 * Immutable resource disposal audit record.
 */
export interface CleanupReport {
  readonly cleanupId: string;
  readonly planId: string;
  readonly timestampMs: number;
  readonly workersCleanedCount: number;
  readonly timeoutsCleanedCount: number;
  readonly resourcesDisposedCount: number;
  readonly success: boolean;
  readonly details: readonly string[];
}

/**
 * Immutable summary of result aggregation operations.
 */
export interface ResultAggregationReport {
  readonly aggregationId: string;
  readonly planId: string;
  readonly aggregatedAtMs: number;
  readonly totalStepResultsCount: number;
  readonly totalStageResultsCount: number;
  readonly isComplete: boolean;
}

/**
 * Master immutable result envelope emitted by Phase 9.8 Milestone 5.
 */
export interface ExecutionResultEnvelope {
  readonly envelopeId: string;
  readonly planId: string;
  readonly summary: Readonly<ExecutionSummary>;
  readonly stageResults: readonly Readonly<StageExecutionResult>[];
  readonly stepResults: readonly Readonly<StepExecutionResult>[];
  readonly cleanupReport: Readonly<CleanupReport>;
  readonly aggregationReport: Readonly<ResultAggregationReport>;
  readonly createdTimestampMs: number;
}
