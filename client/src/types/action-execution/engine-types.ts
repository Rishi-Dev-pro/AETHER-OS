/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Engine Domain Contracts (`engine-types.ts`)
 *
 * @file engine-types.ts
 * @description Pure readonly interfaces and runtime contracts for Execution Engine,
 * workers, lifecycle sessions, worker allocations, timeout descriptors, and cancellation contexts.
 *
 * @module @aether/action-execution/engine-types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import type { ExecutionDescriptor } from "./resolver-types";

/**
 * Valid runtime state machine states for execution engine lifecycle.
 */
export type ExecutionRuntimeState =
  | "CREATED"
  | "VALIDATED"
  | "READY"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "ABORTED"
  | "TIMED_OUT";

/**
 * Status lifecycle state for execution workers.
 */
export type ExecutionWorkerState =
  | "IDLE"
  | "ALLOCATED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ABORTED"
  | "TIMED_OUT";

/**
 * Categorization reasons for execution cancellation or abort.
 */
export type ExecutionAbortReason =
  | "USER_CANCELLED"
  | "TIMEOUT"
  | "DEPENDENCY_FAILURE"
  | "STAGE_FAILURE"
  | "SYSTEM_SHUTDOWN";

/**
 * Readonly execution worker result contract.
 */
export interface ExecutionWorkerResult {
  readonly workerId: string;
  readonly stepId: string;
  readonly success: boolean;
  readonly startTimestampMs: number;
  readonly endTimestampMs: number;
  readonly outputData?: unknown;
  readonly error?: Error;
}

/**
 * Readonly execution worker runtime contract.
 */
export interface ExecutionWorker {
  readonly workerId: string;
  readonly unitId: string;
  readonly stepId: string;
  readonly status: ExecutionWorkerState;
  readonly startedAtMs?: number;
  readonly completedAtMs?: number;
  execute(descriptor: Readonly<ExecutionDescriptor>, abortSignal?: AbortSignal): Promise<ExecutionWorkerResult>;
}

/**
 * Readonly execution session descriptor.
 */
export interface ExecutionSession {
  readonly sessionId: string;
  readonly planId: string;
  readonly state: ExecutionRuntimeState;
  readonly startedAtMs: number;
  readonly endedAtMs?: number;
}

/**
 * Readonly execution runtime state snapshot.
 */
export interface ExecutionRuntime {
  readonly sessionId: string;
  readonly planId: string;
  readonly currentState: ExecutionRuntimeState;
  readonly activeWorkerIds: readonly string[];
  readonly currentStageIndex: number;
  readonly startedAtMs: number;
  readonly endedAtMs?: number;
}

/**
 * Readonly runtime status tracking for an execution stage.
 */
export interface ExecutionStageRuntime {
  readonly stageIndex: number;
  readonly stepIds: readonly string[];
  readonly status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "ABORTED" | "TIMED_OUT";
  readonly startTimestampMs?: number;
  readonly endTimestampMs?: number;
}

/**
 * Options configuring ExecutionEngine behavior.
 */
export interface ExecutionEngineOptions {
  readonly defaultTimeoutMs?: number;
  readonly maxParallelWorkersPerStage?: number;
  readonly enableStrictOrdering?: boolean;
  readonly abortSignal?: AbortSignal;
}

/**
 * Readonly timer registration descriptor for timeout enforcement.
 */
export interface ExecutionTimeout {
  readonly timeoutId: string;
  readonly durationMs: number;
  readonly targetId: string;
  readonly createdAtMs: number;
  readonly isCancelled: boolean;
}

/**
 * Readonly record of worker slot allocation.
 */
export interface WorkerAllocation {
  readonly allocationId: string;
  readonly workerId: string;
  readonly stepId: string;
  readonly allocatedAtMs: number;
}

/**
 * Readonly cancellation context payload.
 */
export interface ExecutionCancellation {
  readonly reason: ExecutionAbortReason;
  readonly cancelledAtMs: number;
  readonly details?: string;
}
