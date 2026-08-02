/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 4 Integration Test: ProviderLifecycleManager Integration Suite (`provider-lifecycle-manager.integration.test.ts`)
 *
 * @file provider-lifecycle-manager.integration.test.ts
 * @description Validates multi-provider FSM tracking and deterministic replay across 100 runs.
 */

import { describe, it, expect } from "vitest";
import { ProviderLifecycleState } from "../enums";
import { ProviderLifecycleManager } from "../provider-lifecycle-manager";

describe("Phase 9.9 — Milestone 4: ProviderLifecycleManager Integration Suite", () => {
  it("should track distinct lifecycle state transitions across multiple providers concurrently", () => {
    const manager = new ProviderLifecycleManager();

    manager.registerProvider("provider-a");
    manager.registerProvider("provider-b");

    manager.initializeProvider("provider-a");
    manager.initializeProvider("provider-b");

    manager.warmProvider("provider-a");
    manager.markReady("provider-b");

    expect(manager.getLifecycleState("provider-a")).toBe(ProviderLifecycleState.WARMING_UP);
    expect(manager.getLifecycleState("provider-b")).toBe(ProviderLifecycleState.READY);

    manager.markReady("provider-a");
    manager.markBusy("provider-b");

    expect(manager.getLifecycleState("provider-a")).toBe(ProviderLifecycleState.READY);
    expect(manager.getLifecycleState("provider-b")).toBe(ProviderLifecycleState.BUSY);
  });

  it("should produce bit-for-bit identical lifecycle transition history across 100 replay runs", () => {
    const runSequence = () => {
      const mgr = new ProviderLifecycleManager();
      const id = "p_replay";
      mgr.registerProvider(id);
      mgr.initializeProvider(id);
      mgr.warmProvider(id);
      mgr.markReady(id);
      mgr.markBusy(id);
      mgr.markReady(id);
      return mgr.createSnapshot(id).history.map((h) => `${h.fromState}->${h.toState}`);
    };

    const firstRun = runSequence();
    for (let i = 0; i < 100; i++) {
      expect(runSequence()).toEqual(firstRun);
    }
  });
});
