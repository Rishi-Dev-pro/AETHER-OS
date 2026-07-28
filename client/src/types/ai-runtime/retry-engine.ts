/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 10: Retry & Backoff Engine (`retry-engine.ts`)
 *
 * @file retry-engine.ts
 * @description Pure-function retry state machine implementing exponential backoff with
 * optional full jitter. Consumes RetryConfig from the frozen config.ts. All functions
 * are side-effect-free — no setTimeout, no I/O. Delay execution is delegated to the orchestrator.
 *
 * @module @aether/ai-runtime/retry-engine
 * @version 1.0.0
 * @status MILESTONE 2 — PROVIDER INFRASTRUCTURE
 */

import type { RetryConfig } from "./config";
import { isRetryableError } from "./errors";
import { deepFreeze } from "./internal/deep-freeze";
import { ConfigurationError } from "./errors";


// ============================================================================
// 1. STATE MODELS
// ============================================================================

/**
 * Immutable execution attempt state tracker.
 * Tracks retry progression through the exponential backoff lifecycle.
 */
export interface RetryState {
  /** Current attempt number (1-indexed, starts at 1 for initial attempt) */
  readonly attemptNumber: number;
  /** Maximum total attempts allowed (1 + retries) */
  readonly maxAttempts: number;
  /** Computed backoff delay for the next retry attempt in milliseconds */
  readonly nextBackoffMs: number;
  /** Total elapsed backoff time accumulated across all retries in milliseconds */
  readonly totalElapsedMs: number;
  /** True when attemptNumber >= maxAttempts (no more retries available) */
  readonly isExhausted: boolean;
  /** Reference to the most recent error that triggered the retry, or undefined */
  readonly lastError?: Error;
}


// ============================================================================
// 2. DECISION & OUTCOME MODELS
// ============================================================================

/**
 * Immutable decision result produced by evaluateRetryDecision().
 * Instructs the orchestrator on whether to retry and how long to wait.
 */
export interface RetryDecision {
  /** True if the request should be retried; false if it should fail permanently */
  readonly shouldRetry: boolean;
  /** Backoff delay in milliseconds before executing the next attempt (0 if shouldRetry is false) */
  readonly delayMs: number;
  /** Human-readable reason for the decision */
  readonly reason: string;
  /** Projected next retry state after this decision is applied */
  readonly nextState: RetryState;
}

/**
 * Immutable summary of a completed retry lifecycle.
 * Produced after all retries are exhausted or a terminal outcome is reached.
 */
export interface RetryOutcome {
  /** Total number of attempts executed (including initial attempt) */
  readonly totalAttempts: number;
  /** True if one of the attempts ultimately succeeded */
  readonly wasSuccessful: boolean;
  /** The final error if all attempts failed, or undefined on success */
  readonly finalError?: Error;
  /** Total accumulated backoff time across all retries in milliseconds */
  readonly totalBackoffMs: number;
}


// ============================================================================
// 3. PURE COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Calculates the exponential backoff delay for a given attempt number.
 * Implements: delay = min(initialBackoffMs * backoffFactor^(attempt-1), maxBackoffMs)
 * With optional full jitter: delay = random(0, calculatedDelay)
 *
 * @param attemptNumber - Current attempt number (1-indexed). Attempt 1 uses initialBackoffMs.
 * @param config - Immutable retry configuration with backoff parameters.
 * @returns Computed delay in milliseconds.
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  if (attemptNumber < 1) {
    return 0;
  }

  // Exponential backoff: initialBackoff * factor^(attempt - 1)
  const exponentialDelay = config.initialBackoffMs * Math.pow(config.backoffFactor, attemptNumber - 1);

  // Cap at maximum backoff
  const cappedDelay = Math.min(exponentialDelay, config.maxBackoffMs);

  // Apply full jitter if enabled: random value in [0, cappedDelay]
  if (config.enableJitter) {
    return Math.floor(Math.random() * (cappedDelay + 1));
  }

  return Math.floor(cappedDelay);
}

/**
 * Creates an immutable initial RetryState from a RetryConfig.
 * Represents the state before any execution attempt.
 *
 * @param config - Immutable retry configuration.
 * @returns Immutable initial retry state with attempt 1 and no backoff accumulated.
 *
 * @throws {ConfigurationError} If config is null or maxAttempts < 1.
 */
export function createInitialRetryState(config: RetryConfig): Readonly<RetryState> {
  if (!config) {
    throw new ConfigurationError({
      subCode: "NullRetryConfig",
      message: "createInitialRetryState requires a non-null RetryConfig.",
    });
  }

  if (config.maxAttempts < 1 || !Number.isInteger(config.maxAttempts)) {
    throw new ConfigurationError({
      subCode: "InvalidMaxAttempts",
      message: `maxAttempts must be a positive integer. Received: ${config.maxAttempts}`,
    });
  }

  const state: RetryState = {
    attemptNumber: 1,
    maxAttempts: config.maxAttempts,
    nextBackoffMs: 0,
    totalElapsedMs: 0,
    isExhausted: config.maxAttempts <= 1,
    lastError: undefined,
  };

  return deepFreeze(state);
}

/**
 * Evaluates whether a retry should be attempted based on the current state,
 * the error encountered, and the retry configuration.
 *
 * Decision logic:
 * 1. If the error is not retryable (per isRetryableError), do not retry.
 * 2. If all attempts are exhausted (isExhausted), do not retry.
 * 3. Otherwise, retry with the computed backoff delay.
 *
 * @param state - Current immutable retry state.
 * @param error - The error that triggered the retry evaluation.
 * @param config - Immutable retry configuration.
 * @returns Immutable RetryDecision with shouldRetry flag, delay, reason, and projected next state.
 */
export function evaluateRetryDecision(
  state: RetryState,
  error: Error,
  config: RetryConfig
): Readonly<RetryDecision> {
  // Check 1: Is the error retryable?
  if (!isRetryableError(error)) {
    const decision: RetryDecision = {
      shouldRetry: false,
      delayMs: 0,
      reason: `Non-retryable error: ${error.constructor.name} (${error.message})`,
      nextState: deepFreeze({
        ...state,
        isExhausted: true,
        lastError: error,
      }),
    };
    return deepFreeze(decision);
  }

  // Check 2: Are attempts exhausted?
  if (state.isExhausted || state.attemptNumber >= state.maxAttempts) {
    const decision: RetryDecision = {
      shouldRetry: false,
      delayMs: 0,
      reason: `Retry attempts exhausted: ${state.attemptNumber}/${state.maxAttempts}`,
      nextState: deepFreeze({
        ...state,
        isExhausted: true,
        lastError: error,
      }),
    };
    return deepFreeze(decision);
  }

  // Compute backoff delay for the NEXT attempt
  const nextAttemptNumber = state.attemptNumber + 1;
  const delayMs = calculateBackoffDelay(state.attemptNumber, config);
  const newTotalElapsed = state.totalElapsedMs + delayMs;

  const nextState: RetryState = {
    attemptNumber: nextAttemptNumber,
    maxAttempts: state.maxAttempts,
    nextBackoffMs: delayMs,
    totalElapsedMs: newTotalElapsed,
    isExhausted: nextAttemptNumber >= state.maxAttempts,
    lastError: error,
  };

  const decision: RetryDecision = {
    shouldRetry: true,
    delayMs,
    reason: `Retrying after transient error (attempt ${nextAttemptNumber}/${state.maxAttempts}, backoff: ${delayMs}ms)`,
    nextState: deepFreeze(nextState),
  };

  return deepFreeze(decision);
}

/**
 * Advances the retry state after a failed attempt.
 * Convenience wrapper combining error recording and state progression.
 *
 * @param state - Current immutable retry state.
 * @param error - The error encountered during the attempt.
 * @param config - Immutable retry configuration.
 * @returns New immutable retry state reflecting the failed attempt.
 */
export function advanceRetryState(
  state: RetryState,
  error: Error,
  config: RetryConfig
): Readonly<RetryState> {
  const decision = evaluateRetryDecision(state, error, config);
  return decision.nextState;
}

/**
 * Factory function creating an immutable RetryOutcome summary.
 *
 * @param state - Final retry state after all attempts.
 * @param wasSuccessful - Whether the final attempt succeeded.
 * @returns Immutable retry outcome summary.
 */
export function createRetryOutcome(
  state: RetryState,
  wasSuccessful: boolean
): Readonly<RetryOutcome> {
  const outcome: RetryOutcome = {
    totalAttempts: state.attemptNumber,
    wasSuccessful,
    finalError: wasSuccessful ? undefined : state.lastError,
    totalBackoffMs: state.totalElapsedMs,
  };

  return deepFreeze(outcome);
}
