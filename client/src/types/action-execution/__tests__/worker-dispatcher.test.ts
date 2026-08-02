/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Worker Dispatcher (`worker-dispatcher.test.ts`)
 *
 * @file worker-dispatcher.test.ts
 * @description Unit tests for WorkerDispatcher allocation, worker execution tracking,
 * worker cancellation, and abort operations.
 *
 * @module @aether/action-execution/tests/worker-dispatcher
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WorkerDispatcher } from "../worker-dispatcher";
import { WorkerDispatchError } from "../engine-errors";
import type { ResolvedExecutionStep } from "../resolver-types";
import { RiskLevel } from "../../action-planner/enums";

describe("WorkerDispatcher", () => {
  let dispatcher: WorkerDispatcher;

  beforeEach(() => {
    dispatcher = new WorkerDispatcher();
  });

  const createMockStep = (stepId: string): ResolvedExecutionStep => ({
    stepId,
    sequenceIndex: 0,
    targetTool: "browser.navigate",
    unitEntry: {
      metadata: {
        unitId: "unit.browser",
        unitType: "BROWSER" as any,
        version: "1.0.0",
        namespacedTools: ["browser.navigate"],
        requiredPermissions: [],
        requiredCapabilities: [],
      },
      registeredAtMs: Date.now(),
      status: "ACTIVE" as any,
    },
    descriptor: {
      descriptorId: `desc_${stepId}`,
      stepId,
      sequenceIndex: 0,
      targetTool: "browser.navigate",
      unitId: "unit.browser",
      parameters: { url: "https://example.com" },
      bindings: [],
      timeoutMs: 1000,
      sandbox: {
        sandboxId: `sb_${stepId}`,
        stepId,
        timeoutMs: 1000,
        allowedPermissions: [],
        allowedCapabilities: [],
        isFrozen: true,
      },
    },
    dependencies: [],
    riskLevel: RiskLevel.LOW,
  });

  it("dispatches worker and returns execution worker result", async () => {
    const step = createMockStep("step_navigate");
    const result = await dispatcher.dispatchWorker(step);

    expect(result).toBeDefined();
    expect(result.stepId).toBe("step_navigate");
    expect(result.success).toBe(true);
    expect(result.outputData).toBeDefined();
  });

  it("tracks worker via trackWorker and getActiveWorkers", async () => {
    const step = createMockStep("step_track");

    let releaseWorker: () => void;
    const workerPromise = new Promise<void>((res) => {
      releaseWorker = res;
    });

    const customWorker = {
      workerId: "w_custom_100",
      unitId: "unit.browser",
      stepId: "step_track",
      status: "ALLOCATED" as const,
      execute: async () => {
        await workerPromise;
        return {
          workerId: "w_custom_100",
          stepId: "step_track",
          success: true,
          startTimestampMs: Date.now(),
          endTimestampMs: Date.now(),
        };
      },
    };

    const dispatchPromise = dispatcher.dispatchWorker(step, undefined, customWorker as any);

    const tracked = dispatcher.trackWorker("w_custom_100");
    expect(tracked).toBeDefined();
    expect(tracked?.workerId).toBe("w_custom_100");

    expect(dispatcher.getActiveWorkers().length).toBe(1);

    releaseWorker!();
    await dispatchPromise;
  });

  it("cancels an active worker via cancelWorker", async () => {
    const step = createMockStep("step_cancel");

    const customWorker = {
      workerId: "w_cancel_1",
      unitId: "unit.browser",
      stepId: "step_cancel",
      status: "ALLOCATED" as const,
      execute: async (_desc: any, signal?: AbortSignal) => {
        return new Promise((_res, rej) => {
          if (signal) {
            signal.addEventListener("abort", () => {
              rej(signal.reason ?? new Error("Aborted"));
            });
          }
        });
      },
    };

    const dispatchPromise = dispatcher.dispatchWorker(step, undefined, customWorker as any);

    const cancelled = dispatcher.cancelWorker("w_cancel_1");
    expect(cancelled).toBe(true);

    await expect(dispatchPromise).rejects.toThrow(WorkerDispatchError);
  });

  it("aborts an active worker via abortWorker", async () => {
    const step = createMockStep("step_abort");

    const customWorker = {
      workerId: "w_abort_1",
      unitId: "unit.browser",
      stepId: "step_abort",
      status: "ALLOCATED" as const,
      execute: async (_desc: any, signal?: AbortSignal) => {
        return new Promise((_res, rej) => {
          if (signal) {
            signal.addEventListener("abort", () => {
              rej(signal.reason ?? new Error("Aborted"));
            });
          }
        });
      },
    };

    const dispatchPromise = dispatcher.dispatchWorker(step, undefined, customWorker as any);

    const aborted = dispatcher.abortWorker("w_abort_1", "Custom abort reason");
    expect(aborted).toBe(true);

    await expect(dispatchPromise).rejects.toThrow(WorkerDispatchError);
  });

  it("returns false when cancelling non-existent worker", () => {
    expect(dispatcher.cancelWorker("invalid_worker_id")).toBe(false);
  });
});
