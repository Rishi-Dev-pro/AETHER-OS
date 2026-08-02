/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component Test: Action Execution Manager (`execution-manager.test.ts`)
 *
 * @file execution-manager.test.ts
 * @description Unit tests for ActionExecutionManager pipeline orchestration,
 * fail-fast domain error propagation, diagnostics generation, and result immutability.
 *
 * @module @aether/action-execution/tests/execution-manager
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
import { ExecutionUnitResolutionError } from "../resolver-errors";
import { BoundaryValidationError } from "../errors";

describe("ActionExecutionManager Unit Suite", () => {
  let registry: ExecutionRegistry;
  let manager: ActionExecutionManager;

  beforeEach(() => {
    registry = new ExecutionRegistry();
    manager = new ActionExecutionManager(registry);
  });

  const defaultBoundary: ExecutionBoundary = {
    maxSteps: 10,
    allowedPermissions: [PermissionScope.SYSTEM_COMMAND],
    allowedCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    maxEngineTimeMs: 10000,
    allowUnapprovedPlans: true,
  };

  const defaultEnvironment: ExecutionEnvironment = {
    platform: "windows",
    isHeadless: true,
    activeCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    availablePermissions: [PermissionScope.SYSTEM_COMMAND],
  };

  const createStep = (stepId: string, targetTool: string): PlanStep => ({
    stepId,
    sequenceIndex: 0,
    stepType: StepType.SYSTEM_OPERATION,
    targetTool,
    parameters: { param: "val" },
    dependencies: [],
    riskLevel: RiskLevel.LOW,
    timeoutMs: 3000,
    preconditions: [],
    postconditions: [],
  });

  const createSecuredPlan = (steps: PlanStep[]): SecuredExecutionPlan => ({
    metadata: {
      planId: "plan_mgr_001",
      sessionId: "session_001",
      turnId: "turn_001",
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 60000,
      generatorVersion: "1.0.0",
      customMetadata: {},
    },
    primaryActionType: ActionType.EXECUTE,
    steps,
    executionStages: [{ stageIndex: 0, stepIds: steps.map((s) => s.stepId) }],
    compositeRiskLevel: RiskLevel.LOW,
    priority: PlanPriority.NORMAL,
    requiresUserApproval: false,
    approvalRequirement: ApprovalRequirement.NONE,
    confidenceScore: 0.95,
    preconditions: [],
    postconditions: [],
  });

  it("instantiates manager with accessors for registry, engine, and cleanup manager", () => {
    expect(manager.getRegistry()).toBe(registry);
    expect(manager.getEngine()).toBeDefined();
    expect(manager.getCleanupManager()).toBeDefined();
  });

  it("executes valid pipeline and returns immutable ExecutionPipelineResult with diagnostics", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.cli",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["cli.run"],
      requiredPermissions: [PermissionScope.SYSTEM_COMMAND],
      requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    });

    const plan = createSecuredPlan([createStep("step_cli_01", "cli.run")]);
    const result = await manager.executePipeline(plan, {
      boundary: defaultBoundary,
      environment: defaultEnvironment,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.pipelineId).toContain("pipeline_plan_mgr_001");
    expect(result.planId).toBe("plan_mgr_001");
    expect(result.resultEnvelope).toBeDefined();
    expect(result.diagnostics).toBeDefined();

    // Diagnostics content verification
    expect(result.diagnostics.pipelineId).toBe(result.pipelineId);
    expect(result.diagnostics.success).toBe(true);
    expect(result.diagnostics.failureStage).toBeUndefined();
    expect(result.diagnostics.executedStages.length).toBeGreaterThan(0);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });

  it("propagates domain exception fail-fast if boundary validation fails", async () => {
    const expiredPlan: SecuredExecutionPlan = {
      ...createSecuredPlan([createStep("step_0", "cli.run")]),
      metadata: {
        ...createSecuredPlan([]).metadata,
        expiresAtMs: Date.now() - 10000, // Expired plan
      },
    };

    await expect(
      manager.executePipeline(expiredPlan, { boundary: defaultBoundary })
    ).rejects.toThrow();
  });

  it("propagates domain exception fail-fast if unit resolution fails in registry", async () => {
    const unresolvablePlan = createSecuredPlan([createStep("step_unresolvable", "unknown.tool")]);

    await expect(
      manager.executePipeline(unresolvablePlan, {
        boundary: defaultBoundary,
        environment: defaultEnvironment,
      })
    ).rejects.toThrow(ExecutionUnitResolutionError);
  });

  it("provides execute and executePlan aliases", async () => {
    registry.registerExecutionUnit({
      unitId: "unit.cli",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["cli.run"],
      requiredPermissions: [PermissionScope.SYSTEM_COMMAND],
      requiredCapabilities: [ExecutionCapability.CAN_EXECUTE_CLI],
    });

    const plan = createSecuredPlan([createStep("step_cli_01", "cli.run")]);

    const res1 = await manager.executePlan(plan, { boundary: defaultBoundary, environment: defaultEnvironment });
    const res2 = await manager.execute(plan, { boundary: defaultBoundary, environment: defaultEnvironment });

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
  });
});
