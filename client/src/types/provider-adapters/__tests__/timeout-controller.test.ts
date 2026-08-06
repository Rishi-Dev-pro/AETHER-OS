/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Timeout Controller (`timeout-controller.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { createTimeoutHandle } from "../timeout-controller";
import { TimeoutControllerError } from "../transport-errors";

describe("Phase 9.10 Timeout Controller Lifecycle & Abort Signals", () => {
  it("should create a valid timeout handle bound to an AbortController", () => {
    const handle = createTimeoutHandle(5000);
    expect(handle.timeoutMs).toBe(5000);
    expect(handle.controller).toBeDefined();
    expect(handle.signal).toBeDefined();
    expect(handle.signal.aborted).toBe(false);
    expect(handle.isTimedOut()).toBe(false);

    handle.cancel();
  });

  it("should trigger abort signal and timeout flag when duration elapses", async () => {
    let triggered = false;
    const handle = createTimeoutHandle(50, () => {
      triggered = true;
    });

    await new Promise((res) => setTimeout(res, 80));

    expect(handle.isTimedOut()).toBe(true);
    expect(handle.signal.aborted).toBe(true);
    expect(triggered).toBe(true);
  });

  it("should cancel timeout timer before trigger", async () => {
    let triggered = false;
    const handle = createTimeoutHandle(50, () => {
      triggered = true;
    });

    handle.cancel();
    await new Promise((res) => setTimeout(res, 80));

    expect(handle.isTimedOut()).toBe(false);
    expect(handle.signal.aborted).toBe(false);
    expect(triggered).toBe(false);
  });

  it("should throw TimeoutControllerError on invalid timeout duration", () => {
    expect(() => createTimeoutHandle(0)).toThrow(TimeoutControllerError);
    expect(() => createTimeoutHandle(-100)).toThrow(TimeoutControllerError);
  });
});
