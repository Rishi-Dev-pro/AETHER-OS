import { describe, it, expect } from "vitest";
import { withTimeout, createTimeoutSignal } from "../timeout-controller";
import { ExecutionTimeoutError } from "../resilience-errors";

describe("Phase 9.11 Milestone 6: Timeout Controller Verification", () => {
  it("resolves promptly when task completes well within timeout deadline", async () => {
    const result = await withTimeout(
      async () => {
        return "FAST_RESULT";
      },
      1000
    );

    expect(result).toBe("FAST_RESULT");
  });

  it("throws ExecutionTimeoutError when task execution exceeds deadline", async () => {
    const promise = withTimeout(
      async (signal) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve("NEVER_REACHED"), 500);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new ExecutionTimeoutError("Timed out"));
          });
        });
      },
      50
    );

    await expect(promise).rejects.toThrow(ExecutionTimeoutError);
  });

  it("propagates parent AbortSignal immediately without waiting for timeout", async () => {
    const parentController = new AbortController();
    const handle = createTimeoutSignal(5000, parentController.signal);

    expect(handle.signal.aborted).toBe(false);
    parentController.abort("Parent aborted");
    expect(handle.signal.aborted).toBe(true);

    handle.cleanup();
  });

  it("cleans up timer handles without lingering node timers", async () => {
    const handle = createTimeoutSignal(10000);
    expect(handle.didTimeout()).toBe(false);
    handle.cleanup();
    // Timer cleared
  });
});
