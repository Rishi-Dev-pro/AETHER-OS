/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Integration Test: Execution Engine End-to-End (`execution-engine.integration.test.ts`)
 *
 * @file execution-engine.integration.test.ts
 * @description Integration tests verifying end-to-end compatibility across Milestone 1 (Boundary Validation),
 * Milestone 2 (Execution Registry), Milestone 3 (Execution Resolver), and Milestone 4 (Execution Engine),
 * including deterministic parallel stage execution and 100 replay runs.
 *
 * @module @aether/action-execution/tests/execution-engine-integration
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionBoundaryValidator } from "../boundary-validator";
import { ExecutionRegistry } from "../execution-registry";
import { ExecutionResolver } from "../execution-resolver";
import { ExecutionEngine } from "../execution-engine";
import { PermissionScope, ExecutionCapability, ExecutionUnitType } from "../enums";
import type { ExecutionPlan, PlanStep } from "../../action-planner/contracts";
import { ActionType, RiskLevel, PlanPriority, ApprovalRequirement, StepType } from "../../action-planner/enums";
import type { ExecutionBoundary } from "../contracts";
import type { ExecutionEnvironment } from "../resolver-types";

describe("ExecutionEngine End-to-End Integration Suite", () => {
  let registry: ExecutionRegistry;
  let engine: ExecutionEngine;

  beforeEach(() => {
    registry = new ExecutionRegistry();
    engine = new ExecutionEngine();
  });

  const defaultBoundary: ExecutionBoundary = {
    maxSteps: 10,
    allowedPermissions: [
      PermissionScope.BROWSER_AUTOMATION,
      PermissionScope.FILE_SYSTEM_READ,
      PermissionScope.SYSTEM_COMMAND,
    ],
    allowedCapabilities: [ExecutionCapability.CAN_NAVIGATE, ExecutionCapability.CAN_READ_FILE, ExecutionCapability.CAN_EXECUTE_CLI],
    maxEngineTimeMs: 10000,
    allowUnapprovedPlans: true,
  };

  const defaultEnvironment: ExecutionEnvironment = {
    platform: "windows",
    isHeadless: true,
    activeCapabilities: [ExecutionCapability.CAN_NAVIGATE, ExecutionCapability.CAN_READ_FILE, ExecutionCapability.CAN_EXECUTE_CLI],
    availablePermissions: [
      PermissionScope.BROWSER_AUTOMATION,
      PermissionScope.FILE_SYSTEM_READ,
      PermissionScope.SYSTEM_COMMAND,
    ],
  };

  const createStep = (stepId: string, sequenceIndex: number, targetTool: string, dependencies: { stepId: string; dependencyType: "STRICT" | "OPTIONAL" }[] = []): PlanStep => ({
    stepId,
    sequenceIndex,
    stepType: StepType.SYSTEM_OPERATION,
    targetTool,
    parameters: { paramKey: `value_${stepId}` },
    dependencies,
    riskLevel: RiskLevel.LOW,
    timeoutMs: 3000,
    preconditions: [],
    postconditions: [],
  });

  const createPlan = (steps: PlanStep[]): ExecutionPlan => ({
    metadata: {
      planId: "plan_integ_001",
      sessionId: "session_001",
      turnId: "turn_001",
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60000,
      generatorVersion: "1.0.0",
      customMetadata: {},
    },
    primaryActionType: ActionType.EXECUTE,
    steps,
    executionStages: [
      { stageIndex: 0, stepIds: steps.filter(s => s.dependencies.length === 0).map(s => s.stepId) },
      { stageIndex: 1, stepIds: steps.filter(s => s.dependencies.length > 0).map(s => s.stepId) },
    ],
    compositeRiskLevel: RiskLevel.LOW,
    priority: PlanPriority.NORMAL,
    requiresUserApproval: false,
    approvalRequirement: ApprovalRequirement.NONE,
    confidenceScore: 0.95,
    preconditions: [],
    postconditions: [],
  });

  it("completes pipeline from Milestone 1 boundary validation through Milestone 4 execution", async () => {
    // 1. Register unit adapters (Milestone 2)
    registry.registerExecutionUnit({
      unitId: "unit.browser",
      unitType: ExecutionUnitType.BROWSER,
      version: "1.0.0",
      namespacedTools: ["browser.navigate"],
      requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
      requiredCapabilities: [ExecutionCapability.CAN_NAVIGATE],
    });

    registry.registerExecutionUnit({
      unitId: "unit.fs",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["fs.read_file"],
      requiredPermissions: [PermissionScope.FILE_SYSTEM_READ],
      requiredCapabilities: [ExecutionCapability.CAN_READ_FILE],
    });

    // 2. Create raw plan
    const step0 = createStep("step_0", 0, "browser.navigate");
    const step1 = createStep("step_1", 1, "fs.read_file", [{ stepId: "step_0", dependencyType: "STRICT" }]);
    const plan = createPlan([step0, step1]);

    // 3. Validate boundary (Milestone 1)
    const boundaryResult = ExecutionBoundaryValidator.validateExecutionPlan(plan, defaultBoundary);
    expect(boundaryResult.isValid).toBe(true);

    // 4. Resolve plan (Milestone 3)
    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry, defaultEnvironment);

    expect(resolvedPlan.resolvedSteps.length).toBe(2);
    expect(resolvedPlan.resolvedStages.length).toBe(2);

    // 5. Execute plan (Milestone 4)
    const executionState = await engine.executeExecutionPlan(resolvedPlan);
    expect(executionState).toBe("COMPLETED");
    expect(engine.currentState()).toBe("COMPLETED");
  });

  it("supports parallel worker execution inside a stage", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.system",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["sys.tool_a", "sys.tool_b"],
      requiredPermissions: [PermissionScope.SYSTEM_COMMAND],
      requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    });

    const stepA = createStep("step_a", 0, "sys.tool_a");
    const stepB = createStep("step_b", 1, "sys.tool_b");

    // Both steps in Stage 0 (parallel stage)
    const parallelPlan: ExecutionPlan = {
      ...createPlan([stepA, stepB]),
      executionStages: [{ stageIndex: 0, stepIds: ["step_a", "step_b"] }],
    };

    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(parallelPlan, registry, defaultEnvironment);

    expect(resolvedPlan.resolvedStages[0].stepIds).toEqual(["step_a", "step_b"]);

    const executionState = await engine.executeExecutionPlan(resolvedPlan);
    expect(executionState).toBe("COMPLETED");
  });

  it("guarantees 100 replay runs with bit-for-bit deterministic execution behavior", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.deterministic",
      unitType: ExecutionUnitType.API,
      version: "1.0.0",
      namespacedTools: ["api.call"],
      requiredPermissions: [],
      requiredCapabilities: [],
    });

    const step0 = createStep("step_d0", 0, "api.call");
    const step1 = createStep("step_d1", 1, "api.call", [{ stepId: "step_d0", dependencyType: "STRICT" }]);
    const plan = createPlan([step0, step1]);

    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry, defaultEnvironment);

    const runResults: string[] = [];

    for (let run = 0; run < 100; run++) {
      const runEngine = new ExecutionEngine();
      const state = await runEngine.executeExecutionPlan(resolvedPlan);
      const historyStr = runEngine.getLifecycleController().getHistory().join("->");
      runResults.push(`${state}:${historyStr}`);
    }

    // Every single run must produce identical state and history string
    const firstRun = runResults[0];
    expect(firstRun).toBe("COMPLETED:CREATED->VALIDATED->READY->RUNNING->COMPLETED");

    for (let run = 1; run < 100; run++) {
      expect(runResults[run]).toBe(firstRun);
    }

    expect(runResults.length).toBe(100);
  });
});
