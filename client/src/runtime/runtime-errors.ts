/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 1 Component: Exception Hierarchy (`runtime-errors.ts`)
 *
 * @file runtime-errors.ts
 * @description Strongly-typed error definitions for runtime bootstrap, singleton management, and environment validation.
 *
 * @module @aether/runtime/runtime-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 1
 */

import { ProviderAdapterError } from "../types/provider-adapters/errors";

/**
 * Base exception for Phase 9.11 Runtime Integration Layer errors.
 */
export class RuntimeIntegrationError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_RUNTIME_INTEGRATION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when runtime bootstrap pipeline execution fails.
 */
export class RuntimeBootstrapError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_BOOTSTRAP", metadata);
  }
}

/**
 * Thrown when environment validation checks fail.
 */
export class RuntimeEnvironmentError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_ENVIRONMENT", metadata);
  }
}

/**
 * Thrown when subsystem initialization fails.
 */
export class RuntimeInitializationError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_INITIALIZATION", metadata);
  }
}

/**
 * Thrown when singleton lifecycle rules are violated.
 */
export class RuntimeSingletonError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_SINGLETON", metadata);
  }
}

/**
 * Thrown when invalid status transitions or status queries occur.
 */
export class RuntimeStatusError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_STATUS", metadata);
  }
}

/**
 * Thrown when diagnostic report creation or parsing fails.
 */
export class RuntimeDiagnosticsError extends RuntimeIntegrationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_DIAGNOSTICS", metadata);
  }
}
