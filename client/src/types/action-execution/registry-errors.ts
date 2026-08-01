/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Registry Domain Errors (`registry-errors.ts`)
 *
 * @file registry-errors.ts
 * @description Strongly-typed exception classes for Execution Registry mutations,
 * duplicate registrations, missing unit lookups, and freeze invariant violations.
 *
 * @module @aether/action-execution/registry-errors
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import { ExecutionError } from "./errors";

/**
 * Thrown when an execution unit registration fails due to duplicate unit identifiers.
 */
export class DuplicateExecutionUnitError extends ExecutionError {
  constructor(unitId: string, metadata: Record<string, unknown> = {}) {
    super(
      `Execution unit with identifier '${unitId}' is already registered in the registry.`,
      "ERR_DUPLICATE_EXECUTION_UNIT",
      { unitId, ...metadata }
    );
  }
}

/**
 * Thrown when an execution unit lookup fails to find a registered unit adapter.
 */
export class ExecutionUnitNotFoundError extends ExecutionError {
  constructor(unitId: string, metadata: Record<string, unknown> = {}) {
    super(
      `Execution unit with identifier '${unitId}' was not found in the registry.`,
      "ERR_EXECUTION_UNIT_NOT_FOUND",
      { unitId, ...metadata }
    );
  }
}

/**
 * Thrown when an attempt is made to mutate the registry after freezeRegistry() has been invoked.
 */
export class RegistryAlreadyFrozenError extends ExecutionError {
  constructor(action: string = "mutate", metadata: Record<string, unknown> = {}) {
    super(
      `Cannot ${action} Execution Registry. The registry is logically frozen for the duration of execution.`,
      "ERR_REGISTRY_FROZEN",
      { action, ...metadata }
    );
  }
}

/**
 * Thrown when an execution unit registration violates metadata validation or version constraints.
 */
export class RegistryRegistrationError extends ExecutionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_REGISTRY_REGISTRATION", metadata);
  }
}
