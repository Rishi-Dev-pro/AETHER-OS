/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 3 Component: Authentication Exception Hierarchy (`authentication-errors.ts`)
 *
 * @file authentication-errors.ts
 * @description Strongly-typed exception classes for provider authentication, endpoint resolution,
 * and request pipeline assembly. All errors extend AuthenticationError (which extends ProviderAdapterError).
 *
 * @module @aether/provider-adapters/authentication-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { ProviderAdapterError } from "./errors";

/**
 * Base exception class for all Phase 9.10 authentication and request pipeline errors.
 */
export class AuthenticationError extends ProviderAdapterError {
  constructor(
    message: string,
    code: string = "ERR_AUTHENTICATION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when authentication configuration options break invariants.
 */
export class InvalidAuthConfigError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_AUTH_CONFIG", metadata);
  }
}

/**
 * Thrown when resolving raw secret payload from CredentialVault fails.
 */
export class CredentialResolutionError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CREDENTIAL_RESOLUTION", metadata);
  }
}

/**
 * Thrown when attempting to use an expired CredentialReference handle.
 */
export class ExpiredCredentialError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXPIRED_CREDENTIAL", metadata);
  }
}

/**
 * Thrown when injecting authentication headers into a request payload fails.
 */
export class HeaderInjectionError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HEADER_INJECTION", metadata);
  }
}

/**
 * Thrown when resolving provider endpoint paths or URLs fails.
 */
export class EndpointResolutionError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ENDPOINT_RESOLUTION", metadata);
  }
}

/**
 * Thrown when request pipeline assembly or execution fails.
 */
export class PipelineExecutionError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PIPELINE_EXECUTION", metadata);
  }
}

/**
 * Thrown when provider adapter configuration fails validation or secret isolation checks.
 */
export class InvalidProviderConfigError extends AuthenticationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_PROVIDER_CONFIG", metadata);
  }
}
