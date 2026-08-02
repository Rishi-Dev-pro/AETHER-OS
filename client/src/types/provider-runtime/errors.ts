/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: Exception Hierarchy (`errors.ts`)
 *
 * @file errors.ts
 * @description Strongly-typed, immutable, serializable exception classes for the Provider Runtime Layer.
 * All errors extend ProviderRuntimeError (which extends ExecutionError from Phase 9.8).
 *
 * @module @aether/provider-runtime/errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import { ExecutionError } from "../action-execution";

/**
 * Single base exception class for all Phase 9.9 Provider Runtime errors.
 * Extends Phase 9.8 ExecutionError for framework-wide error hierarchy compliance.
 */
export class ProviderRuntimeError extends ExecutionError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_RUNTIME",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when provider runtime configuration fails structural or secret isolation validation.
 */
export class InvalidProviderConfigurationError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_PROVIDER_CONFIG", metadata);
  }
}

/**
 * Thrown when provider configuration rules or invariant constraints are violated.
 */
export class ProviderConfigurationError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_CONFIGURATION", metadata);
  }
}

/**
 * Thrown when provider metadata fails structural validation or invariant assertions.
 */
export class InvalidProviderMetadataError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_PROVIDER_METADATA", metadata);
  }
}

/**
 * Thrown when provider adapter contract expectations or invariants are broken.
 */
export class ProviderContractError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_CONTRACT", metadata);
  }
}

/**
 * Thrown when provider registration fails structural or catalog validation.
 */
export class ProviderRegistrationError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_REGISTRATION", metadata);
  }
}

/**
 * Thrown when provider registry operations encounter an illegal state or freeze violation.
 */
export class ProviderStateError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_STATE", metadata);
  }
}

/**
 * Thrown when provider capabilities fail validation or required features are missing.
 */
export class ProviderCapabilityError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_CAPABILITY", metadata);
  }
}

/**
 * Thrown when provider startup or initialization fails.
 */
export class ProviderInitializationError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_INITIALIZATION", metadata);
  }
}

/**
 * Thrown when an invalid or unresolvable credential handle reference is accessed.
 */
export class CredentialReferenceError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CREDENTIAL_REFERENCE", metadata);
  }
}

/**
 * Thrown when attempting to register a provider with a duplicate provider ID.
 */
export class DuplicateProviderError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_DUPLICATE_PROVIDER", metadata);
  }
}

/**
 * Thrown when a requested provider is not found in the catalog.
 */
export class ProviderNotFoundError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_NOT_FOUND", metadata);
  }
}

/**
 * Thrown when mutation is attempted on a frozen provider registry.
 */
export class ProviderRegistryFrozenError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_REGISTRY_FROZEN", metadata);
  }
}

/**
 * Base error class for capability negotiation failures.
 */
export class CapabilityNegotiationError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_CAPABILITY_NEGOTIATION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when a provider lacks mandatory capabilities demanded by an execution plan.
 */
export class IncompatibleCapabilityError extends CapabilityNegotiationError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INCOMPATIBLE_CAPABILITY", metadata);
  }
}

/**
 * Base error class for provider lifecycle FSM failures.
 */
export class ProviderLifecycleError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_LIFECYCLE",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when an illegal lifecycle state transition is requested.
 */
export class IllegalProviderLifecycleTransitionError extends ProviderLifecycleError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_ILLEGAL_LIFECYCLE_TRANSITION", metadata);
  }
}

/**
 * Base error class for provider selection failures.
 */
export class ProviderSelectionError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_SELECTION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when zero candidate providers satisfy execution demands.
 */
export class NoEligibleProviderError extends ProviderSelectionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_NO_ELIGIBLE_PROVIDER", metadata);
  }
}

/**
 * Base error class for provider health manager failures.
 */
export class ProviderHealthError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_HEALTH",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when a provider health probe fails or fails validation.
 */
export class ProviderHealthCheckError extends ProviderHealthError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HEALTH_CHECK_FAILED", metadata);
  }
}

/**
 * Base error class for circuit breaker errors.
 */
export class CircuitBreakerError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_CIRCUIT_BREAKER",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when a request is dispatched to a provider whose circuit breaker is in OPEN state.
 */
export class CircuitBreakerOpenError extends CircuitBreakerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CIRCUIT_BREAKER_OPEN", metadata);
  }
}

/**
 * Base error class for provider session manager errors.
 */
export class ProviderSessionError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_PROVIDER_SESSION",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when a requested driver runtime session handle cannot be found.
 */
export class SessionNotFoundError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SESSION_NOT_FOUND", metadata);
  }
}

/**
 * Thrown when an active or idle session times out.
 */
export class SessionTimeoutError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SESSION_TIMEOUT", metadata);
  }
}

/**
 * Thrown when session creation or context allocation fails.
 */
export class SessionAllocationError extends ProviderSessionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_SESSION_ALLOCATION", metadata);
  }
}

/**
 * Base error class for CredentialVault failures.
 */
export class CredentialError extends ProviderRuntimeError {
  constructor(
    message: string,
    code: string = "ERR_CREDENTIAL_ERROR",
    metadata: Record<string, unknown> = {}
  ) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when a credential handle or key reference is missing from CredentialVault.
 */
export class CredentialNotFoundError extends CredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CREDENTIAL_NOT_FOUND", metadata);
  }
}

/**
 * Thrown when unauthorized access to CredentialVault is attempted.
 */
export class CredentialAccessDeniedError extends CredentialError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CREDENTIAL_ACCESS_DENIED", metadata);
  }
}

/**
 * Base error class for ProviderManager facade errors.
 */
export class ProviderManagerError extends ProviderRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_MANAGER", metadata);
  }
}
