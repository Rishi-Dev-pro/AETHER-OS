/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 6 Component: Resilience Domain Types & Contracts (`resilience-types.ts`)
 *
 * @file resilience-types.ts
 * @description Strongly-typed contracts for automatic retries, timeout management,
 * circuit breaker FSM integration, provider failover, offline detection, and recovery events.
 *
 * @module @aether/runtime/resilience/resilience-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 6
 */

/**
 * Resilience execution configuration.
 */
export interface ResilienceConfig {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly requestTimeoutMs: number;
  readonly streamingTimeoutMs: number;
  readonly fallbackProviders: ReadonlyArray<string>;
  readonly enableCircuitBreaker: boolean;
  readonly retryableStatusCodes: ReadonlyArray<number>;
}

/**
 * Default resilience configuration.
 */
export const DEFAULT_RESILIENCE_CONFIG: Readonly<ResilienceConfig> = Object.freeze({
  maxRetries: 3,
  initialDelayMs: 50,
  requestTimeoutMs: 15000,
  streamingTimeoutMs: 30000,
  fallbackProviders: Object.freeze(["groq-adapter", "nvidia-adapter", "openai-adapter", "ollama-adapter"]),
  enableCircuitBreaker: true,
  retryableStatusCodes: Object.freeze([408, 429, 500, 502, 503, 504]),
});

/**
 * Network connectivity status.
 */
export type NetworkStatus = "ONLINE" | "OFFLINE" | "DEGRADED";

/**
 * Metrics tracking runtime resilience occurrences.
 */
export interface ResilienceMetricsSnapshot {
  readonly totalRetries: number;
  readonly successfulRetries: number;
  readonly failedRetries: number;
  readonly totalTimeouts: number;
  readonly totalFailovers: number;
  readonly circuitBreakerTrips: number;
  readonly offlineRejections: number;
  readonly lastFailoverTimestamp?: number;
  readonly lastRecoveryTimestamp?: number;
}

/**
 * Result of a resilience execution step.
 */
export interface ResilienceExecutionResult<T> {
  readonly result: T;
  readonly attempts: number;
  readonly resolvedProvider: string;
  readonly resolvedModel: string;
  readonly didFailover: boolean;
  readonly failoverHistory: ReadonlyArray<{
    readonly fromProvider: string;
    readonly toProvider: string;
    readonly error: string;
    readonly timestamp: number;
  }>;
}
