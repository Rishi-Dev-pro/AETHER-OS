/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Boundary Validator (`boundary-validator.test.ts`)
 *
 * @file __tests__/boundary-validator.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { describe, it, expect } from "vitest";
import { BoundaryValidationStatus, PermissionScope, ExecutionLifecycleState } from "../enums";
import {
  BoundaryValidationError,
  PermissionDeniedError,
  PlanExpiredError,
  SchemaValidationError,
  ExecutionStateError,
} from "../errors";
import { ExecutionBoundaryValidator } from "../boundary-validator";
import { createExecutionBoundary } from "../factories";
import type { SecuredExecutionPlan } from "../contracts";

describe("Phase 9.8 — ExecutionBoundaryValidator Unit Tests", () => {
  const createMockPlan = (overrides: Partial<SecuredExecutionPlan> = {}): SecuredExecutionPlan => {
    return {
      metadata: {
        planId: "plan_test_001",
        sessionId: "sess_001",
        turnId: "turn_001",
        createdAtMs: Date.now() - 1000,
        expiresAtMs: Date.now() + 60000,
        generatorVersion: "1.0.0",
        customMetadata: {},
      },
      primaryActionType: "EXECUTE_TOOL" as any,
      steps: [
        {
          stepId: "step_01",
          sequenceIndex: 0,
          stepType: "TOOL_CALL" as any,
          targetTool: "browser.click",
          parameters: { selector: "#submit" },
          dependencies: [],
          riskLevel: "LOW" as any,
          timeoutMs: 5000,
          preconditions: [],
          postconditions: [],
        },
      ],
      executionStages: [
        {
          stageIndex: 0,
          stepIds: ["step_01"],
        },
      ],
      compositeRiskLevel: "LOW" as any,
      priority: "NORMAL" as any,
      requiresUserApproval: false,
      approvalRequirement: "AUTOMATIC_EXECUTION" as any,
      confidenceScore: 0.95,
      preconditions: [],
      postconditions: [],
      approvedPermissions: [PermissionScope.BROWSER_AUTOMATION],
      isApproved: true,
      ...overrides,
    };
  };

  it("should validate a structurally sound, non-expired, permitted execution plan", () => {
    const plan = createMockPlan();
    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan);

    expect(result.isValid).toBe(true);
    expect(result.status).toBe(BoundaryValidationStatus.VALID);
    expect(result.validationReport.errors.length).toBe(0);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("should reject an expired execution plan", () => {
    const expiredMs = 1000000;
    const plan = createMockPlan({
      metadata: {
        ...createMockPlan().metadata,
        expiresAtMs: expiredMs,
      },
    });

    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan, undefined, {
      currentTimestampMs: expiredMs + 5000,
    });

    expect(result.isValid).toBe(false);
    expect(result.status).toBe(BoundaryValidationStatus.EXPIRED);
    expect(result.validationReport.errors.some((e) => e.includes("expired"))).toBe(true);
  });

  it("should throw PlanExpiredError in strict mode for an expired plan", () => {
    const expiredMs = 1000000;
    const plan = createMockPlan({
      metadata: {
        ...createMockPlan().metadata,
        expiresAtMs: expiredMs,
      },
    });

    expect(() =>
      ExecutionBoundaryValidator.validateExecutionPlan(plan, undefined, {
        strict: true,
        currentTimestampMs: expiredMs + 5000,
      })
    ).toThrow(PlanExpiredError);
  });

  it("should reject an unapproved plan when user approval is required", () => {
    const plan = createMockPlan({
      requiresUserApproval: true,
      isApproved: false,
    });

    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(BoundaryValidationStatus.UNAPPROVED);
  });

  it("should reject a plan requesting permissions outside the boundary limit", () => {
    const plan = createMockPlan({
      approvedPermissions: [PermissionScope.SYSTEM_COMMAND],
    });

    const restrictiveBoundary = createExecutionBoundary({
      allowedPermissions: [PermissionScope.BROWSER_AUTOMATION],
    });

    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan, restrictiveBoundary);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(BoundaryValidationStatus.PERMISSION_DENIED);
  });

  it("should throw PermissionDeniedError in strict mode for permission violation", () => {
    const plan = createMockPlan({
      approvedPermissions: [PermissionScope.SYSTEM_COMMAND],
    });

    const restrictiveBoundary = createExecutionBoundary({
      allowedPermissions: [PermissionScope.BROWSER_AUTOMATION],
    });

    expect(() =>
      ExecutionBoundaryValidator.validateExecutionPlan(plan, restrictiveBoundary, { strict: true })
    ).toThrow(PermissionDeniedError);
  });

  it("should reject a plan exceeding the step count boundary", () => {
    const stepsArray = Array.from({ length: 60 }, (_, i) => ({
      stepId: `step_${i}`,
      sequenceIndex: i,
      stepType: "TOOL_CALL" as any,
      targetTool: "browser.click",
      parameters: {},
      dependencies: [],
      riskLevel: "LOW" as any,
      timeoutMs: 1000,
      preconditions: [],
      postconditions: [],
    }));

    const stages = [{ stageIndex: 0, stepIds: stepsArray.map((s) => s.stepId) }];
    const plan = createMockPlan({ steps: stepsArray, executionStages: stages });
    const result = ExecutionBoundaryValidator.validateExecutionPlan(plan);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe(BoundaryValidationStatus.INVALID_STRUCTURE);
  });

  it("should validate permission scopes correctly via validatePermissionScope()", () => {
    const isPermitted = ExecutionBoundaryValidator.validatePermissionScope(
      [PermissionScope.BROWSER_AUTOMATION, PermissionScope.FILE_SYSTEM_READ],
      [PermissionScope.BROWSER_AUTOMATION, PermissionScope.FILE_SYSTEM_READ, PermissionScope.FILE_SYSTEM_WRITE]
    );
    expect(isPermitted).toBe(true);

    const isDenied = ExecutionBoundaryValidator.validatePermissionScope(
      [PermissionScope.SYSTEM_COMMAND],
      [PermissionScope.BROWSER_AUTOMATION]
    );
    expect(isDenied).toBe(false);
  });

  it("should validate execution schema consistency via validateExecutionSchema()", () => {
    const validPlan = createMockPlan();
    expect(ExecutionBoundaryValidator.validateExecutionSchema(validPlan)).toBe(true);

    const invalidStagePlan = createMockPlan({
      executionStages: [
        {
          stageIndex: 0,
          stepIds: ["non_existent_step_id"],
        },
      ],
    });
    expect(ExecutionBoundaryValidator.validateExecutionSchema(invalidStagePlan)).toBe(false);
  });

  it("should validate lifecycle state transitions via validateExecutionLifecycle()", () => {
    expect(
      ExecutionBoundaryValidator.validateExecutionLifecycle(
        ExecutionLifecycleState.CREATED,
        ExecutionLifecycleState.INITIALIZED
      )
    ).toBe(true);

    expect(
      ExecutionBoundaryValidator.validateExecutionLifecycle(
        ExecutionLifecycleState.CREATED,
        ExecutionLifecycleState.FINALIZING
      )
    ).toBe(false);
  });

  it("should assert valid lifecycle transition or throw ExecutionStateError", () => {
    expect(() =>
      ExecutionBoundaryValidator.assertLifecycleTransition(
        ExecutionLifecycleState.CREATED,
        ExecutionLifecycleState.FINALIZING
      )
    ).toThrow(ExecutionStateError);
  });
});
