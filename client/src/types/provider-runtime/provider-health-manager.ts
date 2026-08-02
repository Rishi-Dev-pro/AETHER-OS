/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Component: Provider Health Manager (`provider-health-manager.ts`)
 *
 * @file provider-health-manager.ts
 * @description Tracks in-memory operational metrics exclusively (latency measurements,
 * success/failure counts, availability scores, health scores) for ProviderSelector routing.
 * Contains ZERO telemetry, persistence, logging, or analytics.
 *
 * @module @aether/provider-runtime/provider-health-manager
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type { HealthMetrics, HealthSnapshot } from "./lifecycle-types";
import { deepFreeze } from "./factories";

/**
 * Pure in-memory operational health metrics owner.
 */
export class ProviderHealthManager {
  private readonly metricsMap = new Map<string, HealthMetrics>();

  /**
   * Retrieves or initializes default in-memory HealthMetrics for a provider.
   */
  public getHealthMetrics(providerId: string): Readonly<HealthMetrics> {
    const existing = this.metricsMap.get(providerId);
    if (existing) {
      return deepFreeze({ ...existing });
    }

    const defaultMetrics: HealthMetrics = {
      providerId,
      availabilityScore: 1.0,
      successCount: 0,
      failureCount: 0,
      totalExecutions: 0,
      averageLatencyMs: 0,
      healthScore: 1.0,
      updatedAtMs: Date.now(),
    };

    this.metricsMap.set(providerId, defaultMetrics);
    return deepFreeze({ ...defaultMetrics });
  }

  /**
   * Records a successful execution outcome. Updates latency, availability, and health score.
   */
  public recordSuccess(providerId: string, latencyMs: number): Readonly<HealthMetrics> {
    const current = this.metricsMap.get(providerId) ?? this.getHealthMetrics(providerId);

    const successCount = current.successCount + 1;
    const totalExecutions = current.totalExecutions + 1;
    const averageLatencyMs =
      current.totalExecutions === 0
        ? Math.max(0, latencyMs)
        : (current.averageLatencyMs * current.totalExecutions + Math.max(0, latencyMs)) / totalExecutions;

    const availabilityScore = this.computeAvailability(successCount, totalExecutions);
    const healthScore = this.computeHealthScore(availabilityScore, averageLatencyMs);

    const updated: HealthMetrics = {
      ...current,
      successCount,
      totalExecutions,
      averageLatencyMs,
      availabilityScore,
      healthScore,
      lastSuccessTimestampMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    this.metricsMap.set(providerId, updated);
    return deepFreeze({ ...updated });
  }

  /**
   * Records a failed execution outcome. Updates failure count, availability, and health score.
   */
  public recordFailure(providerId: string, latencyMs?: number): Readonly<HealthMetrics> {
    const current = this.metricsMap.get(providerId) ?? this.getHealthMetrics(providerId);

    const failureCount = current.failureCount + 1;
    const totalExecutions = current.totalExecutions + 1;
    let averageLatencyMs = current.averageLatencyMs;

    if (latencyMs !== undefined && latencyMs >= 0) {
      averageLatencyMs =
        current.totalExecutions === 0
          ? latencyMs
          : (current.averageLatencyMs * current.totalExecutions + latencyMs) / totalExecutions;
    }

    const availabilityScore = this.computeAvailability(current.successCount, totalExecutions);
    const healthScore = this.computeHealthScore(availabilityScore, averageLatencyMs);

    const updated: HealthMetrics = {
      ...current,
      failureCount,
      totalExecutions,
      averageLatencyMs,
      availabilityScore,
      healthScore,
      lastFailureTimestampMs: Date.now(),
      updatedAtMs: Date.now(),
    };

    this.metricsMap.set(providerId, updated);
    return deepFreeze({ ...updated });
  }

  /**
   * Manually updates moving average latency for a provider.
   */
  public updateLatency(providerId: string, latencyMs: number): Readonly<HealthMetrics> {
    const current = this.metricsMap.get(providerId) ?? this.getHealthMetrics(providerId);
    const validLatency = Math.max(0, latencyMs);
    const averageLatencyMs =
      current.totalExecutions === 0
        ? validLatency
        : (current.averageLatencyMs + validLatency) / 2;

    const healthScore = this.computeHealthScore(current.availabilityScore, averageLatencyMs);

    const updated: HealthMetrics = {
      ...current,
      averageLatencyMs,
      healthScore,
      updatedAtMs: Date.now(),
    };

    this.metricsMap.set(providerId, updated);
    return deepFreeze({ ...updated });
  }

  /**
   * Calculates current availability score [0.0 - 1.0].
   */
  public calculateAvailability(providerId: string): number {
    const metrics = this.getHealthMetrics(providerId);
    return metrics.availabilityScore;
  }

  /**
   * Calculates weighted rolling health score [0.0 - 1.0].
   */
  public calculateHealthScore(providerId: string): number {
    const metrics = this.getHealthMetrics(providerId);
    return metrics.healthScore;
  }

  /**
   * Generates a deeply frozen HealthSnapshot.
   */
  public createHealthSnapshot(providerId: string): Readonly<HealthSnapshot> {
    const metrics = this.getHealthMetrics(providerId);
    const snapshot: HealthSnapshot = {
      snapshotId: `snap_health_${providerId}_${Date.now()}`,
      providerId,
      metrics,
      createdAtMs: Date.now(),
    };

    return deepFreeze(snapshot);
  }

  /**
   * Resets health metrics for a provider or all providers.
   */
  public resetHealth(providerId?: string): void {
    if (providerId) {
      this.metricsMap.delete(providerId);
    } else {
      this.metricsMap.clear();
    }
  }

  private computeAvailability(successCount: number, totalExecutions: number): number {
    if (totalExecutions === 0) {
      return 1.0;
    }
    return Number((successCount / totalExecutions).toFixed(4));
  }

  private computeHealthScore(availabilityScore: number, averageLatencyMs: number): number {
    const latencyScore = 1 / (1 + averageLatencyMs / 1000);
    const score = availabilityScore * 0.5 + latencyScore * 0.3 + availabilityScore * 0.2;
    return Number(Math.min(1.0, Math.max(0.0, score)).toFixed(4));
  }
}
