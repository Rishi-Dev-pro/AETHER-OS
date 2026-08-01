/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Boundary Validator Integration & Replay Determinism (`boundary-validator.integration.test.ts`)
 *
 * @file __tests__/boundary-validator.integration.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { describe, it, expect } from "vitest";
import { BoundaryValidationStatus, PermissionScope, ExecutionLifecycleState } from "../enums";
import { ExecutionBoundaryValidator } from "../boundary-validator";
import { createExecutionBoundary } from "../factories";
import type { SecuredExecutionPlan } from "../contracts";

describe("Phase 9.8 — ExecutionBoundaryValidator Integration & Determinism", () => {
  const createPhase97MockOutput = (): SecuredExecutionPlan => {
    return {
      metadata: {
        planId: "plan_p97_e2e_88492",
        sessionId: "session_user_4491",
        turnId: "turn_9921",
        createdAtMs: 1700000000000,
        expiresAtMs: 1700000300000,
        generatorVersion: "9.7.0",
        customMetadata: { source: "ActionPlannerManager" },
      },
      primaryActionType: "EXECUTE_TOOL" as any,
      steps: [
        {
          stepId: "step_nav_01",
          sequenceIndex: 0,
          stepType: "TOOL_CALL" as any,
          targetTool: "browser.navigate",
          parameters: { url: "https://aether.os/dashboard" },
          dependencies: [],
          riskLevel: "LOW" as any,
          timeoutMs: 10000,
          preconditions: [],
          postconditions: [],
        },
        {
          stepId: "step_read_02",
          sequenceIndex: 1,
          stepType: "TOOL_CALL" as any,
          targetTool: "system.read_file",
          parameters: { path: "/appDataDir/brain/stats.json" },
          dependencies: [{ stepId: "step_nav_01", dependencyType: "STRICT" }],
          riskLevel: "LOW" as any,
          timeoutMs: 5000,
          preconditions: [],
          postconditions: [],
        },
      ],
      executionStages: [
        {
          stageIndex: 0,
          stepIds: ["step_nav_01"],
        },
        {
          stageIndex: 1,
          stepIds: ["step_read_02"],
        },
      ],
      compositeRiskLevel: "LOW" as any,
      priority: "NORMAL" as any,
      requiresUserApproval: false,
      approvalRequirement: "AUTOMATIC_EXECUTION" as any,
      confidenceScore: 0.98,
      preconditions: [],
      postconditions: [],
      integrityHash: "sha256:a1b2c3d4e5f6...",
      authorizationToken: "auth_token_994821",
      approvedPermissions: [PermissionScope.BROWSER_AUTOMATION, PermissionScope.FILE_SYSTEM_READ],
      isApproved: true,
    };
  };

  it("should successfully validate realistic Phase 9.7 plan outputs", () => {
    const plan = createPhase97MockOutput();
    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan, undefined, {
      currentTimestampMs: 1700000005000,
    });

    expect(result.isValid).toBe(true);
    expect(result.status).toBe(BoundaryValidationStatus.VALID);
    expect(result.validationReport.planId).toBe("plan_p97_e2e_88492");
    expect(result.validationReport.errors.length).toBe(0);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.validationReport)).toBe(true);
  });

  it("should guarantee 100% deterministic validation reports across 100 consecutive iterations", () => {
    const plan = createPhase97MockOutput();
    const fixedTimestampMs = 1700000010000;

    const initialResult = ExecutionBoundaryValidator.validateExecutionPlan(plan, undefined, {
      currentTimestampMs: fixedTimestampMs,
    });

    for (let i = 0; i < 100; i++) {
      const replayedResult = ExecutionBoundaryValidator.validateExecutionPlan(plan, undefined, {
        currentTimestampMs: fixedTimestampMs,
      });

      expect(replayedResult.isValid).toBe(initialResult.isValid);
      expect(replayedResult.status).toBe(initialResult.status);
      expect(replayedResult.validationReport.status).toBe(initialResult.validationReport.status);
      expect(replayedResult.validationReport.errors).toEqual(initialResult.validationReport.errors);
      expect(replayedResult.validationReport.evaluatedRulesCount).toBe(
        initialResult.validationReport.evaluatedRulesCount
      );
    }
  });

  it("should maintain immutable report contracts under property mutation attempts", () => {
    const plan = createPhase97MockOutput();
    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan);

    expect(() => {
      (result as any).isValid = false;
    }).toThrow(TypeError);

    expect(() => {
      (result.validationReport as any).planId = "hacked_id";
    }).toThrow(TypeError);

    expect(() => {
      (result.validationReport.errors as any).push("fake error");
    }).toThrow(TypeError);
  });

  it("should correctly handle lifecycle FSM transition sequences end-to-end", () => {
    const lifecycleChain = [
      ExecutionLifecycleState.CREATED,
      ExecutionLifecycleState.INITIALIZED,
      ExecutionLifecycleState.VALIDATING,
      ExecutionLifecycleState.PRECONDITION_CHECK,
      ExecutionLifecycleState.DISPATCHING,
      ExecutionLifecycleState.POSTCONDITION_CHECK,
      ExecutionLifecycleState.FINALIZING,
      ExecutionLifecycleState.TERMINATED,
    ];

    for (let i = 0; i < lifecycleChain.length - 1; i++) {
      const fromState = lifecycleChain[i];
      const toState = lifecycleChain[i + 1];
      expect(ExecutionBoundaryValidator.validateExecutionLifecycle(fromState, toState)).toBe(true);
      expect(() => ExecutionBoundaryValidator.assertLifecycleTransition(fromState, toState)).not.toThrow();
    }
  });
});
