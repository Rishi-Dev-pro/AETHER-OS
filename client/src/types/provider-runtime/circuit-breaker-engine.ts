/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Component: Circuit Breaker Engine (`circuit-breaker-engine.ts`)
 *
 * @file circuit-breaker-engine.ts
 * @description Owns isolated Circuit Breaker FSM states (CLOSED, OPEN, HALF_OPEN),
 * failure threshold evaluation, cooldown timers, and trial probe execution logic.
 * Contains ZERO retry loops or provider execution logic.
 *
 * @module @aether/provider-runtime/circuit-breaker-engine
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import { CircuitBreakerState } from "./enums";
import type {
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  CircuitBreakerSnapshot,
} from "./lifecycle-types";
import { deepFreeze } from "./factories";

/**
 * Default Circuit Breaker configuration values.
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  successThreshold: 2,
  cooldownPeriodMs: 30000, // 30 seconds
};

interface InternalStatus {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastStateChangeMs: number;
  nextTrialAllowedMs?: number;
}

/**
 * Pure state machine engine governing Circuit Breaker state transitions per providerId.
 */
export class CircuitBreakerEngine {
  private readonly statusMap = new Map<string, InternalStatus>();
  private readonly configMap = new Map<string, CircuitBreakerConfig>();

  /**
   * Customizes configuration parameters for a target provider.
   */
  public configureProvider(providerId: string, config: Readonly<CircuitBreakerConfig>): void {
    this.configMap.set(providerId, { ...config });
  }

  /**
   * Returns current CircuitBreakerConfig for a provider.
   */
  public getConfig(providerId: string): Readonly<CircuitBreakerConfig> {
    return this.configMap.get(providerId) ?? DEFAULT_CONFIG;
  }

  /**
   * Retrieves current CircuitBreakerState for a provider, evaluating auto-cooldown transitions.
   */
  public getState(providerId: string, currentTimeMs: number = Date.now()): CircuitBreakerState {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    return status.state;
  }

  /**
   * Evaluates whether an execution call can be dispatched to the provider.
   * Auto-transitions OPEN -> HALF_OPEN if cooldown period has expired.
   */
  public canExecute(providerId: string, currentTimeMs: number = Date.now()): boolean {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    if (status.state === CircuitBreakerState.CLOSED || status.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    if (status.state === CircuitBreakerState.OPEN && status.nextTrialAllowedMs && currentTimeMs >= status.nextTrialAllowedMs) {
      this.halfOpenCircuit(providerId, currentTimeMs);
      return true;
    }

    return false;
  }

  /**
   * Records a successful execution outcome. Updates state machine.
   */
  public recordSuccess(providerId: string, currentTimeMs: number = Date.now()): CircuitBreakerState {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    const config = this.getConfig(providerId);

    if (status.state === CircuitBreakerState.CLOSED) {
      status.consecutiveSuccesses++;
      status.consecutiveFailures = 0;
    } else if (status.state === CircuitBreakerState.HALF_OPEN) {
      status.consecutiveSuccesses++;
      if (status.consecutiveSuccesses >= config.successThreshold) {
        this.closeCircuit(providerId, currentTimeMs);
        return CircuitBreakerState.CLOSED;
      }
    }

    return status.state;
  }

  /**
   * Records a failed execution outcome. Updates state machine.
   */
  public recordFailure(providerId: string, currentTimeMs: number = Date.now()): CircuitBreakerState {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    const config = this.getConfig(providerId);

    if (status.state === CircuitBreakerState.CLOSED) {
      status.consecutiveFailures++;
      status.consecutiveSuccesses = 0;

      if (status.consecutiveFailures >= config.failureThreshold) {
        this.openCircuit(providerId, currentTimeMs);
        return CircuitBreakerState.OPEN;
      }
    } else if (status.state === CircuitBreakerState.HALF_OPEN) {
      // Trial probe failed! Return immediately to OPEN state
      this.openCircuit(providerId, currentTimeMs);
      return CircuitBreakerState.OPEN;
    }

    return status.state;
  }

  /**
   * Forcefully transitions circuit breaker into OPEN state.
   */
  public openCircuit(providerId: string, currentTimeMs: number = Date.now()): void {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    const config = this.getConfig(providerId);

    status.state = CircuitBreakerState.OPEN;
    status.lastStateChangeMs = currentTimeMs;
    status.nextTrialAllowedMs = currentTimeMs + config.cooldownPeriodMs;
  }

  /**
   * Forcefully transitions circuit breaker into CLOSED state.
   */
  public closeCircuit(providerId: string, currentTimeMs: number = Date.now()): void {
    const status = this.getInternalStatus(providerId, currentTimeMs);

    status.state = CircuitBreakerState.CLOSED;
    status.consecutiveFailures = 0;
    status.consecutiveSuccesses = 0;
    status.lastStateChangeMs = currentTimeMs;
    status.nextTrialAllowedMs = undefined;
  }

  /**
   * Forcefully transitions circuit breaker into HALF_OPEN state.
   */
  public halfOpenCircuit(providerId: string, currentTimeMs: number = Date.now()): void {
    const status = this.getInternalStatus(providerId, currentTimeMs);

    status.state = CircuitBreakerState.HALF_OPEN;
    status.consecutiveFailures = 0;
    status.consecutiveSuccesses = 0;
    status.lastStateChangeMs = currentTimeMs;
  }

  /**
   * Generates a deeply frozen snapshot of current circuit breaker status.
   */
  public createSnapshot(providerId: string, currentTimeMs: number = Date.now()): Readonly<CircuitBreakerSnapshot> {
    const status = this.getInternalStatus(providerId, currentTimeMs);
    const statusCopy: CircuitBreakerStatus = {
      providerId,
      state: status.state,
      consecutiveFailures: status.consecutiveFailures,
      consecutiveSuccesses: status.consecutiveSuccesses,
      lastStateChangeMs: status.lastStateChangeMs,
      ...(status.nextTrialAllowedMs !== undefined ? { nextTrialAllowedMs: status.nextTrialAllowedMs } : {}),
    };

    const snapshot: CircuitBreakerSnapshot = {
      snapshotId: `snap_cb_${providerId}_${currentTimeMs}`,
      providerId,
      status: deepFreeze(statusCopy),
      createdAtMs: currentTimeMs,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Resets circuit breaker state for a provider or all providers.
   */
  public reset(providerId?: string): void {
    if (providerId) {
      this.statusMap.delete(providerId);
    } else {
      this.statusMap.clear();
    }
  }

  /**
   * Retrieves or initializes internal status, handling auto-cooldown transitions.
   */
  private getInternalStatus(providerId: string, currentTimeMs: number): InternalStatus {
    let status = this.statusMap.get(providerId);
    if (!status) {
      status = {
        state: CircuitBreakerState.CLOSED,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastStateChangeMs: currentTimeMs,
      };
      this.statusMap.set(providerId, status);
    }

    // Auto-transition OPEN -> HALF_OPEN if cooldown period elapsed
    if (status.state === CircuitBreakerState.OPEN && status.nextTrialAllowedMs && currentTimeMs >= status.nextTrialAllowedMs) {
      status.state = CircuitBreakerState.HALF_OPEN;
      status.consecutiveFailures = 0;
      status.consecutiveSuccesses = 0;
      status.lastStateChangeMs = currentTimeMs;
    }

    return status;
  }
}
