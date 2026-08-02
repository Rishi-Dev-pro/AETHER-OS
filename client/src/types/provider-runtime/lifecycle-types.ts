/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Component: Lifecycle, Health & Circuit Breaker Types (`lifecycle-types.ts`)
 *
 * @file lifecycle-types.ts
 * @description Strongly-typed domain interfaces for provider lifecycle state transitions,
 * health metrics snapshots, circuit breaker statuses, and operational configurations.
 *
 * @module @aether/provider-runtime/lifecycle-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import { ProviderLifecycleState, CircuitBreakerState } from "./enums";

/**
 * Record of a single Provider Lifecycle FSM transition.
 */
export interface LifecycleTransition {
  readonly fromState: ProviderLifecycleState;
  readonly toState: ProviderLifecycleState;
  readonly timestampMs: number;
  readonly reason?: string;
}

/**
 * Immutable snapshot of Provider Lifecycle state and transition history.
 */
export interface LifecycleSnapshot {
  readonly providerId: string;
  readonly currentState: ProviderLifecycleState;
  readonly history: readonly Readonly<LifecycleTransition>[];
  readonly snapshotAtMs: number;
}

/**
 * In-memory operational health metrics snapshot for a provider.
 */
export interface HealthMetrics {
  readonly providerId: string;
  readonly availabilityScore: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalExecutions: number;
  readonly averageLatencyMs: number;
  readonly healthScore: number;
  readonly lastSuccessTimestampMs?: number;
  readonly lastFailureTimestampMs?: number;
  readonly updatedAtMs: number;
}

/**
 * Immutable snapshot of provider health metrics.
 */
export interface HealthSnapshot {
  readonly snapshotId: string;
  readonly providerId: string;
  readonly metrics: Readonly<HealthMetrics>;
  readonly createdAtMs: number;
}

/**
 * Configuration options for CircuitBreakerEngine per provider.
 */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number;
  readonly successThreshold: number;
  readonly cooldownPeriodMs: number;
}

/**
 * Current operational status snapshot of a provider circuit breaker.
 */
export interface CircuitBreakerStatus {
  readonly providerId: string;
  readonly state: CircuitBreakerState;
  readonly consecutiveFailures: number;
  readonly consecutiveSuccesses: number;
  readonly lastStateChangeMs: number;
  readonly nextTrialAllowedMs?: number;
}

/**
 * Immutable snapshot of circuit breaker status.
 */
export interface CircuitBreakerSnapshot {
  readonly snapshotId: string;
  readonly providerId: string;
  readonly status: Readonly<CircuitBreakerStatus>;
  readonly createdAtMs: number;
}
