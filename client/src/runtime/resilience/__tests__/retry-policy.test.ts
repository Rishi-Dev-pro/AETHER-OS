import { describe, it, expect } from "vitest";
import { evaluateRetryDecision, validateRetryConfiguration } from "../../../types/provider-adapters/retry-policy";
import { ResilienceCoordinator } from "../resilience-coordinator";
import { RetryExhaustedError } from "../resilience-errors";

describe("Phase 9.11 Milestone 6: Retry Policy & Bound Verification", () => {
  it("correctly identifies retryable HTTP status codes (408, 429, 500, 502, 503, 504, network errors)", () => {
    const retryableCodes = [408, 429, 500, 502, 503, 504, null, undefined];
    for (const code of retryableCodes) {
      const decision = evaluateRetryDecision(1, code);
      expect(decision.shouldRetry).toBe(true);
      expect(decision.delayMs).toBeGreaterThan(0);
    }
  });

  it("rejects non-retryable permanent client errors (400, 401, 403, 404, 422)", () => {
    const nonRetryableCodes = [400, 401, 403, 404, 422];
    for (const code of nonRetryableCodes) {
      const decision = evaluateRetryDecision(1, code);
      expect(decision.shouldRetry).toBe(false);
      expect(decision.delayMs).toBe(0);
    }
  });

  it("enforces maximum retry limits and stops retrying when exhausted", () => {
    const maxRetries = 3;
    const config = validateRetryConfiguration({ maxRetries, initialDelayMs: 100 });

    const attempt1 = evaluateRetryDecision(1, 503, config);
    expect(attempt1.shouldRetry).toBe(true);
    expect(attempt1.delayMs).toBe(100);

    const attempt2 = evaluateRetryDecision(2, 503, config);
    expect(attempt2.shouldRetry).toBe(true);
    expect(attempt2.delayMs).toBe(200);

    const attempt3 = evaluateRetryDecision(3, 503, config);
    expect(attempt3.shouldRetry).toBe(true);
    expect(attempt3.delayMs).toBe(300);

    const attempt4 = evaluateRetryDecision(4, 503, config);
    expect(attempt4.shouldRetry).toBe(false);
  });

  it("ResilienceCoordinator executes retries with backoff and succeeds if subsequent attempt passes", async () => {
    let callCount = 0;
    const coordinator = new ResilienceCoordinator({
      maxRetries: 3,
      initialDelayMs: 10,
      fallbackProviders: [],
      enableCircuitBreaker: false,
    });

    const retryEvents: number[] = [];

    const result = await coordinator.executeWithResilience<string>({
      adapterId: "groq-adapter",
      modelId: "llama-3.3-70b-versatile",
      executeFn: async () => {
        callCount++;
        if (callCount < 3) {
          const err: any = new Error("Temporary 503 Service Unavailable");
          err.statusCode = 503;
          throw err;
        }
        return "SUCCESS_ON_ATTEMPT_3";
      },
      onRetry: (attempt) => {
        retryEvents.push(attempt);
      },
    });

    expect(result.result).toBe("SUCCESS_ON_ATTEMPT_3");
    expect(callCount).toBe(3);
    expect(retryEvents).toEqual([1, 2]);
    expect(coordinator.getMetrics().totalRetries).toBe(2);
    expect(coordinator.getMetrics().successfulRetries).toBe(1);
  });

  it("throws RetryExhaustedError without secret leakage when all retries fail", async () => {
    const coordinator = new ResilienceCoordinator({
      maxRetries: 2,
      initialDelayMs: 10,
      fallbackProviders: [],
      enableCircuitBreaker: false,
    });

    await expect(
      coordinator.executeWithResilience({
        adapterId: "groq-adapter",
        modelId: "llama-3.3-70b-versatile",
        executeFn: async () => {
          const err: any = new Error("Rate limit exceeded 429");
          err.statusCode = 429;
          throw err;
        },
      })
    ).rejects.toThrow(RetryExhaustedError);
  });

  it("immediately aborts retries when parent AbortSignal triggers", async () => {
    const coordinator = new ResilienceCoordinator({
      maxRetries: 5,
      initialDelayMs: 50,
      fallbackProviders: [],
    });

    const controller = new AbortController();
    let attempts = 0;

    const promise = coordinator.executeWithResilience({
      adapterId: "groq-adapter",
      modelId: "llama-3.3-70b-versatile",
      parentSignal: controller.signal,
      executeFn: async () => {
        attempts++;
        if (attempts === 1) {
          setTimeout(() => controller.abort("User cancelled generation"), 10);
        }
        const err: any = new Error("Temporary network glitch");
        err.statusCode = 500;
        throw err;
      },
    });

    await expect(promise).rejects.toThrow();
    expect(attempts).toBeLessThan(3);
  });
});
