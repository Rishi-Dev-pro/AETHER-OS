/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 9: Circuit Breaker Engine (`circuit-breaker.ts`)
 *
 * @file circuit-breaker.ts
 * @description Pure-function circuit breaker state machine implementing the standard
 * Closed → Open → Half-Open pattern. All functions are side-effect-free and return
 * immutable state snapshots.
 *
 * @module @aether/ai-runtime/circuit-breaker
 * @version 1.0.0
 * @status MILESTONE 2 — PROVIDER INFRASTRUCTURE
 */

import { CircuitState } from "./types";
import { ConfigurationError } from "./errors";
import { deepFreeze } from "./internal/deep-freeze";


// ============================================================================
// 1. CONFIGURATION CONTRACT
// ============================================================================

/**
 * Immutable circuit breaker threshold and timing configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures required to trip the circuit OPEN */
  readonly failureThreshold: number;
  /** Duration in milliseconds the circuit remains OPEN before transitioning to HALF_OPEN */
  readonly recoveryTimeoutMs: number;
  /** Maximum concurrent probe requests permitted in HALF_OPEN state */
  readonly halfOpenMaxProbes: number;
  /** Rolling window duration in milliseconds for failure rate monitoring */
  readonly monitoringWindowMs: number;
}

/** Default circuit breaker configuration values */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Readonly<CircuitBreakerConfig> = Object.freeze({
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  halfOpenMaxProbes: 1,
  monitoringWindowMs: 60000,
});


// ============================================================================
// 2. STATE SNAPSHOT
// ============================================================================

/**
 * Immutable point-in-time capture of a provider's circuit breaker state.
 * All state transitions produce a new snapshot — the original is never mutated.
 */
export interface CircuitBreakerSnapshot {
  /** Current circuit state (CLOSED, OPEN, HALF_OPEN) */
  readonly state: CircuitState;
  /** Running count of consecutive failures since last success */
  readonly consecutiveFailures: number;
  /** Timestamp of the most recent failure (epoch ms), or 0 if none */
  readonly lastFailureTimestamp: number;
  /** Timestamp of the most recent success (epoch ms), or 0 if none */
  readonly lastSuccessTimestamp: number;
  /** Cumulative count of times the circuit has tripped to OPEN */
  readonly totalTrips: number;
  /** Number of active probe requests currently in-flight during HALF_OPEN */
  readonly activeProbes: number;
  /** Snapshot creation timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 3. TRANSITION EVENT
// ============================================================================

/**
 * Immutable record of a circuit breaker state transition event.
 * Used for diagnostic logging and telemetry emission.
 */
export interface CircuitBreakerTransition {
  /** Circuit state before the transition */
  readonly fromState: CircuitState;
  /** Circuit state after the transition */
  readonly toState: CircuitState;
  /** Human-readable reason for the state transition */
  readonly reason: string;
  /** Transition event timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 4. FACTORY FUNCTIONS
// ============================================================================

/**
 * Parameters passed to createCircuitBreakerConfig factory function.
 */
export interface CreateCircuitBreakerConfigParams {
  readonly failureThreshold?: number;
  readonly recoveryTimeoutMs?: number;
  readonly halfOpenMaxProbes?: number;
  readonly monitoringWindowMs?: number;
}

/**
 * Factory function creating an immutable CircuitBreakerConfig object.
 * Merges overrides with defaults and validates invariants.
 *
 * @throws {ConfigurationError} If any threshold or timing value is invalid.
 */
export function createCircuitBreakerConfig(
  params: CreateCircuitBreakerConfigParams = {}
): Readonly<CircuitBreakerConfig> {
  const config: CircuitBreakerConfig = {
    failureThreshold: params.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
    recoveryTimeoutMs: params.recoveryTimeoutMs ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeoutMs,
    halfOpenMaxProbes: params.halfOpenMaxProbes ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenMaxProbes,
    monitoringWindowMs: params.monitoringWindowMs ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.monitoringWindowMs,
  };

  if (config.failureThreshold < 1 || !Number.isInteger(config.failureThreshold)) {
    throw new ConfigurationError({
      subCode: "InvalidFailureThreshold",
      message: `failureThreshold must be a positive integer. Received: ${config.failureThreshold}`,
    });
  }

  if (config.recoveryTimeoutMs <= 0) {
    throw new ConfigurationError({
      subCode: "InvalidRecoveryTimeout",
      message: `recoveryTimeoutMs must be > 0. Received: ${config.recoveryTimeoutMs}`,
    });
  }

  if (config.halfOpenMaxProbes < 1 || !Number.isInteger(config.halfOpenMaxProbes)) {
    throw new ConfigurationError({
      subCode: "InvalidHalfOpenMaxProbes",
      message: `halfOpenMaxProbes must be a positive integer. Received: ${config.halfOpenMaxProbes}`,
    });
  }

  if (config.monitoringWindowMs <= 0) {
    throw new ConfigurationError({
      subCode: "InvalidMonitoringWindow",
      message: `monitoringWindowMs must be > 0. Received: ${config.monitoringWindowMs}`,
    });
  }

  return deepFreeze(config);
}

/**
 * Factory function creating an immutable initial CircuitBreakerSnapshot in CLOSED state.
 */
export function createInitialSnapshot(): Readonly<CircuitBreakerSnapshot> {
  const snapshot: CircuitBreakerSnapshot = {
    state: CircuitState.CLOSED,
    consecutiveFailures: 0,
    lastFailureTimestamp: 0,
    lastSuccessTimestamp: 0,
    totalTrips: 0,
    activeProbes: 0,
    timestamp: Date.now(),
  };

  return deepFreeze(snapshot);
}


// ============================================================================
// 5. PURE STATE EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluates whether the circuit state should transition based on current snapshot
 * and configuration thresholds. Returns the computed next state without mutating inputs.
 *
 * Transition rules:
 * - CLOSED → OPEN: When consecutiveFailures >= failureThreshold
 * - OPEN → HALF_OPEN: When recoveryTimeoutMs has elapsed since lastFailureTimestamp
 * - HALF_OPEN → CLOSED: On successful probe (handled by recordSuccess)
 * - HALF_OPEN → OPEN: On failed probe (handled by recordFailure)
 *
 * @param snapshot - Current immutable circuit breaker state snapshot.
 * @param config - Immutable circuit breaker configuration.
 * @param currentTimeMs - Current time in epoch ms (injectable for testability).
 * @returns The computed next CircuitState.
 */
export function evaluateCircuitState(
  snapshot: CircuitBreakerSnapshot,
  config: CircuitBreakerConfig,
  currentTimeMs: number = Date.now()
): CircuitState {
  switch (snapshot.state) {
    case CircuitState.CLOSED:
      // Trip to OPEN if consecutive failures exceed threshold
      if (snapshot.consecutiveFailures >= config.failureThreshold) {
        return CircuitState.OPEN;
      }
      return CircuitState.CLOSED;

    case CircuitState.OPEN:
      // Transition to HALF_OPEN if recovery timeout has elapsed
      if (
        snapshot.lastFailureTimestamp > 0 &&
        currentTimeMs - snapshot.lastFailureTimestamp >= config.recoveryTimeoutMs
      ) {
        return CircuitState.HALF_OPEN;
      }
      return CircuitState.OPEN;

    case CircuitState.HALF_OPEN:
      // HALF_OPEN state transitions are driven by recordSuccess/recordFailure
      return CircuitState.HALF_OPEN;

    default:
      return snapshot.state;
  }
}

/**
 * Gate check determining if a request should be permitted through the circuit.
 *
 * - CLOSED: Always allows requests.
 * - OPEN: Blocks requests unless recovery timeout has elapsed (auto-transitions to HALF_OPEN evaluation).
 * - HALF_OPEN: Allows requests only if activeProbes < halfOpenMaxProbes.
 *
 * @param snapshot - Current immutable circuit breaker state snapshot.
 * @param config - Immutable circuit breaker configuration.
 * @param currentTimeMs - Current time in epoch ms (injectable for testability).
 * @returns True if the request should be dispatched; false if it should be rejected.
 */
export function shouldAllowRequest(
  snapshot: CircuitBreakerSnapshot,
  config: CircuitBreakerConfig,
  currentTimeMs: number = Date.now()
): boolean {
  // First evaluate if state should transition
  const evaluatedState = evaluateCircuitState(snapshot, config, currentTimeMs);

  switch (evaluatedState) {
    case CircuitState.CLOSED:
      return true;

    case CircuitState.OPEN:
      return false;

    case CircuitState.HALF_OPEN:
      return snapshot.activeProbes < config.halfOpenMaxProbes;

    default:
      return false;
  }
}

/**
 * Records a successful request execution and returns a new snapshot.
 * Resets consecutive failure count and transitions HALF_OPEN → CLOSED.
 *
 * @param snapshot - Current immutable circuit breaker state snapshot.
 * @returns New immutable snapshot reflecting the success.
 */
export function recordSuccess(
  snapshot: CircuitBreakerSnapshot
): Readonly<CircuitBreakerSnapshot> {
  const now = Date.now();

  const newSnapshot: CircuitBreakerSnapshot = {
    state: snapshot.state === CircuitState.HALF_OPEN ? CircuitState.CLOSED : snapshot.state,
    consecutiveFailures: 0,
    lastFailureTimestamp: snapshot.lastFailureTimestamp,
    lastSuccessTimestamp: now,
    totalTrips: snapshot.totalTrips,
    activeProbes: snapshot.state === CircuitState.HALF_OPEN
      ? Math.max(0, snapshot.activeProbes - 1)
      : snapshot.activeProbes,
    timestamp: now,
  };

  return deepFreeze(newSnapshot);
}

/**
 * Records a failed request execution and returns a new snapshot.
 * Increments consecutive failure count and may trip CLOSED → OPEN or HALF_OPEN → OPEN.
 *
 * @param snapshot - Current immutable circuit breaker state snapshot.
 * @param config - Immutable circuit breaker configuration.
 * @returns New immutable snapshot reflecting the failure.
 */
export function recordFailure(
  snapshot: CircuitBreakerSnapshot,
  config: CircuitBreakerConfig
): Readonly<CircuitBreakerSnapshot> {
  const now = Date.now();
  const newConsecutiveFailures = snapshot.consecutiveFailures + 1;

  // Determine new state based on current state
  let newState = snapshot.state;
  let newTotalTrips = snapshot.totalTrips;
  let newActiveProbes = snapshot.activeProbes;

  if (snapshot.state === CircuitState.HALF_OPEN) {
    // HALF_OPEN probe failure → trip back to OPEN
    newState = CircuitState.OPEN;
    newTotalTrips = snapshot.totalTrips + 1;
    newActiveProbes = Math.max(0, snapshot.activeProbes - 1);
  } else if (
    snapshot.state === CircuitState.CLOSED &&
    newConsecutiveFailures >= config.failureThreshold
  ) {
    // CLOSED → OPEN when threshold reached
    newState = CircuitState.OPEN;
    newTotalTrips = snapshot.totalTrips + 1;
  }

  const newSnapshot: CircuitBreakerSnapshot = {
    state: newState,
    consecutiveFailures: newConsecutiveFailures,
    lastFailureTimestamp: now,
    lastSuccessTimestamp: snapshot.lastSuccessTimestamp,
    totalTrips: newTotalTrips,
    activeProbes: newActiveProbes,
    timestamp: now,
  };

  return deepFreeze(newSnapshot);
}

/**
 * Creates an immutable CircuitBreakerTransition event record.
 */
export function createTransition(
  fromState: CircuitState,
  toState: CircuitState,
  reason: string
): Readonly<CircuitBreakerTransition> {
  const transition: CircuitBreakerTransition = {
    fromState,
    toState,
    reason,
    timestamp: Date.now(),
  };

  return deepFreeze(transition);
}
