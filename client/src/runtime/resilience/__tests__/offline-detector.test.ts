import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { OfflineDetector } from "../offline-detector";
import { ResilienceCoordinator } from "../resilience-coordinator";
import { OfflineError } from "../resilience-errors";

describe("Phase 9.11 Milestone 6: Offline Detection & Fast-Fail Verification", () => {
  let detector: OfflineDetector;

  beforeEach(() => {
    detector = OfflineDetector.getInstance();
    detector.setMockOnlineState(null);
  });

  afterEach(() => {
    detector.setMockOnlineState(null);
  });

  it("notifies registered subscribers upon network connectivity changes", () => {
    const transitions: boolean[] = [];
    const unsubscribe = detector.subscribe((online) => {
      transitions.push(online);
    });

    detector.setMockOnlineState(false);
    detector.setMockOnlineState(true);

    expect(transitions).toEqual([false, true]);
    unsubscribe();
  });

  it("ResilienceCoordinator aborts immediately with OfflineError when offline without making provider calls", async () => {
    detector.setMockOnlineState(false);
    const coordinator = new ResilienceCoordinator({}, undefined, detector);

    let providerCalled = false;

    await expect(
      coordinator.executeWithResilience({
        adapterId: "groq-adapter",
        modelId: "llama-3.3-70b-versatile",
        executeFn: async () => {
          providerCalled = true;
          return "SHOULD_NOT_EXECUTE";
        },
      })
    ).rejects.toThrow(OfflineError);

    expect(providerCalled).toBe(false);
    expect(coordinator.getMetrics().offlineRejections).toBe(1);
  });

  it("allows execution to proceed normally when connectivity is restored online", async () => {
    detector.setMockOnlineState(true);
    const coordinator = new ResilienceCoordinator({}, undefined, detector);

    const result = await coordinator.executeWithResilience({
      adapterId: "groq-adapter",
      modelId: "llama-3.3-70b-versatile",
      executeFn: async () => {
        return "ONLINE_SUCCESS";
      },
    });

    expect(result.result).toBe("ONLINE_SUCCESS");
    expect(coordinator.getMetrics().offlineRejections).toBe(0);
  });
});
