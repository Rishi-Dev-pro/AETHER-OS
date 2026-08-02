/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Timeout Manager (`timeout-manager.test.ts`)
 *
 * @file timeout-manager.test.ts
 * @description Unit tests for TimeoutManager, AbortController integration,
 * timer cancellation, and resource cleanup.
 *
 * @module @aether/action-execution/tests/timeout-manager
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TimeoutManager } from "../timeout-manager";
import { ExecutionTimeoutError } from "../engine-errors";

describe("TimeoutManager", () => {
  let manager: TimeoutManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new TimeoutManager();
  });

  afterEach(() => {
    manager.clearAll();
    vi.useRealTimers();
  });

  it("creates a timeout bound to an AbortController", () => {
    const { timeoutId, abortController } = manager.createTimeout("target_1", 1000);
    expect(timeoutId).toBeDefined();
    expect(abortController).toBeInstanceOf(AbortController);
    expect(abortController.signal.aborted).toBe(false);
    expect(manager.checkTimeout(timeoutId)).toBe(false);
  });

  it("triggers AbortController signal with ExecutionTimeoutError when timer fires", () => {
    const { timeoutId, abortController } = manager.createTimeout("step_100", 500);

    vi.advanceTimersByTime(500);

    expect(abortController.signal.aborted).toBe(true);
    expect(abortController.signal.reason).toBeInstanceOf(ExecutionTimeoutError);
    expect((abortController.signal.reason as ExecutionTimeoutError).targetId).toBe("step_100");
    expect(manager.checkTimeout(timeoutId)).toBe(true);
  });

  it("invokes onTimeout callback when timer fires", () => {
    const callback = vi.fn();
    manager.createTimeout("worker_1", 200, callback);

    vi.advanceTimersByTime(200);

    expect(callback).toHaveBeenCalledOnce();
  });

  it("cancels pending timeout and prevents AbortController trigger", () => {
    const { timeoutId, abortController } = manager.createTimeout("step_2", 1000);

    const cancelled = manager.cancelTimeout(timeoutId);
    expect(cancelled).toBe(true);

    vi.advanceTimersByTime(1000);

    expect(abortController.signal.aborted).toBe(false);
    expect(manager.checkTimeout(timeoutId)).toBe(false);
  });

  it("returns false when cancelling invalid or already cancelled timeout", () => {
    const { timeoutId } = manager.createTimeout("step_3", 1000);
    manager.cancelTimeout(timeoutId);

    expect(manager.cancelTimeout(timeoutId)).toBe(false);
    expect(manager.cancelTimeout("non_existent")).toBe(false);
  });

  it("returns timeout descriptor metadata via getTimeoutDescriptor", () => {
    const { timeoutId } = manager.createTimeout("unit_5", 800);
    const descriptor = manager.getTimeoutDescriptor(timeoutId);

    expect(descriptor).toBeDefined();
    expect(descriptor?.targetId).toBe("unit_5");
    expect(descriptor?.durationMs).toBe(800);
    expect(descriptor?.isCancelled).toBe(false);
  });

  it("clears all active timers cleanly on clearAll()", () => {
    const t1 = manager.createTimeout("w1", 1000);
    const t2 = manager.createTimeout("w2", 2000);

    manager.clearAll();

    vi.advanceTimersByTime(2000);

    expect(t1.abortController.signal.aborted).toBe(false);
    expect(t2.abortController.signal.aborted).toBe(false);
  });
});
