/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Retry Policy (`retry-policy.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { evaluateRetryDecision, validateRetryConfiguration, DEFAULT_RETRY_CONFIGURATION } from "../retry-policy";
import { RetryPolicyError } from "../transport-errors";

describe("Phase 9.10 Retry Policy Engine Determinism & Immutability", () => {
  it("should validate and return frozen default configuration", () => {
    const config = validateRetryConfiguration({});
    expect(config.maxRetries).toBe(3);
    expect(config.initialDelayMs).toBe(1000);
    expect(config.retryableStatusCodes).toContain(429);
    expect(config.retryableStatusCodes).toContain(503);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("should evaluate retry decisions deterministically for retryable status codes", () => {
    const decisionAttempt1 = evaluateRetryDecision(1, 429, DEFAULT_RETRY_CONFIGURATION);
    expect(decisionAttempt1.shouldRetry).toBe(true);
    expect(decisionAttempt1.attemptNumber).toBe(1);
    expect(decisionAttempt1.delayMs).toBe(1000); // 1000 * 1
    expect(Object.isFrozen(decisionAttempt1)).toBe(true);

    const decisionAttempt2 = evaluateRetryDecision(2, 500, DEFAULT_RETRY_CONFIGURATION);
    expect(decisionAttempt2.shouldRetry).toBe(true);
    expect(decisionAttempt2.attemptNumber).toBe(2);
    expect(decisionAttempt2.delayMs).toBe(2000); // 1000 * 2
  });

  it("should reject retries for non-retryable status codes", () => {
    const decision = evaluateRetryDecision(1, 401, DEFAULT_RETRY_CONFIGURATION);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.delayMs).toBe(0);
  });

  it("should handle network or timeout failures (undefined status code) as retryable", () => {
    const decision = evaluateRetryDecision(1, undefined, DEFAULT_RETRY_CONFIGURATION);
    expect(decision.shouldRetry).toBe(true);
    expect(decision.delayMs).toBe(1000);
  });

  it("should stop retrying when attempt exceeds maxRetries limit", () => {
    const decision = evaluateRetryDecision(4, 503, DEFAULT_RETRY_CONFIGURATION);
    expect(decision.shouldRetry).toBe(false);
    expect(decision.reason).toContain("Exceeded maximum retry limit");
  });

  it("should throw RetryPolicyError on invalid parameters", () => {
    expect(() => evaluateRetryDecision(0, 500)).toThrow(RetryPolicyError);
    expect(() => validateRetryConfiguration({ maxRetries: -1 })).toThrow(RetryPolicyError);
  });
});
