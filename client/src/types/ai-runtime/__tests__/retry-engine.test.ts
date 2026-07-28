import { describe, it, expect } from "vitest";
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from "../config";
import { TransientError, ConfigurationError, SafetyError } from "../errors";
import {
  createInitialRetryState,
  calculateBackoffDelay,
  evaluateRetryDecision,
  advanceRetryState,
  createRetryOutcome,
} from "../retry-engine";

describe("Phase 9.4 Component 10: Retry & Backoff Engine (retry-engine.ts)", () => {
  const testConfig: RetryConfig = {
    maxAttempts: 3,
    initialBackoffMs: 100,
    maxBackoffMs: 1000,
    backoffFactor: 2.0,
    enableJitter: false, // Deterministic testing
  };

  describe("Initial State Factory & Invariants", () => {
    it("should create valid initial RetryState for attempt 1", () => {
      const state = createInitialRetryState(testConfig);

      expect(state.attemptNumber).toBe(1);
      expect(state.maxAttempts).toBe(3);
      expect(state.nextBackoffMs).toBe(0);
      expect(state.totalElapsedMs).toBe(0);
      expect(state.isExhausted).toBe(false);
      expect(state.lastError).toBeUndefined();
      expect(Object.isFrozen(state)).toBe(true);
    });

    it("should mark state as exhausted initially if maxAttempts <= 1", () => {
      const singleAttemptConfig: RetryConfig = { ...testConfig, maxAttempts: 1 };
      const state = createInitialRetryState(singleAttemptConfig);

      expect(state.isExhausted).toBe(true);
    });

    it("should throw ConfigurationError if config is null or maxAttempts < 1", () => {
      expect(() => {
        createInitialRetryState(null as unknown as RetryConfig);
      }).toThrow(ConfigurationError);

      expect(() => {
        createInitialRetryState({ ...testConfig, maxAttempts: 0 });
      }).toThrow("maxAttempts must be a positive integer.");
    });
  });

  describe("Backoff Delay Calculation (calculateBackoffDelay)", () => {
    it("should calculate exponential backoff delay correctly without jitter", () => {
      // Attempt 1: 100 * (2^0) = 100ms
      expect(calculateBackoffDelay(1, testConfig)).toBe(100);
      // Attempt 2: 100 * (2^1) = 200ms
      expect(calculateBackoffDelay(2, testConfig)).toBe(200);
      // Attempt 3: 100 * (2^2) = 400ms
      expect(calculateBackoffDelay(3, testConfig)).toBe(400);
    });

    it("should cap backoff delay at maxBackoffMs", () => {
      const smallMaxConfig: RetryConfig = {
        ...testConfig,
        initialBackoffMs: 500,
        maxBackoffMs: 800,
        backoffFactor: 2.0,
      };

      // Attempt 1: 500ms
      expect(calculateBackoffDelay(1, smallMaxConfig)).toBe(500);
      // Attempt 2: min(1000, 800) = 800ms capped
      expect(calculateBackoffDelay(2, smallMaxConfig)).toBe(800);
    });

    it("should calculate jitter delay within bounds when enableJitter is true", () => {
      const jitterConfig: RetryConfig = { ...testConfig, enableJitter: true };
      const delay = calculateBackoffDelay(2, jitterConfig); // Base delay is 200ms

      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(200);
      expect(Number.isInteger(delay)).toBe(true);
    });

    it("should return 0 for attempt numbers < 1", () => {
      expect(calculateBackoffDelay(0, testConfig)).toBe(0);
      expect(calculateBackoffDelay(-1, testConfig)).toBe(0);
    });
  });

  describe("Retry Decision Evaluation (evaluateRetryDecision)", () => {
    const transientErr = new TransientError({
      subCode: "RateLimitExceeded",
      message: "HTTP 429 Too Many Requests",
    });

    const configErr = new ConfigurationError({
      subCode: "InvalidApiKey",
      message: "API key is invalid",
    });

    const safetyErr = new SafetyError({
      subCode: "ContentFilterTriggered",
      message: "Prompt flagged by safety filter",
    });

    it("should return shouldRetry: true for transient error on attempt 1", () => {
      const state = createInitialRetryState(testConfig);
      const decision = evaluateRetryDecision(state, transientErr, testConfig);

      expect(decision.shouldRetry).toBe(true);
      expect(decision.delayMs).toBe(100);
      expect(decision.reason).toContain("Retrying after transient error");
      expect(decision.nextState.attemptNumber).toBe(2);
      expect(decision.nextState.totalElapsedMs).toBe(100);
      expect(decision.nextState.lastError).toBe(transientErr);
      expect(Object.isFrozen(decision)).toBe(true);
    });

    it("should return shouldRetry: false for non-retryable ConfigurationError", () => {
      const state = createInitialRetryState(testConfig);
      const decision = evaluateRetryDecision(state, configErr, testConfig);

      expect(decision.shouldRetry).toBe(false);
      expect(decision.delayMs).toBe(0);
      expect(decision.reason).toContain("Non-retryable error");
      expect(decision.nextState.isExhausted).toBe(true);
    });

    it("should return shouldRetry: false for non-retryable SafetyError", () => {
      const state = createInitialRetryState(testConfig);
      const decision = evaluateRetryDecision(state, safetyErr, testConfig);

      expect(decision.shouldRetry).toBe(false);
      expect(decision.delayMs).toBe(0);
    });

    it("should return shouldRetry: false when retry attempts are exhausted", () => {
      let state = createInitialRetryState(testConfig); // attempt 1
      state = advanceRetryState(state, transientErr, testConfig); // attempt 2
      state = advanceRetryState(state, transientErr, testConfig); // attempt 3

      expect(state.attemptNumber).toBe(3);
      const decision = evaluateRetryDecision(state, transientErr, testConfig);

      expect(decision.shouldRetry).toBe(false);
      expect(decision.reason).toContain("Retry attempts exhausted");
      expect(decision.nextState.isExhausted).toBe(true);
    });
  });

  describe("State Progression & Retry Outcome Summaries", () => {
    const transientErr = new TransientError({
      subCode: "SocketTimeout",
      message: "Socket closed prematurely",
    });

    it("advanceRetryState should correctly increment attemptNumber and totalElapsedMs", () => {
      let state = createInitialRetryState(testConfig);
      expect(state.attemptNumber).toBe(1);

      state = advanceRetryState(state, transientErr, testConfig);
      expect(state.attemptNumber).toBe(2);
      expect(state.totalElapsedMs).toBe(100);

      state = advanceRetryState(state, transientErr, testConfig);
      expect(state.attemptNumber).toBe(3);
      expect(state.totalElapsedMs).toBe(300); // 100 + 200
    });

    it("createRetryOutcome should generate clean outcome summary on success", () => {
      let state = createInitialRetryState(testConfig);
      state = advanceRetryState(state, transientErr, testConfig); // attempt 2

      const outcome = createRetryOutcome(state, true);

      expect(outcome.totalAttempts).toBe(2);
      expect(outcome.wasSuccessful).toBe(true);
      expect(outcome.finalError).toBeUndefined();
      expect(outcome.totalBackoffMs).toBe(100);
      expect(Object.isFrozen(outcome)).toBe(true);
    });

    it("createRetryOutcome should preserve finalError on failure", () => {
      let state = createInitialRetryState(testConfig);
      state = advanceRetryState(state, transientErr, testConfig);

      const outcome = createRetryOutcome(state, false);

      expect(outcome.wasSuccessful).toBe(false);
      expect(outcome.finalError).toBe(transientErr);
    });
  });
});
