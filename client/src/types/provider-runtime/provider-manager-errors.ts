/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 6 Component: ProviderManager Exceptions (`provider-manager-errors.ts`)
 *
 * @file provider-manager-errors.ts
 * @description Strongly-typed exception classes for ProviderManager facade failures,
 * freeze lock violations, snapshot generation errors, and consistency checks.
 *
 * @module @aether/provider-runtime/provider-manager-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { ProviderManagerError } from "./errors";

export { ProviderManagerError } from "./errors";

/**
 * Thrown when attempting to mutate providers, credentials, or sessions on a frozen ProviderRuntime.
 */
export class RuntimeFrozenError extends ProviderManagerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, { errorCode: "ERR_RUNTIME_FROZEN", ...metadata });
  }
}

/**
 * Thrown when boot initialization of the Provider Runtime Layer fails.
 */
export class RuntimeInitializationError extends ProviderManagerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, { errorCode: "ERR_RUNTIME_INITIALIZATION", ...metadata });
  }
}

/**
 * Thrown when generating or validating unified runtime snapshots fails.
 */
export class RuntimeSnapshotError extends ProviderManagerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, { errorCode: "ERR_RUNTIME_SNAPSHOT", ...metadata });
  }
}

/**
 * Thrown when runtime subsystem state inconsistency is detected across components.
 */
export class RuntimeConsistencyError extends ProviderManagerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, { errorCode: "ERR_RUNTIME_CONSISTENCY", ...metadata });
  }
}
