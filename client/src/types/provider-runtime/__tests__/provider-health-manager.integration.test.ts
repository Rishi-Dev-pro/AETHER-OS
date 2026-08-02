/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Integration Test: ProviderHealthManager Integration Suite (`provider-health-manager.integration.test.ts`)
 *
 * @file provider-health-manager.integration.test.ts
 * @description Validates health metric calculations and 100-run replay determinism.
 */

import { describe, it, expect } from "vitest";
import { ProviderHealthManager } from "../provider-health-manager";

describe("Phase 9.9 — Milestone 4: ProviderHealthManager Integration Suite", () => {
  it("should maintain independent health metrics across multiple providers", () => {
    const health = new ProviderHealthManager();

    health.recordSuccess("groq-cloud", 50);
    health.recordSuccess("groq-cloud", 60);

    health.recordFailure("ollama-local");
    health.recordFailure("ollama-local");

    expect(health.calculateAvailability("groq-cloud")).toBe(1.0);
    expect(health.calculateAvailability("ollama-local")).toBe(0.0);
  });

  it("should produce bit-for-bit identical health score outputs across 100 replay runs", () => {
    const runSequence = () => {
      const hm = new ProviderHealthManager();
      const id = "p_replay_health";
      hm.recordSuccess(id, 100);
      hm.recordFailure(id);
      hm.recordSuccess(id, 150);
      return hm.getHealthMetrics(id);
    };

    const firstRun = runSequence();
    for (let i = 0; i < 100; i++) {
      const result = runSequence();
      expect(result.availabilityScore).toBe(firstRun.availabilityScore);
      expect(result.healthScore).toBe(firstRun.healthScore);
      expect(result.averageLatencyMs).toBe(firstRun.averageLatencyMs);
    }
  });
});
