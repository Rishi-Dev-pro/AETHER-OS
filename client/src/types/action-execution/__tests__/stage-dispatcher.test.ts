/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Stage Dispatcher (`stage-dispatcher.test.ts`)
 *
 * @file stage-dispatcher.test.ts
 * @description Unit tests for StageDispatcher stage ordering, parallel worker execution inside stages,
 * and topological stage dependency validation.
 *
 * @module @aether/action-execution/tests/stage-dispatcher
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { StageDispatcher } from "../stage-dispatcher";
import { StageDispatchError } from "../engine-errors";
import type { ResolvedExecutionPlan, ResolvedExecutionStep } from "../resolver-types";
import { RiskLevel } from "../../action-planner/enums";

describe("StageDispatcher", () => {
  let dispatcher: StageDispatcher;

  beforeEach(() => {
    dispatcher = new StageDispatcher();
  });

  const createMockStep = (stepId: string, sequenceIndex: number, dependencies: { stepId: string; dependencyType: "STRICT" | "OPTIONAL" }[] = []): ResolvedExecutionStep => ({
    stepId,
    sequenceIndex,
    targetTool: "test.tool",
    unitEntry: {
      metadata: {
        unitId: "test.unit",
        unitType: "API" as any,
        version: "1.0.0",
        namespacedTools: ["test.tool"],
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
      targetTool: "test.tool",
      unitId: "test.unit",
      parameters: {},
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
    dependencies,
    riskLevel: RiskLevel.LOW,
  });

  const mockPlan: ResolvedExecutionPlan = {
    planId: "plan_test_001",
    resolvedSteps: [
      createMockStep("step_0", 0, []),
      createMockStep("step_1", 1, []),
      createMockStep("step_2", 2, [{ stepId: "step_0", dependencyType: "STRICT" }]),
    ],
    resolvedStages: [
      { stageIndex: 0, stepIds: ["step_0", "step_1"] },
      { stageIndex: 1, stepIds: ["step_2"] },
    ],
    resolvedAtMs: Date.now(),
    totalStepsCount: 3,
  };

  it("validates valid stage dependencies", () => {
    const isValid = dispatcher.validateStageDependencies(mockPlan);
    expect(isValid).toBe(true);
  });

  it("rejects invalid stage dependencies (step dependent on future or same stage step)", () => {
    const invalidPlan: ResolvedExecutionPlan = {
      ...mockPlan,
      resolvedSteps: [
        createMockStep("step_0", 0, [{ stepId: "step_2", dependencyType: "STRICT" }]), // step_0 in stage 0 depends on step_2 in stage 1
        createMockStep("step_1", 1, []),
        createMockStep("step_2", 2, []),
      ],
    };

    const isValid = dispatcher.validateStageDependencies(invalidPlan);
    expect(isValid).toBe(false);
  });

  it("executes stages sequentially in order (Stage 0 then Stage 1)", async () => {
    const executedStages: number[] = [];
    const stageExecutor = vi.fn(async (stageIndex: number) => {
      executedStages.push(stageIndex);
    });

    await dispatcher.dispatchStages(mockPlan, stageExecutor);

    expect(stageExecutor).toHaveBeenCalledTimes(2);
    expect(executedStages).toEqual([0, 1]);
  });

  it("dispatches steps in parallel inside a stage", async () => {
    const startedSteps: string[] = [];
    const completedSteps: string[] = [];

    const workerExecutor = vi.fn(async (stepId: string) => {
      startedSteps.push(stepId);
      await new Promise((res) => setTimeout(res, 10));
      completedSteps.push(stepId);
    });

    await dispatcher.dispatchStage(0, ["step_0", "step_1"], workerExecutor);

    expect(workerExecutor).toHaveBeenCalledTimes(2);
    expect(startedSteps).toEqual(["step_0", "step_1"]);
    expect(completedSteps.length).toBe(2);
  });

  it("throws StageDispatchError if dependency validation fails during dispatchStages", async () => {
    const invalidPlan: ResolvedExecutionPlan = {
      ...mockPlan,
      resolvedSteps: [
        createMockStep("step_0", 0, [{ stepId: "step_2", dependencyType: "STRICT" }]),
        createMockStep("step_1", 1, []),
        createMockStep("step_2", 2, []),
      ],
    };

    await expect(dispatcher.dispatchStages(invalidPlan, async () => {})).rejects.toThrow(StageDispatchError);
  });

  it("stops subsequent stages if a stage execution fails", async () => {
    const executedStages: number[] = [];
    const stageExecutor = vi.fn(async (stageIndex: number) => {
      executedStages.push(stageIndex);
      if (stageIndex === 0) {
        throw new Error("Stage 0 failed");
      }
    });

    await expect(dispatcher.dispatchStages(mockPlan, stageExecutor)).rejects.toThrow(StageDispatchError);
    expect(executedStages).toEqual([0]);
  });
});
