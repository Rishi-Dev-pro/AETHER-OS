/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component 2: Execution Domain Exception Hierarchy (`errors.ts`)
 *
 * @file errors.ts
 * @description Strongly-typed, immutable exception classes for all execution failures,
 * boundary validation rejections, permission denials, and state machine violations.
 *
 * @module @aether/action-execution/errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

/**
 * Base abstract exception class for all Phase 9.8 Action Execution errors.
 */
export class ExecutionError extends Error {
  public readonly code: string;
  public readonly metadata: Readonly<Record<string, unknown>>;
  public readonly timestampMs: number;

  constructor(
    message: string,
    code: string = "ERR_EXECUTION_GENERIC",
    metadata: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestampMs = Date.now();
    this.metadata = Object.freeze({ ...metadata });

    // Restore prototype chain for ES5/ES6 inheritance compliance
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an ExecutionPlan fails structural, expiration, or integrity boundary validation.
 */
export class BoundaryValidationError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_BOUNDARY_VALIDATION", metadata);
  }
}

/**
 * Thrown when requested execution steps exceed granted session permissions or capabilities.
 */
export class PermissionDeniedError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PERMISSION_DENIED", metadata);
  }
}

/**
 * Thrown when an incoming ExecutionPlan has passed its expiration timestamp (`expiresAtMs`).
 */
export class PlanExpiredError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PLAN_EXPIRED", metadata);
  }
}

/**
 * Thrown when step parameters or execution inputs violate target schema contracts.
 */
export class SchemaValidationError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SCHEMA_VALIDATION", metadata);
  }
}

/**
 * Thrown when contract invariants or parameter binding requirements are broken.
 */
export class ExecutionContractError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_CONTRACT", metadata);
  }
}

/**
 * Thrown when an attempt is made to register or unregister execution units while the registry is frozen.
 */
export class RegistryFrozenError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_REGISTRY_FROZEN", metadata);
  }
}

/**
 * Thrown when an illegal lifecycle state transition is requested on the Execution Engine FSM.
 */
export class ExecutionStateError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_STATE", metadata);
  }
}
