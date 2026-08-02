/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Unit Test: ProviderLifecycleManager Suite (`provider-lifecycle-manager.test.ts`)
 *
 * @file provider-lifecycle-manager.test.ts
 * @description Validates legal state transitions, illegal state transition rejection,
 * terminal state enforcement, and snapshot creation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderLifecycleState } from "../enums";
import { IllegalLifecycleTransitionError } from "../lifecycle-errors";
import { ProviderLifecycleManager } from "../provider-lifecycle-manager";

describe("Phase 9.9 — Milestone 4: ProviderLifecycleManager Unit Test Suite", () => {
  let manager: ProviderLifecycleManager;

  beforeEach(() => {
    manager = new ProviderLifecycleManager();
  });

  it("should follow legal state transitions from UNREGISTERED to READY", () => {
    const id = "p1";
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.UNREGISTERED);

    manager.registerProvider(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.REGISTERED);

    manager.initializeProvider(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.INITIALIZING);

    manager.warmProvider(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.WARMING_UP);

    manager.markReady(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.READY);
  });

  it("should handle BUSY, DEGRADED, and recovery back to READY", () => {
    const id = "p2";
    manager.registerProvider(id);
    manager.initializeProvider(id);
    manager.markReady(id);

    manager.markBusy(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.BUSY);

    manager.markUnavailable(id, "Latency degraded");
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.DEGRADED);

    manager.markReady(id);
    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.READY);
  });

  it("should throw IllegalLifecycleTransitionError on illegal transitions", () => {
    const id = "p3";
    // Direct transition from UNREGISTERED to READY is illegal
    expect(() => manager.markReady(id)).toThrow(IllegalLifecycleTransitionError);

    manager.registerProvider(id);
    // Direct transition from REGISTERED to BUSY is illegal
    expect(() => manager.markBusy(id)).toThrow(IllegalLifecycleTransitionError);
  });

  it("should enforce terminal DISPOSED state and reject further transitions", () => {
    const id = "p4";
    manager.registerProvider(id);
    manager.initializeProvider(id);
    manager.shutdownProvider(id); // DISPOSED

    expect(manager.getLifecycleState(id)).toBe(ProviderLifecycleState.DISPOSED);

    expect(() => manager.markReady(id)).toThrow(IllegalLifecycleTransitionError);
    expect(() => manager.initializeProvider(id)).toThrow(IllegalLifecycleTransitionError);
  });

  it("should generate deeply frozen lifecycle snapshots with transition history", () => {
    const id = "p5";
    manager.registerProvider(id);
    manager.initializeProvider(id);
    manager.markReady(id);

    const snapshot = manager.createSnapshot(id);
    expect(snapshot.providerId).toBe(id);
    expect(snapshot.currentState).toBe(ProviderLifecycleState.READY);
    expect(snapshot.history.length).toBe(3);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.history)).toBe(true);
  });
});
