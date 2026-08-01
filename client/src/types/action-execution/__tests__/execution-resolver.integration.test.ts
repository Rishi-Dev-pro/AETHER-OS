/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Resolver Integration & Registry Freeze Compatibility (`execution-resolver.integration.test.ts`)
 *
 * @file __tests__/execution-resolver.integration.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 3
 */

import { describe, it, expect } from "vitest";
import { ExecutionUnitType, PermissionScope, ExecutionCapability } from "../enums";
import { ExecutionRegistry } from "../execution-registry";
import { ExecutionResolver } from "../execution-resolver";
import type { SecuredExecutionPlan } from "../contracts";

describe("Phase 9.8 — ExecutionResolver Integration & Freeze Compatibility", () => {
  const createSeededRegistry = (): ExecutionRegistry => {
    const registry = new ExecutionRegistry();

    registry.registerExecutionUnit({
      unitId: "adapter.browser.v1",
      unitType: ExecutionUnitType.BROWSER,
      version: "1.0.0",
      namespacedTools: ["browser.navigate", "browser.click"],
      requiredPermissions: [PermissionScope.BROWSER_AUTOMATION],
      requiredCapabilities: [ExecutionCapability.CAN_NAVIGATE, ExecutionCapability.CAN_CLICK],
    });

    registry.registerExecutionUnit({
      unitId: "adapter.mcp.v1",
      unitType: ExecutionUnitType.MCP,
      version: "1.0.0",
      namespacedTools: ["mcp.fs.read_file"],
      requiredPermissions: [PermissionScope.MCP_INVOCATION, PermissionScope.FILE_SYSTEM_READ],
      requiredCapabilities: [ExecutionCapability.CAN_INVOKE_MCP, ExecutionCapability.CAN_READ_FILE],
    });

    return registry;
  };

  const createIntegrationPlan = (): SecuredExecutionPlan => ({
    metadata: {
      planId: "plan_integration_99",
      sessionId: "session_01",
      turnId: "turn_01",
      createdAtMs: 1700000000000,
      expiresAtMs: 1700000060000,
      generatorVersion: "1.0.0",
      customMetadata: {},
    },
    primaryActionType: "EXECUTE_TOOL" as any,
    steps: [
      {
        stepId: "step_nav",
        sequenceIndex: 0,
        stepType: "TOOL_CALL" as any,
        targetTool: "browser.navigate",
        parameters: { url: "https://aether.os" },
        dependencies: [],
        riskLevel: "LOW" as any,
        timeoutMs: 8000,
        preconditions: [],
        postconditions: [],
      },
      {
        stepId: "step_read",
        sequenceIndex: 1,
        stepType: "TOOL_CALL" as any,
        targetTool: "mcp.fs.read_file",
        parameters: { path: "/workspace/config.json" },
        dependencies: [{ stepId: "step_nav", dependencyType: "STRICT" }],
        riskLevel: "LOW" as any,
        timeoutMs: 4000,
        preconditions: [],
        postconditions: [],
      },
    ],
    executionStages: [
      { stageIndex: 0, stepIds: ["step_nav"] },
      { stageIndex: 1, stepIds: ["step_read"] },
    ],
    compositeRiskLevel: "LOW" as any,
    priority: "NORMAL" as any,
    requiresUserApproval: false,
    approvalRequirement: "AUTOMATIC_EXECUTION" as any,
    confidenceScore: 0.99,
    preconditions: [],
    postconditions: [],
  });

  it("should resolve a plan against a frozen ExecutionRegistry without mutating state", () => {
    const registry = createSeededRegistry();
    registry.freezeRegistry();
    expect(registry.isRegistryFrozen()).toBe(true);

    const plan = createIntegrationPlan();
    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry);

    expect(resolvedPlan.planId).toBe("plan_integration_99");
    expect(resolvedPlan.resolvedSteps.length).toBe(2);
    expect(resolvedPlan.resolvedSteps[0].unitEntry.unitId).toBe("adapter.browser.v1");
    expect(resolvedPlan.resolvedSteps[1].unitEntry.unitId).toBe("adapter.mcp.v1");
  });

  it("should guarantee 100% deterministic descriptor output across 100 resolution iterations", () => {
    const registry = createSeededRegistry();
    registry.freezeRegistry();
    const plan = createIntegrationPlan();

    const initialResolved = ExecutionResolver.resolveExecutionPlan(plan, registry);

    for (let i = 0; i < 100; i++) {
      const replayed = ExecutionResolver.resolveExecutionPlan(plan, registry);

      expect(replayed.planId).toBe(initialResolved.planId);
      expect(replayed.resolvedSteps.length).toBe(initialResolved.resolvedSteps.length);
      expect(replayed.resolvedSteps[0].descriptor.descriptorId).toBe(
        initialResolved.resolvedSteps[0].descriptor.descriptorId
      );
      expect(replayed.resolvedSteps[0].unitEntry.unitId).toBe(
        initialResolved.resolvedSteps[0].unitEntry.unitId
      );
    }
  });

  it("should output fully frozen resolved descriptors", () => {
    const registry = createSeededRegistry();
    const plan = createIntegrationPlan();

    const resolvedPlan = ExecutionResolver.resolveExecutionPlan(plan, registry);

    expect(Object.isFrozen(resolvedPlan)).toBe(true);
    expect(Object.isFrozen(resolvedPlan.resolvedSteps)).toBe(true);
    expect(Object.isFrozen(resolvedPlan.resolvedSteps[0].descriptor)).toBe(true);
    expect(Object.isFrozen(resolvedPlan.resolvedSteps[0].descriptor.parameters)).toBe(true);
    expect(Object.isFrozen(resolvedPlan.resolvedSteps[0].descriptor.sandbox)).toBe(true);
  });
});
