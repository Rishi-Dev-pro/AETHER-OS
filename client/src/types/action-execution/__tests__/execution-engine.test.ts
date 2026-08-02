/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Execution Engine Unit Tests (`execution-engine.test.ts`)
 *
 * @file execution-engine.test.ts
 * @description Unit tests verifying ExecutionEngine initialization, plan execution, stage execution,
 * step execution, worker execution, timeouts, illegal transitions, and cancellation.
 *
 * @module @aether/action-execution/tests/execution-engine
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExecutionEngine } from "../execution-engine";
import { ExecutionCancellationError, ExecutionEngineError } from "../engine-errors";
import type { ResolvedExecutionPlan, ResolvedExecutionStep } from "../resolver-types";
import { RiskLevel } from "../../action-planner/enums";

describe("ExecutionEngine Runtime", () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = new ExecutionEngine();
  });

  const createMockStep = (stepId: string, sequenceIndex: number, timeoutMs = 1000): ResolvedExecutionStep => ({
    stepId,
    sequenceIndex,
    targetTool: "system.command",
    unitEntry: {
      metadata: {
        unitId: "unit.system",
        unitType: "LOCAL_OS" as any,
        version: "1.0.0",
        namespacedTools: ["system.command"],
        requiredPermissions: [],
        requiredCapabilities: [],
      },
      registeredAtMs: Date.now(),
      status: "ACTIVE" as any,
    },
    descriptor: {
      descriptorId: `desc_${stepId}`,
      stepId,
      sequenceIndex,
      targetTool: "system.command",
      unitId: "unit.system",
      parameters: { cmd: "echo test" },
      bindings: [],
      timeoutMs,
      sandbox: {
        sandboxId: `sb_${stepId}`,
        stepId,
        timeoutMs,
        allowedPermissions: [],
        allowedCapabilities: [],
        isFrozen: true,
      },
    },
    dependencies: [],
    riskLevel: RiskLevel.LOW,
  });

  const mockPlan: ResolvedExecutionPlan = {
    planId: "plan_engine_001",
    resolvedSteps: [
      createMockStep("step_0", 0),
      createMockStep("step_1", 1),
    ],
    resolvedStages: [
      { stageIndex: 0, stepIds: ["step_0"] },
      { stageIndex: 1, stepIds: ["step_1"] },
    ],
    resolvedAtMs: Date.now(),
    totalStepsCount: 2,
  };

  it("initializes in CREATED state", () => {
    expect(engine.currentState()).toBe("CREATED");
    expect(engine.getLifecycleController()).toBeDefined();
    expect(engine.getStageDispatcher()).toBeDefined();
    expect(engine.getWorkerDispatcher()).toBeDefined();
    expect(engine.getTimeoutManager()).toBeDefined();
  });

  it("executes a valid ResolvedExecutionPlan through all stages to COMPLETED", async () => {
    const finalState = await engine.executeExecutionPlan(mockPlan);

    expect(finalState).toBe("COMPLETED");
    expect(engine.currentState()).toBe("COMPLETED");
    expect(engine.getLifecycleController().getHistory()).toEqual([
      "CREATED",
      "VALIDATED",
      "READY",
      "RUNNING",
      "COMPLETED",
    ]);
  });

  it("executes individual steps via executeExecutionStep", async () => {
    const step = createMockStep("step_single", 0);
    const result = await engine.executeExecutionStep(step);

    expect(result).toBeDefined();
    expect(result.stepId).toBe("step_single");
    expect(result.success).toBe(true);
  });

  it("executes worker directly via executeWorker", async () => {
    const step = createMockStep("step_worker_direct", 0);
    const worker = {
      workerId: "worker_direct_1",
      unitId: "unit.system",
      stepId: "step_worker_direct",
      status: "IDLE" as const,
      execute: async () => ({
        workerId: "worker_direct_1",
        stepId: "step_worker_direct",
        success: true,
        startTimestampMs: Date.now(),
        endTimestampMs: Date.now(),
      }),
    };

    const result = await engine.executeWorker(worker, step.descriptor);

    expect(result.success).toBe(true);
    expect(result.workerId).toBe("worker_direct_1");
  });

  it("transitions to FAILED if plan structure is invalid", async () => {
    await expect(engine.executeExecutionPlan({} as any)).rejects.toThrow(ExecutionEngineError);
    expect(engine.currentState()).toBe("FAILED");
  });

  it("transitions to ABORTED if AbortSignal is triggered", async () => {
    const abortController = new AbortController();
    abortController.abort("User cancelled plan");

    await expect(engine.executeExecutionPlan(mockPlan, { abortSignal: abortController.signal })).rejects.toThrow(
      ExecutionCancellationError
    );
    expect(engine.currentState()).toBe("ABORTED");
  });

  it("transitions to TIMED_OUT when overall defaultTimeoutMs expires", async () => {
    const slowStep = createMockStep("step_slow", 0, 5000);
    const slowPlan: ResolvedExecutionPlan = {
      planId: "plan_slow",
      resolvedSteps: [slowStep],
      resolvedStages: [{ stageIndex: 0, stepIds: ["step_slow"] }],
      resolvedAtMs: Date.now(),
      totalStepsCount: 1,
    };

    vi.spyOn(engine.getWorkerDispatcher(), "dispatchWorker").mockImplementation(async (_step, signal) => {
      return new Promise((_res, rej) => {
        if (signal) {
          signal.addEventListener("abort", () => {
            rej(signal.reason);
          });
        }
      });
    });

    const execPromise = engine.executeExecutionPlan(slowPlan, { defaultTimeoutMs: 50 });

    await expect(execPromise).rejects.toThrow();
    expect(engine.currentState()).toBe("TIMED_OUT");
  });
});
