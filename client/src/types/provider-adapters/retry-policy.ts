/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Retry Policy (`retry-policy.ts`)
 *
 * @file retry-policy.ts
 * @description Configurable, deterministic retry policy engine. Evaluates retry eligibility based
 * on attempt counts and HTTP status codes, computing deterministic retry delays without non-deterministic jitter.
 *
 * @module @aether/provider-adapters/retry-policy
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import type { RetryConfiguration } from "./transport-types";
import { RetryPolicyError } from "./transport-errors";
import { deepFreeze } from "./factories";

/**
 * Result of evaluating a retry attempt decision.
 */
export interface RetryDecision {
  readonly shouldRetry: boolean;
  readonly attemptNumber: number;
  readonly delayMs: number;
  readonly reason: string;
}

/**
 * Default retry configuration if none is provided.
 */
export const DEFAULT_RETRY_CONFIGURATION: Readonly<RetryConfiguration> = deepFreeze({
  maxRetries: 3,
  initialDelayMs: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
});

/**
 * Validates a RetryConfiguration object fail-fast.
 *
 * @param config Retry configuration input.
 * @returns Frozen RetryConfiguration object.
 * @throws RetryPolicyError if invariants are violated.
 */
export function validateRetryConfiguration(
  config: Partial<RetryConfiguration>
): Readonly<RetryConfiguration> {
  const maxRetries = config.maxRetries ?? DEFAULT_RETRY_CONFIGURATION.maxRetries;
  const initialDelayMs = config.initialDelayMs ?? DEFAULT_RETRY_CONFIGURATION.initialDelayMs;
  const retryableStatusCodes =
    config.retryableStatusCodes ?? DEFAULT_RETRY_CONFIGURATION.retryableStatusCodes;

  if (typeof maxRetries !== "number" || maxRetries < 0) {
    throw new RetryPolicyError("Retry configuration maxRetries must be a non-negative number.");
  }

  if (typeof initialDelayMs !== "number" || initialDelayMs < 0) {
    throw new RetryPolicyError("Retry configuration initialDelayMs must be a non-negative number.");
  }

  if (!Array.isArray(retryableStatusCodes)) {
    throw new RetryPolicyError("Retry configuration retryableStatusCodes must be an array of status codes.");
  }

  const normalizedConfig: RetryConfiguration = {
    maxRetries,
    initialDelayMs,
    retryableStatusCodes: [...retryableStatusCodes],
  };

  return deepFreeze(normalizedConfig);
}

/**
 * Evaluates whether a request should be retried after an execution attempt.
 *
 * @param currentAttempt 1-based attempt index that just failed.
 * @param statusCode HTTP status code returned (or null/undefined if network/timeout error occurred).
 * @param config Active retry configuration.
 * @returns Immutable RetryDecision detailing outcome and deterministic delay.
 */
export function evaluateRetryDecision(
  currentAttempt: number,
  statusCode: number | undefined | null,
  config: Partial<RetryConfiguration> = DEFAULT_RETRY_CONFIGURATION
): Readonly<RetryDecision> {
  const validConfig = validateRetryConfiguration(config);

  if (typeof currentAttempt !== "number" || currentAttempt <= 0) {
    throw new RetryPolicyError("Current attempt number must be a positive integer.");
  }

  if (currentAttempt > validConfig.maxRetries) {
    return deepFreeze({
      shouldRetry: false,
      attemptNumber: currentAttempt,
      delayMs: 0,
      reason: `Exceeded maximum retry limit of ${validConfig.maxRetries}`,
    });
  }

  let isRetryable = false;
  let reason = "";

  if (statusCode === undefined || statusCode === null) {
    isRetryable = true;
    reason = "Network or timeout transport failure encountered";
  } else if (validConfig.retryableStatusCodes.includes(statusCode)) {
    isRetryable = true;
    reason = `HTTP status code ${statusCode} is registered as retryable`;
  } else {
    isRetryable = false;
    reason = `HTTP status code ${statusCode} is not retryable`;
  }

  if (!isRetryable) {
    return deepFreeze({
      shouldRetry: false,
      attemptNumber: currentAttempt,
      delayMs: 0,
      reason,
    });
  }

  // Deterministic delay calculation (fixed linear step based on attempt index)
  const delayMs = validConfig.initialDelayMs * currentAttempt;

  return deepFreeze({
    shouldRetry: true,
    attemptNumber: currentAttempt,
    delayMs,
    reason,
  });
}
