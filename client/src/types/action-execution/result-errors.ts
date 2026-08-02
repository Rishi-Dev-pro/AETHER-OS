/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Result Pipeline & Cleanup Domain Errors (`result-errors.ts`)
 *
 * @file result-errors.ts
 * @description Strongly-typed exception classes for Result Aggregator failures,
 * resource cleanup errors, result validation rejections, and generic result envelope errors.
 *
 * @module @aether/action-execution/result-errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { ExecutionError } from "./errors";

/**
 * Generic exception raised for execution result pipeline failures.
 */
export class ExecutionResultError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_RESULT", metadata);
  }
}

/**
 * Thrown when step or stage result aggregation fails or encounters inconsistent inputs.
 */
export class ResultAggregationError extends ExecutionError {
  public readonly planId: string;

  constructor(planId: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Result aggregation error for plan '${planId}': ${message}`,
      "ERR_RESULT_AGGREGATION",
      { planId, ...metadata }
    );
    this.planId = planId;
  }
}

/**
 * Thrown when runtime resource disposal or cleanup operations fail.
 */
export class CleanupError extends ExecutionError {
  public readonly target: string;

  constructor(target: string, message: string, metadata: Record<string, unknown> = {}) {
    super(
      `Cleanup failed for '${target}': ${message}`,
      "ERR_CLEANUP_FAILED",
      { target, ...metadata }
    );
    this.target = target;
  }
}

/**
 * Thrown when an execution result envelope, summary, or report fails structural validation.
 */
export class ResultValidationError extends ExecutionError {
  public readonly target: string;
  public readonly errors: readonly string[];

  constructor(target: string, errors: readonly string[], metadata: Record<string, unknown> = {}) {
    super(
      `Result validation failed for '${target}': ${errors.join("; ")}`,
      "ERR_RESULT_VALIDATION",
      { target, errors, ...metadata }
    );
    this.target = target;
    this.errors = Object.freeze([...errors]);
  }
}
