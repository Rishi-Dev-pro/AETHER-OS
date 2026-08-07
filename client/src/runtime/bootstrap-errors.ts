/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 7 Component: Bootstrap Exception Hierarchy (`bootstrap-errors.ts`)
 *
 * @file bootstrap-errors.ts
 * @description Strongly-typed error definitions for production bootstrap and secure credential loading.
 *
 * @module @aether/runtime/bootstrap-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 7
 */

import { ProviderAdapterError } from "../types/provider-adapters/errors";

/**
 * Base exception for production credential bootstrap failures.
 */
export class BootstrapCredentialError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_BOOTSTRAP_CREDENTIAL",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when environment variable validation fails.
 */
export class EnvironmentValidationError extends BootstrapCredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ENVIRONMENT_VALIDATION", metadata);
  }
}

/**
 * Thrown when attempting duplicate credential registration during bootstrap.
 */
export class DuplicateCredentialBootstrapError extends BootstrapCredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_DUPLICATE_CREDENTIAL_BOOTSTRAP", metadata);
  }
}
