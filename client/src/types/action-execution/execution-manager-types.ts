/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Action Execution Manager Contracts (`execution-manager-types.ts`)
 *
 * @file execution-manager-types.ts
 * @description Pure readonly interfaces and runtime contracts for pipeline stages,
 * checkpoints, diagnostics, configuration, and final pipeline results.
 *
 * @module @aether/action-execution/execution-manager-types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 6
 */

import type { ExecutionBoundary } from "./contracts";
import type { ExecutionEnvironment } from "./resolver-types";
import type { ExecutionEngineOptions } from "./engine-types";
import type { ExecutionResultEnvelope } from "./result-types";

/**
 * Enumeration of fixed stages within the Action Execution Pipeline.
 */
export type ExecutionPipelineStage =
  | "VALIDATION"
  | "REGISTRY_LOOKUP"
  | "RESOLUTION"
  | "ENGINE_EXECUTION"
  | "RESULT_AGGREGATION"
  | "CLEANUP"
  | "RESULT_VALIDATION"
  | "COMPLETED";

/**
 * Readonly record of stage progress checkpoint status.
 */
export interface ExecutionPipelineCheckpoint {
  readonly stage: ExecutionPipelineStage;
  readonly success: boolean;
  readonly errorDetails?: string;
}

/**
 * Immutable pipeline diagnostics containing exclusively stage execution tracking.
 */
export interface ExecutionPipelineDiagnostics {
  readonly pipelineId: string;
  readonly executedStages: readonly ExecutionPipelineStage[];
  readonly checkpointStatus: readonly Readonly<ExecutionPipelineCheckpoint>[];
  readonly success: boolean;
  readonly failureStage?: ExecutionPipelineStage;
}

/**
 * Options configuring ActionExecutionManager behavior.
 */
export interface ExecutionPipelineConfiguration {
  readonly boundary?: Readonly<ExecutionBoundary>;
  readonly environment?: Readonly<ExecutionEnvironment>;
  readonly options?: Readonly<ExecutionEngineOptions>;
}

/**
 * Master immutable pipeline result payload returned by ActionExecutionManager.
 */
export interface ExecutionPipelineResult {
  readonly pipelineId: string;
  readonly planId: string;
  readonly resultEnvelope: Readonly<ExecutionResultEnvelope>;
  readonly diagnostics: Readonly<ExecutionPipelineDiagnostics>;
  readonly success: boolean;
}
