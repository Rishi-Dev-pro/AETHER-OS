/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Unit Test: ProviderHealthManager Suite (`provider-health-manager.test.ts`)
 *
 * @file provider-health-manager.test.ts
 * @description Validates operational metric recording, moving average latency tracking,
 * health score calculation, availability scores, and deeply frozen health snapshots.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderHealthManager } from "../provider-health-manager";

describe("Phase 9.9 — Milestone 4: ProviderHealthManager Unit Test Suite", () => {
  let healthManager: ProviderHealthManager;

  beforeEach(() => {
    healthManager = new ProviderHealthManager();
  });

  it("should initialize default metrics with perfect health and availability", () => {
    const metrics = healthManager.getHealthMetrics("p1");
    expect(metrics.providerId).toBe("p1");
    expect(metrics.availabilityScore).toBe(1.0);
    expect(metrics.healthScore).toBe(1.0);
    expect(metrics.totalExecutions).toBe(0);
    expect(Object.isFrozen(metrics)).toBe(true);
  });

  it("should record successes and calculate moving average latency", () => {
    healthManager.recordSuccess("p1", 100);
    healthManager.recordSuccess("p1", 200);

    const metrics = healthManager.getHealthMetrics("p1");
    expect(metrics.successCount).toBe(2);
    expect(metrics.totalExecutions).toBe(2);
    expect(metrics.averageLatencyMs).toBe(150);
    expect(metrics.availabilityScore).toBe(1.0);
  });

  it("should record failures and update availability score", () => {
    healthManager.recordSuccess("p1", 100);
    healthManager.recordFailure("p1");

    const metrics = healthManager.getHealthMetrics("p1");
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(1);
    expect(metrics.totalExecutions).toBe(2);
    expect(metrics.availabilityScore).toBe(0.5);
  });

  it("should update moving average latency via updateLatency()", () => {
    healthManager.recordSuccess("p1", 100);
    healthManager.updateLatency("p1", 300);

    const metrics = healthManager.getHealthMetrics("p1");
    expect(metrics.averageLatencyMs).toBe(200);
  });

  it("should generate deeply frozen HealthSnapshot objects", () => {
    healthManager.recordSuccess("p1", 50);
    const snapshot = healthManager.createHealthSnapshot("p1");

    expect(snapshot.providerId).toBe("p1");
    expect(snapshot.metrics.successCount).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.metrics)).toBe(true);
  });
});
