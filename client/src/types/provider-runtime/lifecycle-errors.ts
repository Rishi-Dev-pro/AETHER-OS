/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Component: Lifecycle & Health Exceptions (`lifecycle-errors.ts`)
 *
 * @file lifecycle-errors.ts
 * @description Strongly-typed exception classes for Provider Lifecycle FSM,
 * ProviderHealthManager, and CircuitBreakerEngine failures.
 *
 * @module @aether/provider-runtime/lifecycle-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import { ProviderHealthError, CircuitBreakerError } from "./errors";

export {
  IllegalProviderLifecycleTransitionError,
  IllegalProviderLifecycleTransitionError as IllegalLifecycleTransitionError,
  CircuitBreakerOpenError,
  ProviderLifecycleError,
  ProviderHealthError,
  CircuitBreakerError,
} from "./errors";

/**
 * Thrown when calculation or evaluation of provider health metrics fails.
 */
export class ProviderHealthCalculationError extends ProviderHealthError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HEALTH_CALCULATION", metadata);
  }
}

/**
 * Thrown when an execution dispatch is attempted on an unavailable provider.
 */
export class ProviderUnavailableError extends ProviderHealthError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_UNAVAILABLE", metadata);
  }
}

/**
 * Thrown when an illegal or invalid circuit breaker state transition is requested.
 */
export class CircuitBreakerTransitionError extends CircuitBreakerError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CIRCUIT_BREAKER_TRANSITION", metadata);
  }
}

/**
 * Thrown when building or extracting a health snapshot fails.
 */
export class HealthSnapshotError extends ProviderHealthError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_HEALTH_SNAPSHOT", metadata);
  }
}
