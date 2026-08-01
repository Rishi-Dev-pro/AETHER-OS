/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Resolver Unit Tests (`execution-resolver.test.ts`)
 *
 * @file __tests__/execution-resolver.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutionUnitType, PermissionScope, ExecutionCapability } from "../enums";
import {
  ExecutionUnitResolutionError,
  ExecutionCompatibilityError,
  ParameterBindingError,
} from "../resolver-errors";
import { ExecutionRegistry } from "../execution-registry";
import { ExecutionResolver } from "../execution-resolver";
import type { SecuredExecutionPlan, PlanStep } from "../contracts";

describe("Phase 9.8 — ExecutionResolver Unit Tests", () => {
  let registry: ExecutionRegistry;

  beforeEach(() => {
    registry = new ExecutionRegistry();
    registry.registerExecutionUnit({
      unitId: "browser_adapter",
      unitType: ExecutionUnitType.BROWSER,
      version: "1.0.0",
      namespacedTools: ["browser.click", "browser.navigate"],
      requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
      requiredCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_NAVIGATE],
    });

    registry.registerExecutionUnit({
      unitId: "fs_adapter",
      unitType: ExecutionUnitType.LOCAL_OS,
      version: "1.0.0",
      namespacedTools: ["system.read_file"],
      requiredPermissions: [PermissionScope.FILE_SYSTEM_READ],
      requiredCapabilities: [ExecutionCapability.CAN_READ_FILE],
    });
  });

  const createMockPlanStep = (overrides: Partial<PlanStep> = {}): PlanStep => ({
    stepId: "step_01",
    sequenceIndex: 0,
    stepType: "TOOL_CALL" as any,
    targetTool: "browser.click",
    parameters: { selector: "#button" },
    dependencies: [],
    riskLevel: "LOW" as any,
    timeoutMs: 3000,
    preconditions: [],
    postconditions: [],
    ...overrides,
  });

  it("should resolve a target tool to its registered ExecutionUnit adapter", () => {
    const unitEntry = ExecutionResolver.resolveExecutionUnit("browser.click", registry);
    expect(unitEntry.unitId).toBe("browser_adapter");
    expect(unitEntry.metadata.unitType).toBe(ExecutionUnitType.BROWSER);
  });

  it("should throw ExecutionUnitResolutionError for unregistered target tools", () => {
    expect(() =>
      ExecutionResolver.resolveExecutionUnit("unregistered.tool", registry)
    ).toThrow(ExecutionUnitResolutionError);
  });

  it("should successfully bind parameters for a step", () => {
    const params = { url: "https://aether.os", timeout: 5000 };
    const bindingResult = ExecutionResolver.bindParameters(params, "step_01");

    expect(bindingResult.isBound).toBe(true);
    expect(bindingResult.boundParameters.url).toBe("https://aether.os");
    expect(bindingResult.bindings.length).toBe(2);
    expect(Object.isFrozen(bindingResult)).toBe(true);
  });

  it("should validate compatibility between unit metadata and execution environment", () => {
    const unitEntry = registry.getExecutionUnit("browser_adapter");
    const env = ExecutionResolver.resolveExecutionEnvironment({
      availablePermissions: [PermissionScope.BROWSER_AUTOMATION],
      activeCapabilities: [ExecutionCapability.CAN_CLICK, ExecutionCapability.CAN_NAVIGATE],
    });

    const report = ExecutionResolver.validateExecutionCompatibility(unitEntry, env);
    expect(report.isCompatible).toBe(true);
    expect(report.errors.length).toBe(0);
  });

  it("should report missing permissions or capabilities during compatibility check", () => {
    const unitEntry = registry.getExecutionUnit("browser_adapter");
    const restrictiveEnv = ExecutionResolver.resolveExecutionEnvironment({
      availablePermissions: [],
      activeCapabilities: [],
    });

    const report = ExecutionResolver.validateExecutionCompatibility(unitEntry, restrictiveEnv);
    expect(report.isCompatible).toBe(false);
    expect(report.missingPermissions).toContain(PermissionScope.BROWSER_AUTOMATION);
    expect(report.missingCapabilities).toContain(ExecutionCapability.CAN_CLICK);
  });

  it("should resolve a single step into an immutable ResolvedExecutionStep", () => {
    const step = createMockPlanStep();
    const resolvedStep = ExecutionResolver.resolveExecutionStep(step, registry);

    expect(resolvedStep.stepId).toBe("step_01");
    expect(resolvedStep.unitEntry.unitId).toBe("browser_adapter");
    expect(resolvedStep.descriptor.descriptorId).toBe("desc_step_01_0");
    expect(resolvedStep.descriptor.sandbox.sandboxId).toBe("sb_step_01");
    expect(Object.isFrozen(resolvedStep)).toBe(true);
    expect(Object.isFrozen(resolvedStep.descriptor)).toBe(true);
  });

  it("should throw ExecutionCompatibilityError when resolving a step in an incompatible environment", () => {
    const step = createMockPlanStep();
    const restrictiveEnv = ExecutionResolver.resolveExecutionEnvironment({
      availablePermissions: [],
      activeCapabilities: [],
    });

    expect(() =>
      ExecutionResolver.resolveExecutionStep(step, registry, restrictiveEnv)
    ).toThrow(ExecutionCompatibilityError);
  });

  it("should resolve a complete SecuredExecutionPlan into a ResolvedExecutionPlan", () => {
    const plan: SecuredExecutionPlan = {
      metadata: {
        planId: "plan_res_001",
        sessionId: "sess_01",
        turnId: "turn_01",
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + 60000,
        generatorVersion: "1.0.0",
        customMetadata: {},
      },
      primaryActionType: "EXECUTE_TOOL" as any,
      steps: [
        createMockPlanStep({ stepId: "step_01", targetTool: "browser.click" }),
        createMockPlanStep({ stepId: "step_02", sequenceIndex: 1, targetTool: "system.read_file" }),
      ],
      executionStages: [
        { stageIndex: 0, stepIds: ["step_01"] },
        { stageIndex: 1, stepIds: ["step_02"] },
      ],
      compositeRiskLevel: "LOW" as any,
      priority: "NORMAL" as any,
      requiresUserApproval: false,
      approvalRequirement: "AUTOMATIC_EXECUTION" as any,
      confidenceScore: 0.95,
      preconditions: [],
      postconditions: [],
    };

    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry);

    expect(resolvedPlan.planId).toBe("plan_res_001");
    expect(resolvedPlan.resolvedSteps.length).toBe(2);
    expect(resolvedPlan.resolvedSteps[0].unitEntry.unitId).toBe("browser_adapter");
    expect(resolvedPlan.resolvedSteps[1].unitEntry.unitId).toBe("fs_adapter");
    expect(Object.isFrozen(resolvedPlan)).toBe(true);
    expect(Object.isFrozen(resolvedPlan.resolvedSteps)).toBe(true);
  });
});
