/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Engine Domain Errors (`engine-errors.ts`)
 *
 * @file engine-errors.ts
 * @description Strongly-typed exception classes for Execution Engine runtime failures,
 * timeouts, worker dispatch errors, stage scheduling violations, cancellation, and illegal state transitions.
 *
 * @module @aether/action-execution/engine-errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { ExecutionError, ExecutionStateError } from "./errors";

/**
 * Generic runtime error raised by the Execution Engine.
 */
export class ExecutionEngineError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_ENGINE", metadata);
  }
}

/**
 * Thrown when an execution target (step, stage, or worker) exceeds its allocated execution timeout.
 */
export class ExecutionTimeoutError extends ExecutionError {
  public readonly targetId: string;
  public readonly timeoutMs: number;

  constructor(targetId: string, timeoutMs: number, metadata: Record<string, unknown> = {}) {
    super(
      `Execution target '${targetId}' timed out after ${timeoutMs}ms.`,
      "ERR_EXECUTION_TIMEOUT",
      { targetId, timeoutMs, ...metadata }
    );
    this.targetId = targetId;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Thrown when execution is cancelled via AbortSignal or explicit cancellation.
 */
export class ExecutionCancellationError extends ExecutionError {
  public readonly reason: string;

  constructor(reason: string, metadata: Record<string, unknown> = {}) {
    super(
      `Execution was cancelled: ${reason}`,
      "ERR_EXECUTION_CANCELLED",
      { reason, ...metadata }
    );
    this.reason = reason;
  }
}

/**
 * Thrown when worker allocation, dispatch, or invocation fails.
 */
export class WorkerDispatchError extends ExecutionError {
  public readonly workerId: string;

  constructor(workerId: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Worker dispatch error for '${workerId}': ${message}`,
      "ERR_WORKER_DISPATCH",
      { workerId, ...metadata }
    );
    this.workerId = workerId;
  }
}

/**
 * Thrown when stage scheduling or topological stage dependency enforcement fails.
 */
export class StageDispatchError extends ExecutionError {
  public readonly stageIndex: number;

  constructor(stageIndex: number, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Stage dispatch error for stage ${stageIndex}: ${message}`,
      "ERR_STAGE_DISPATCH",
      { stageIndex, ...metadata }
    );
    this.stageIndex = stageIndex;
  }
}

/**
 * Thrown when an illegal state transition is attempted on the lifecycle state machine.
 */
export class IllegalStateTransitionError extends ExecutionStateError {
  public readonly fromState: string;
  public readonly toState: string;

  constructor(fromState: string, toState: string, metadata: Record<string, unknown> = {}) {
    super(`Illegal lifecycle state transition from '${fromState}' to '${toState}'.`, {
      fromState,
      toState,
      ...metadata,
    });
    this.fromState = fromState;
    this.toState = toState;
  }
}
