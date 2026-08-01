/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Resolver Domain Errors (`resolver-errors.ts`)
 *
 * @file resolver-errors.ts
 * @description Strongly-typed exception classes for Execution Resolver errors,
 * execution unit resolution failures, compatibility mismatches, parameter binding errors,
 * and environment invalidations.
 *
 * @module @aether/action-execution/resolver-errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { ExecutionError } from "./errors";

/**
 * General failure during ExecutionPlan resolution.
 */
export class ExecutionResolutionError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_RESOLUTION", metadata);
  }
}

/**
 * Thrown when no registered ExecutionUnit adapter supports the target tool identifier.
 */
export class ExecutionUnitResolutionError extends ExecutionError {
  constructor(targetTool: string, metadata: Record<string, unknown> = {}) {
    super(
      `Failed to resolve an ExecutionUnit adapter for target tool '${targetTool}'. No matching registered tool found in registry.`,
      "ERR_EXECUTION_UNIT_RESOLUTION",
      { targetTool, ...metadata }
    );
  }
}

/**
 * Thrown when an execution unit's required capabilities or permissions are incompatible with the environment.
 */
export class ExecutionCompatibilityError extends ExecutionError {
  constructor(unitId: string, details: string, metadata: Record<string, unknown> = {}) {
    super(
      `Execution unit '${unitId}' is incompatible with the active environment: ${details}`,
      "ERR_EXECUTION_COMPATIBILITY",
      { unitId, details, ...metadata }
    );
  }
}

/**
 * Thrown when an execution unit adapter violates structural adapter contract requirements.
 */
export class AdapterContractError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_CONTRACT", metadata);
  }
}

/**
 * Thrown when step parameter validation or parameter binding resolution fails.
 */
export class ParameterBindingError extends ExecutionError {
  constructor(stepId: string, details: string, metadata: Record<string, unknown> = {}) {
    super(
      `Parameter binding failed for step '${stepId}': ${details}`,
      "ERR_PARAMETER_BINDING",
      { stepId, details, ...metadata }
    );
  }
}

/**
 * Thrown when runtime environment parameters are missing or invalid for execution resolution.
 */
export class ExecutionEnvironmentError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_ENVIRONMENT", metadata);
  }
}
