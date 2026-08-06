/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Exception Hierarchy (`errors.ts`)
 *
 * @file errors.ts
 * @description Strongly-typed, immutable, serializable exception classes for the Provider Adapter Layer.
 * All errors extend ProviderAdapterError (which extends Phase 9.9 ProviderRuntimeError).
 *
 * @module @aether/provider-adapters/errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import { ProviderRuntimeError } from "../provider-runtime";

/**
 * Single base exception class for all Phase 9.10 Provider Adapter errors.
 * Extends Phase 9.9 ProviderRuntimeError for system-wide exception chain compliance.
 */
export class ProviderAdapterError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_ADAPTER",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an adapter fails structural integrity or contract validation.
 */
export class InvalidAdapterError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_ADAPTER", metadata);
  }
}

/**
 * Thrown when registering an adapter fails or violates registry invariants.
 */
export class AdapterRegistrationError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_REGISTRATION", metadata);
  }
}

/**
 * Thrown when provider adapter configuration or options are invalid.
 */
export class AdapterConfigurationError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_CONFIGURATION", metadata);
  }
}

/**
 * Thrown when authentication or credential validation fails for an adapter.
 */
export class AdapterAuthenticationError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_AUTHENTICATION", metadata);
  }
}

/**
 * Thrown when a capability invariant is violated during adapter execution.
 */
export class AdapterCapabilityError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_CAPABILITY", metadata);
  }
}

/**
 * Thrown when an outgoing request to an adapter fails validation or execution.
 */
export class AdapterRequestError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_REQUEST", metadata);
  }
}

/**
 * Thrown when an incoming adapter response is malformed or invalid.
 */
export class AdapterResponseError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_RESPONSE", metadata);
  }
}

/**
 * Thrown when request payload or response body serialization fails.
 */
export class AdapterSerializationError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_SERIALIZATION", metadata);
  }
}

/**
 * Thrown when adapter execution exceeds designated deadline or timeout limit.
 */
export class AdapterTimeoutError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_TIMEOUT", metadata);
  }
}

/**
 * Thrown when an adapter is offline, faulted, or unreachable.
 */
export class AdapterUnavailableError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_UNAVAILABLE", metadata);
  }
}

/**
 * Thrown when adapter lifecycle initialization sequence fails.
 */
export class AdapterInitializationError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ADAPTER_INITIALIZATION", metadata);
  }
}

/**
 * Thrown when attempting to use a model unsupported by the target adapter.
 */
export class UnsupportedModelError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_UNSUPPORTED_MODEL", metadata);
  }
}

/**
 * Thrown when requesting an unadvertised feature or capability from an adapter.
 */
export class UnsupportedCapabilityError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_UNSUPPORTED_CAPABILITY", metadata);
  }
}

/**
 * Thrown when request parameters break contract constraints.
 */
export class InvalidRequestError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_REQUEST", metadata);
  }
}

/**
 * Thrown when adapter response validation fails structural contract checks.
 */
export class InvalidResponseError extends ProviderAdapterError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_RESPONSE", metadata);
  }
}
