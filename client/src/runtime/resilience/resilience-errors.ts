/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 6 Component: Resilience Error Taxonomy (`resilience-errors.ts`)
 *
 * @file resilience-errors.ts
 * @description Strongly-typed error domain taxonomy for retry exhaustion, timeout aborts,
 * provider failovers, offline blocks, and circuit breaker trip events.
 *
 * @module @aether/runtime/resilience/resilience-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 6
 */

/**
 * Base error class for all runtime resilience failures.
 */
export class ResilienceError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = "RESILIENCE_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = "ResilienceError";
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when maximum retry attempts have been exhausted.
 */
export class RetryExhaustedError extends ResilienceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "RETRY_EXHAUSTED", details);
    this.name = "RetryExhaustedError";
  }
}

/**
 * Thrown when an AI execution or streaming step exceeds its configured timeout deadline.
 */
export class ExecutionTimeoutError extends ResilienceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "EXECUTION_TIMEOUT", details);
    this.name = "ExecutionTimeoutError";
  }
}

/**
 * Thrown when all configured failover fallback providers have been exhausted without success.
 */
export class ProviderFailoverExhaustedError extends ResilienceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "FAILOVER_EXHAUSTED", details);
    this.name = "ProviderFailoverExhaustedError";
  }
}

/**
 * Thrown when an AI execution is requested while the browser/client is offline.
 */
export class OfflineError extends ResilienceError {
  constructor(message = "Network connection is offline. Request aborted to prevent transport failure.") {
    super(message, "OFFLINE_BLOCKED");
    this.name = "OfflineError";
  }
}

/**
 * Thrown when execution is rejected because the target provider's circuit breaker is in OPEN state.
 */
export class CircuitBreakerOpenError extends ResilienceError {
  constructor(providerId: string, cooldownRemainingMs?: number) {
    super(
      `Circuit breaker for provider '${providerId}' is OPEN (cooldown remaining: ${cooldownRemainingMs ?? 0}ms).`,
      "CIRCUIT_BREAKER_OPEN",
      { providerId, cooldownRemainingMs }
    );
    this.name = "CircuitBreakerOpenError";
  }
}
