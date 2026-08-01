/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Canonical Enums (`enums.test.ts`)
 *
 * @file __tests__/enums.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { describe, it, expect } from "vitest";
import {
  ExecutionStatus,
  ExecutionState,
  BoundaryValidationStatus,
  ExecutionFailureReason,
  PermissionScope,
  ExecutionCapability,
  DependencyPolicy,
  ExecutionUnitType,
  ExecutionLifecycleState,
} from "../enums";

describe("Phase 9.8 — Canonical Enums", () => {
  it("should have intact ExecutionStatus values", () => {
    expect(ExecutionStatus.UNINITIALIZED).toBe("UNINITIALIZED");
    expect(ExecutionStatus.COMPLETED).toBe("COMPLETED");
    expect(ExecutionStatus.FAILED).toBe("FAILED");
    expect(ExecutionStatus.BOUNDARY_VIOLATION).toBe("BOUNDARY_VIOLATION");
    expect(ExecutionStatus.ROLLED_BACK).toBe("ROLLED_BACK");
  });

  it("should have intact ExecutionState values", () => {
    expect(ExecutionState.IDLE).toBe("IDLE");
    expect(ExecutionState.RUNNING).toBe("RUNNING");
    expect(ExecutionState.COMPLETED).toBe("COMPLETED");
    expect(ExecutionState.FAULTED).toBe("FAULTED");
  });

  it("should have intact BoundaryValidationStatus values", () => {
    expect(BoundaryValidationStatus.VALID).toBe("VALID");
    expect(BoundaryValidationStatus.EXPIRED).toBe("EXPIRED");
    expect(BoundaryValidationStatus.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
    expect(BoundaryValidationStatus.INVALID_SCHEMA).toBe("INVALID_SCHEMA");
  });

  it("should have intact ExecutionFailureReason values", () => {
    expect(ExecutionFailureReason.PRECONDITION_FAILED).toBe("PRECONDITION_FAILED");
    expect(ExecutionFailureReason.STEP_TIMEOUT).toBe("STEP_TIMEOUT");
    expect(ExecutionFailureReason.BOUNDARY_VALIDATION_FAILED).toBe("BOUNDARY_VALIDATION_FAILED");
  });

  it("should have intact PermissionScope values", () => {
    expect(PermissionScope.BROWSER_AUTOMATION).toBe("BROWSER_AUTOMATION");
    expect(PermissionScope.DESKTOP_AUTOMATION).toBe("DESKTOP_AUTOMATION");
    expect(PermissionScope.FILE_SYSTEM_READ).toBe("FILE_SYSTEM_READ");
    expect(PermissionScope.MCP_INVOCATION).toBe("MCP_INVOCATION");
  });

  it("should have intact ExecutionCapability values", () => {
    expect(ExecutionCapability.CAN_CLICK).toBe("CAN_CLICK");
    expect(ExecutionCapability.CAN_READ_FILE).toBe("CAN_READ_FILE");
    expect(ExecutionCapability.CAN_EXECUTE_CLI).toBe("CAN_EXECUTE_CLI");
  });

  it("should have intact DependencyPolicy values", () => {
    expect(DependencyPolicy.STRICT).toBe("STRICT");
    expect(DependencyPolicy.OPTIONAL).toBe("OPTIONAL");
  });

  it("should have intact ExecutionUnitType values", () => {
    expect(ExecutionUnitType.BROWSER).toBe("BROWSER");
    expect(ExecutionUnitType.DESKTOP).toBe("DESKTOP");
    expect(ExecutionUnitType.MCP).toBe("MCP");
  });

  it("should have intact ExecutionLifecycleState values", () => {
    expect(ExecutionLifecycleState.CREATED).toBe("CREATED");
    expect(ExecutionLifecycleState.VALIDATING).toBe("VALIDATING");
    expect(ExecutionLifecycleState.DISPATCHING).toBe("DISPATCHING");
    expect(ExecutionLifecycleState.TERMINATED).toBe("TERMINATED");
  });
});
