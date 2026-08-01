/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Factory Constructors (`factories.test.ts`)
 *
 * @file __tests__/factories.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { describe, it, expect } from "vitest";
import { ExecutionStatus, BoundaryValidationStatus, PermissionScope, ExecutionCapability } from "../enums";
import { ExecutionContractError } from "../errors";
import {
  deepFreeze,
  createExecutionMetadata,
  createExecutionStepResult,
  createExecutionResult,
  createExecutionBoundary,
  createExecutionPermission,
  createExecutionValidationReport,
  createExecutionBoundaryResult,
  createExecutionSandbox,
} from "../factories";

describe("Phase 9.8 — Factory Constructors & Immutability", () => {
  it("should deepFreeze objects recursively", () => {
    const mutableObj = {
      a: 1,
      nested: { b: 2, list: [1, 2, 3] },
    };
    const frozen = deepFreeze(mutableObj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested.list)).toBe(true);
    expect(() => {
      (frozen as any).a = 99;
    }).toThrow();
  });

  it("should construct valid ExecutionMetadata and enforce immutability", () => {
    const meta = createExecutionMetadata({
      executionId: "exec_1",
      planId: "plan_1",
      sessionId: "sess_1",
      turnId: "turn_1",
      engineTimeMs: 2,
      toolTimeMs: 15,
    });

    expect(meta.executionId).toBe("exec_1");
    expect(meta.engineTimeMs).toBe(2);
    expect(meta.toolTimeMs).toBe(15);
    expect(Object.isFrozen(meta)).toBe(true);
  });

  it("should throw ExecutionContractError on missing metadata required fields", () => {
    expect(() =>
      createExecutionMetadata({
        executionId: "",
        planId: "p",
        sessionId: "s",
        turnId: "t",
      })
    ).toThrow(ExecutionContractError);
  });

  it("should construct valid ExecutionStepResult", () => {
    const stepRes = createExecutionStepResult({
      stepId: "step_1",
      sequenceIndex: 0,
      targetTool: "browser.click",
      status: ExecutionStatus.COMPLETED,
      outputData: { clicked: true },
    });

    expect(stepRes.stepId).toBe("step_1");
    expect(stepRes.sequenceIndex).toBe(0);
    expect(stepRes.status).toBe(ExecutionStatus.COMPLETED);
    expect(Object.isFrozen(stepRes)).toBe(true);
    expect(Object.isFrozen(stepRes.outputData)).toBe(true);
  });

  it("should construct valid ExecutionResult", () => {
    const meta = createExecutionMetadata({
      executionId: "exec_1",
      planId: "plan_1",
      sessionId: "sess_1",
      turnId: "turn_1",
    });

    const execRes = createExecutionResult({
      metadata: meta,
      status: ExecutionStatus.COMPLETED,
      stepResults: [],
    });

    expect(execRes.status).toBe(ExecutionStatus.COMPLETED);
    expect(Object.isFrozen(execRes)).toBe(true);
    expect(Object.isFrozen(execRes.stepResults)).toBe(true);
  });

  it("should construct valid ExecutionBoundary", () => {
    const boundary = createExecutionBoundary({
      maxSteps: 20,
      allowedPermissions: [PermissionScope.BROWSER_AUTOMATION],
    });

    expect(boundary.maxSteps).toBe(20);
    expect(boundary.allowedPermissions).toEqual([PermissionScope.BROWSER_AUTOMATION]);
    expect(Object.isFrozen(boundary)).toBe(true);
  });

  it("should construct valid ExecutionPermission", () => {
    const perm = createExecutionPermission(PermissionScope.FILE_SYSTEM_READ, true, "/appDataDir/*");
    expect(perm.scope).toBe(PermissionScope.FILE_SYSTEM_READ);
    expect(perm.isGranted).toBe(true);
    expect(perm.resourceFilter).toBe("/appDataDir/*");
    expect(Object.isFrozen(perm)).toBe(true);
  });

  it("should construct valid ExecutionValidationReport and ExecutionBoundaryResult", () => {
    const report = createExecutionValidationReport({
      planId: "plan_123",
      status: BoundaryValidationStatus.VALID,
    });

    const boundRes = createExecutionBoundaryResult(report);

    expect(boundRes.isValid).toBe(true);
    expect(boundRes.status).toBe(BoundaryValidationStatus.VALID);
    expect(boundRes.validationReport.planId).toBe("plan_123");
    expect(Object.isFrozen(boundRes)).toBe(true);
    expect(Object.isFrozen(boundRes.validationReport)).toBe(true);
  });

  it("should construct valid ExecutionSandbox", () => {
    const sandbox = createExecutionSandbox({
      sandboxId: "sb_1",
      stepId: "step_1",
      timeoutMs: 3000,
      allowedCapabilities: [ExecutionCapability.CAN_CLICK],
    });

    expect(sandbox.sandboxId).toBe("sb_1");
    expect(sandbox.timeoutMs).toBe(3000);
    expect(sandbox.isFrozen).toBe(true);
    expect(Object.isFrozen(sandbox)).toBe(true);
  });
});
