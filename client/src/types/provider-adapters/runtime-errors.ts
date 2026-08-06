/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 6 Component: Runtime Exception Hierarchy (`runtime-errors.ts`)
 *
 * @file runtime-errors.ts
 * @description Strongly-typed exception classes for the UnifiedAdapterRuntime subsystem.
 * All errors extend UnifiedRuntimeError (which extends ProviderAdapterError from Milestone 1).
 *
 * @module @aether/provider-adapters/runtime-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { ProviderAdapterError } from "./errors";

/**
 * Base exception class for all Phase 9.10 unified runtime errors.
 */
export class UnifiedRuntimeError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_UNIFIED_RUNTIME",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when runtime bootstrap or component wiring initialization fails.
 */
export class RuntimeInitializationError extends UnifiedRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_INITIALIZATION", metadata);
  }
}

/**
 * Thrown when runtime validation checks fail.
 */
export class RuntimeValidationError extends UnifiedRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_VALIDATION", metadata);
  }
}

/**
 * Thrown when evaluating provider diagnostics fails.
 */
export class ProviderDiagnosticsError extends UnifiedRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_DIAGNOSTICS", metadata);
  }
}

/**
 * Thrown when shutting down the unified runtime fails.
 */
export class RuntimeShutdownError extends UnifiedRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_SHUTDOWN", metadata);
  }
}
