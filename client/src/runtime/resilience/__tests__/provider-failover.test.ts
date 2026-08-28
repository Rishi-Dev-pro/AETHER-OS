import { describe, it, expect } from "vitest";
import { ResilienceCoordinator } from "../resilience-coordinator";
import { ProviderFailoverExhaustedError } from "../resilience-errors";

describe("Phase 9.11 Milestone 6: Provider Failover Verification", () => {
  it("automatically fails over from primary (Groq) to fallback (NVIDIA) on provider outage", async () => {
    const coordinator = new ResilienceCoordinator({
      maxRetries: 1,
      initialDelayMs: 10,
      fallbackProviders: ["groq-adapter", "nvidia-adapter", "openai-adapter"],
      enableCircuitBreaker: true,
    });

    const failoverCalls: string[] = [];

    const result = await coordinator.executeWithResilience<string>({
      adapterId: "groq-adapter",
      modelId: "llama-3.3-70b-versatile",
      executeFn: async (currentAdapter) => {
        if (currentAdapter === "groq-adapter") {
          const err: any = new Error("Groq API 500 Internal Server Error");
          err.statusCode = 500;
          throw err;
        }
        return `SUCCESS_FROM_${currentAdapter}`;
      },
      onFailover: (from, to) => {
        failoverCalls.push(`${from}->${to}`);
      },
    });

    expect(result.result).toBe("SUCCESS_FROM_nvidia-adapter");
    expect(result.resolvedProvider).toBe("nvidia-adapter");
    expect(result.didFailover).toBe(true);
    expect(failoverCalls).toEqual(["groq-adapter->nvidia-adapter"]);
    expect(coordinator.getMetrics().totalFailovers).toBe(1);
  });

  it("fails fast on client-side validation errors without triggering provider failover", async () => {
    const coordinator = new ResilienceCoordinator({
      maxRetries: 2,
      initialDelayMs: 10,
      fallbackProviders: ["groq-adapter", "nvidia-adapter"],
    });

    let calls = 0;
    const failoverCalls: string[] = [];

    await expect(
      coordinator.executeWithResilience({
        adapterId: "groq-adapter",
        modelId: "llama-3.3-70b-versatile",
        executeFn: async () => {
          calls++;
          const err: any = new Error("Malformed request syntax");
          err.name = "ConversationValidationError";
          throw err;
        },
        onFailover: (from, to) => failoverCalls.push(`${from}->${to}`),
      })
    ).rejects.toThrow("Malformed request syntax");

    expect(calls).toBe(1);
    expect(failoverCalls).toHaveLength(0);
    expect(coordinator.getMetrics().totalFailovers).toBe(0);
  });

  it("throws ProviderFailoverExhaustedError when all fallback providers are exhausted", async () => {
    const coordinator = new ResilienceCoordinator({
      maxRetries: 1,
      initialDelayMs: 5,
      fallbackProviders: ["groq-adapter", "nvidia-adapter"],
      enableCircuitBreaker: false,
    });

    await expect(
      coordinator.executeWithResilience({
        adapterId: "groq-adapter",
        modelId: "llama-3.3-70b-versatile",
        executeFn: async (currentAdapter) => {
          const err: any = new Error(`${currentAdapter} unavailable 503`);
          err.statusCode = 503;
          throw err;
        },
      })
    ).rejects.toThrow(ProviderFailoverExhaustedError);
  });
});
