/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Unit Test: CircuitBreakerEngine Suite (`circuit-breaker-engine.test.ts`)
 *
 * @file circuit-breaker-engine.test.ts
 * @description Validates CLOSED, OPEN, HALF_OPEN state transitions, failure threshold limits,
 * cooldown timers, trial execution rules, and immutable snapshot generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreakerState } from "../enums";
import { CircuitBreakerEngine } from "../circuit-breaker-engine";

describe("Phase 9.9 — Milestone 4: CircuitBreakerEngine Unit Test Suite", () => {
  let engine: CircuitBreakerEngine;

  beforeEach(() => {
    engine = new CircuitBreakerEngine();
  });

  it("should initialize in CLOSED state and allow execution", () => {
    expect(engine.getState("p1")).toBe(CircuitBreakerState.CLOSED);
    expect(engine.canExecute("p1")).toBe(true);
  });

  it("should transition CLOSED -> OPEN when consecutive failures reach threshold (default 3)", () => {
    const id = "p1";
    const now = 100000;

    engine.recordFailure(id, now);
    engine.recordFailure(id, now);
    expect(engine.getState(id, now)).toBe(CircuitBreakerState.CLOSED);

    engine.recordFailure(id, now); // 3rd failure
    expect(engine.getState(id, now)).toBe(CircuitBreakerState.OPEN);
    expect(engine.canExecute(id, now)).toBe(false);
  });

  it("should auto-transition OPEN -> HALF_OPEN when cooldown period (30s) expires", () => {
    const id = "p1";
    const now = 100000;

    // Trigger OPEN
    engine.recordFailure(id, now);
    engine.recordFailure(id, now);
    engine.recordFailure(id, now);
    expect(engine.getState(id, now)).toBe(CircuitBreakerState.OPEN);

    // During cooldown window (30s = 30000ms): should reject execution
    const duringCooldown = now + 15000;
    expect(engine.canExecute(id, duringCooldown)).toBe(false);
    expect(engine.getState(id, duringCooldown)).toBe(CircuitBreakerState.OPEN);

    // After cooldown window (30000ms): should auto-transition to HALF_OPEN and allow trial execution
    const afterCooldown = now + 30001;
    expect(engine.canExecute(id, afterCooldown)).toBe(true);
    expect(engine.getState(id, afterCooldown)).toBe(CircuitBreakerState.HALF_OPEN);
  });

  it("should transition HALF_OPEN -> CLOSED when trial successes reach threshold (default 2)", () => {
    const id = "p1";
    const now = 100000;

    engine.openCircuit(id, now);
    const afterCooldown = now + 30001;
    engine.canExecute(id, afterCooldown); // Transitions to HALF_OPEN

    expect(engine.getState(id, afterCooldown)).toBe(CircuitBreakerState.HALF_OPEN);

    engine.recordSuccess(id, afterCooldown);
    expect(engine.getState(id, afterCooldown)).toBe(CircuitBreakerState.HALF_OPEN);

    engine.recordSuccess(id, afterCooldown); // 2nd success
    expect(engine.getState(id, afterCooldown)).toBe(CircuitBreakerState.CLOSED);
    expect(engine.canExecute(id, afterCooldown)).toBe(true);
  });

  it("should transition HALF_OPEN -> OPEN immediately if trial execution fails", () => {
    const id = "p1";
    const now = 100000;

    engine.halfOpenCircuit(id, now);
    expect(engine.getState(id, now)).toBe(CircuitBreakerState.HALF_OPEN);

    engine.recordFailure(id, now); // Trial fails
    expect(engine.getState(id, now)).toBe(CircuitBreakerState.OPEN);
    expect(engine.canExecute(id, now)).toBe(false);
  });

  it("should create deeply frozen CircuitBreakerSnapshot objects", () => {
    const id = "p1";
    const now = 100000;
    engine.recordFailure(id, now);

    const snapshot = engine.createSnapshot(id, now);
    expect(snapshot.providerId).toBe(id);
    expect(snapshot.status.state).toBe(CircuitBreakerState.CLOSED);
    expect(snapshot.status.consecutiveFailures).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.status)).toBe(true);
  });
});
