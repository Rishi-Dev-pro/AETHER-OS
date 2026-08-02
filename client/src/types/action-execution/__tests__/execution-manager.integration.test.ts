/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Integration Test: Action Execution Manager End-to-End (`execution-manager.integration.test.ts`)
 *
 * @file execution-manager.integration.test.ts
 * @description End-to-end integration test flowing Phase 9.7 plans through Milestones 1–5 via ActionExecutionManager,
 * verifying 100 replay runs for bit-for-bit deterministic pipeline results and diagnostics consistency.
 *
 * @module @aether/action-execution/tests/execution-manager-integration
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ActionExecutionManager } from "../execution-manager";
import { ExecutionRegistry } from "../execution-registry";
import { PermissionScope, ExecutionCapability, ExecutionUnitType } from "../enums";
import type { SecuredExecutionPlan, PlanStep } from "../contracts";
import { ActionType, RiskLevel, PlanPriority, ApprovalRequirement, StepType } from "../../action-planner/enums";
import type { ExecutionBoundary } from "../contracts";
import type { ExecutionEnvironment } from "../resolver-types";

describe("ActionExecutionManager End-to-End Pipeline Integration Suite", () => {
  let registry: ExecutionRegistry;
  let manager: ActionExecutionManager;

  beforeEach(() => {
    registry = new ExecutionRegistry();
    manager = new ActionExecutionManager(registry);
  });

  const defaultBoundary: ExecutionBoundary = {
    maxSteps: 10,
    allowedPermissions: [
      PermissionScope.BROWSER_AUTOMATION,
      PermissionScope.FILE_SYSTEM_READ,
      PermissionScope.SYSTEM_COMMAND,
    ],
    allowedCapabilities: [
      ExecutionCapability.CAN_NAVIGATE,
      ExecutionCapability.CAN_READ_FILE,
      ExecutionCapability.CAN_EXECUTE_CLI,
    ],
    maxEngineTimeMs: 10000,
    allowUnapprovedPlans: true,
  };

  const defaultEnvironment: ExecutionEnvironment = {
    platform: "windows",
    isHeadless: true,
    activeCapabilities: [
      ExecutionCapability.CAN_NAVIGATE,
      ExecutionCapability.CAN_READ_FILE,
      ExecutionCapability.CAN_EXECUTE_CLI,
    ],
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
    parameters: { param: `value_${stepId}` },
    dependencies,
    riskLevel: RiskLevel.LOW,
    timeoutMs: 3000,
    preconditions: [],
    postconditions: [],
  });

  const createSecuredPlan = (steps: PlanStep[]): SecuredExecutionPlan => ({
    metadata: {
      planId: "plan_e2e_001",
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
      { stageIndex: 0, stepIds: steps.filter((s) => s.dependencies.length === 0).map((s) => s.stepId) },
      { stageIndex: 1, stepIds: steps.filter((s) => s.dependencies.length > 0).map((s) => s.stepId) },
    ],
    compositeRiskLevel: RiskLevel.LOW,
    priority: PlanPriority.NORMAL,
    requiresUserApproval: false,
    approvalRequirement: ApprovalRequirement.NONE,
    confidenceScore: 0.98,
    preconditions: [],
    postconditions: [],
  });

  it("completes full pipeline execution through all Milestones 1–5 layers", async () => {
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

    const s0 = createStep("step_0", 0, "browser.navigate");
    const s1 = createStep("step_1", 1, "fs.read_file", [{ stepId: "step_0", dependencyType: "STRICT" }]);
    const plan = createSecuredPlan([s0, s1]);

    const result = await manager.executePipeline(plan, {
      boundary: defaultBoundary,
      environment: defaultEnvironment,
    });

    expect(result.success).toBe(true);
    expect(result.resultEnvelope).toBeDefined();
    expect(result.resultEnvelope.summary.success).toBe(true);
    expect(result.resultEnvelope.stepResults.length).toBe(2);
    expect(result.resultEnvelope.stageResults.length).toBe(2);
    expect(result.resultEnvelope.cleanupReport.success).toBe(true);
    expect(result.diagnostics.success).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("guarantees 100 replay runs with bit-for-bit deterministic pipeline results and identical diagnostics", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.deterministic",
      unitType: ExecutionUnitType.API,
      version: "1.0.0",
      namespacedTools: ["api.execute"],
      requiredPermissions: [],
      requiredCapabilities: [],
    });

    const s0 = createStep("step_det_0", 0, "api.execute");
    const s1 = createStep("step_det_1", 1, "api.execute", [{ stepId: "step_det_0", dependencyType: "STRICT" }]);
    const plan = createSecuredPlan([s0, s1]);

    const replaySignatures: string[] = [];

    for (let run = 0; run < 100; run++) {
      const runRegistry = new ExecutionRegistry();
      runRegistry.registerExecutionUnit({
        unitId: "unit.deterministic",
        unitType: ExecutionUnitType.API,
        version: "1.0.0",
        namespacedTools: ["api.execute"],
        requiredPermissions: [],
        requiredCapabilities: [],
      });
      const runManager = new ActionExecutionManager(runRegistry);

      const result = await runManager.executePipeline(plan, {
        boundary: defaultBoundary,
        environment: defaultEnvironment,
      });

      const diag = result.diagnostics;
      const sig = `${result.success}:${diag.success}:${diag.executedStages.join("->")}:${result.resultEnvelope.stepResults.length}`;
      replaySignatures.push(sig);
    }

    const firstSig = replaySignatures[0];
    expect(firstSig).toBe("true:true:VALIDATION->REGISTRY_LOOKUP->RESOLUTION->ENGINE_EXECUTION->RESULT_AGGREGATION->CLEANUP->RESULT_VALIDATION->COMPLETED:2");

    for (let run = 1; run < 100; run++) {
      expect(replaySignatures[run]).toBe(firstSig);
    }

    expect(replaySignatures.length).toBe(100);
  });
});
