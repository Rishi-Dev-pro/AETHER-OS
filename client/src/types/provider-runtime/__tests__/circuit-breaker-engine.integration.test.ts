/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Integration Test: CircuitBreakerEngine Integration Suite (`circuit-breaker-engine.integration.test.ts`)
 *
 * @file circuit-breaker-engine.integration.test.ts
 * @description Integration verification suite validating CircuitBreakerEngine interaction
 * with ProviderHealthManager and 100-run replay determinism.
 */

import { describe, it, expect } from "vitest";
import { CircuitBreakerState, ProviderLifecycleState } from "../enums";
import { CircuitBreakerEngine } from "../circuit-breaker-engine";
import { ProviderHealthManager } from "../provider-health-manager";
import { ProviderLifecycleManager } from "../provider-lifecycle-manager";

describe("Phase 9.9 — Milestone 4: CircuitBreakerEngine Integration Suite", () => {
  it("should integrate Lifecycle, Health, and Circuit Breaker operations deterministically", () => {
    const lifecycle = new ProviderLifecycleManager();
    const health = new ProviderHealthManager();
    const circuit = new CircuitBreakerEngine();
    const id = "integration-provider";

    // Startup sequence
    lifecycle.registerProvider(id);
    lifecycle.initializeProvider(id);
    lifecycle.markReady(id);
    expect(lifecycle.getLifecycleState(id)).toBe(ProviderLifecycleState.READY);

    // Initial state: CLOSED, clean health
    expect(circuit.canExecute(id)).toBe(true);
    expect(health.calculateAvailability(id)).toBe(1.0);

    // Consecutive failures trigger OPEN state in circuit breaker and decay health
    const t0 = 100000;
    for (let i = 0; i < 3; i++) {
      health.recordFailure(id);
      circuit.recordFailure(id, t0);
    }

    expect(circuit.getState(id, t0)).toBe(CircuitBreakerState.OPEN);
    expect(circuit.canExecute(id, t0)).toBe(false);
    expect(health.calculateAvailability(id)).toBe(0.0);

    // After cooldown: auto HALF_OPEN
    const t1 = t0 + 35000;
    expect(circuit.canExecute(id, t1)).toBe(true);
    expect(circuit.getState(id, t1)).toBe(CircuitBreakerState.HALF_OPEN);

    // Trial successes recover circuit to CLOSED
    circuit.recordSuccess(id, t1);
    circuit.recordSuccess(id, t1);
    health.recordSuccess(id, 50);

    expect(circuit.getState(id, t1)).toBe(CircuitBreakerState.CLOSED);
  });

  it("should produce bit-for-bit identical state transition sequences across 100 replay runs", () => {
    const runSequence = () => {
      const cb = new CircuitBreakerEngine();
      const id = "p_replay_cb";
      const baseTime = 500000;

      const states: string[] = [];
      states.push(cb.getState(id, baseTime));

      cb.recordFailure(id, baseTime);
      cb.recordFailure(id, baseTime);
      cb.recordFailure(id, baseTime);
      states.push(cb.getState(id, baseTime));

      const afterCooldown = baseTime + 31000;
      cb.canExecute(id, afterCooldown);
      states.push(cb.getState(id, afterCooldown));

      cb.recordSuccess(id, afterCooldown);
      cb.recordSuccess(id, afterCooldown);
      states.push(cb.getState(id, afterCooldown));

      return states;
    };

    const firstRun = runSequence();
    for (let i = 0; i < 100; i++) {
      expect(runSequence()).toEqual(firstRun);
    }
  });
});
