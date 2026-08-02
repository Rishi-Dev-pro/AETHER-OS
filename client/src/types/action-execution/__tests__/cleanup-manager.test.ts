/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Cleanup Manager (`cleanup-manager.test.ts`)
 *
 * @file cleanup-manager.test.ts
 * @description Unit tests for CleanupManager worker disposal, timeout clearing, resource cleanup,
 * idempotency, repeated invocation safety, and CleanupReport emission.
 *
 * @module @aether/action-execution/tests/cleanup-manager
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 5
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CleanupManager } from "../cleanup-manager";
import { WorkerDispatcher } from "../worker-dispatcher";
import { TimeoutManager } from "../timeout-manager";

describe("CleanupManager", () => {
  let cleanupManager: CleanupManager;
  let workerDispatcher: WorkerDispatcher;
  let timeoutManager: TimeoutManager;

  beforeEach(() => {
    cleanupManager = new CleanupManager();
    workerDispatcher = new WorkerDispatcher();
    timeoutManager = new TimeoutManager();
  });

  it("cleans up active workers idempotently", () => {
    vi.spyOn(workerDispatcher, "getActiveWorkers").mockReturnValue([
      { workerId: "w1" } as any,
      { workerId: "w2" } as any,
    ]);
    const clearSpy = vi.spyOn(workerDispatcher, "clearAll");

    const count1 = cleanupManager.cleanupWorkers(workerDispatcher);
    expect(count1).toBe(2);
    expect(clearSpy).toHaveBeenCalledOnce();

    // Repeated call with no active workers
    vi.spyOn(workerDispatcher, "getActiveWorkers").mockReturnValue([]);
    const count2 = cleanupManager.cleanupWorkers(workerDispatcher);
    expect(count2).toBe(0);
  });

  it("cleans up active timeouts idempotently", () => {
    const clearSpy = vi.spyOn(timeoutManager, "clearAll");

    const count1 = cleanupManager.cleanupTimeouts(timeoutManager);
    expect(count1).toBe(1);
    expect(clearSpy).toHaveBeenCalledOnce();

    // Repeated call
    const count2 = cleanupManager.cleanupTimeouts(timeoutManager);
    expect(count2).toBe(1);
  });

  it("disposes custom execution resources (functions, AbortControllers, dispose methods)", () => {
    const cleanupFn = vi.fn();
    const abortCtrl = new AbortController();
    const disposableObj = { dispose: vi.fn() };
    const clearableObj = { clear: vi.fn() };

    const count = cleanupManager.cleanupExecutionResources([
      cleanupFn,
      abortCtrl,
      disposableObj,
      clearableObj,
    ]);

    expect(count).toBe(4);
    expect(cleanupFn).toHaveBeenCalledOnce();
    expect(abortCtrl.signal.aborted).toBe(true);
    expect(disposableObj.dispose).toHaveBeenCalledOnce();
    expect(clearableObj.clear).toHaveBeenCalledOnce();
  });

  it("executes full session cleanup and returns immutable CleanupReport", () => {
    const report = cleanupManager.cleanupSession("plan_cleanup_001", {
      workerDispatcher,
      timeoutManager,
      additionalResources: [vi.fn()],
    });

    expect(report).toBeDefined();
    expect(report.planId).toBe("plan_cleanup_001");
    expect(report.success).toBe(true);
    expect(report.details.length).toBeGreaterThan(0);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("supports repeated cleanup calls safely (idempotent execution)", () => {
    const report1 = cleanupManager.cleanupSession("plan_idempotent", {
      workerDispatcher,
      timeoutManager,
    });
    const report2 = cleanupManager.cleanupSession("plan_idempotent", {
      workerDispatcher,
      timeoutManager,
    });

    expect(report1.success).toBe(true);
    expect(report2.success).toBe(true);
  });
});
