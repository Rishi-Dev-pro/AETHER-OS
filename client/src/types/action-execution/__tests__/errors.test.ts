/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Test Suite: Execution Domain Exception Hierarchy (`errors.test.ts`)
 *
 * @file __tests__/errors.test.ts
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 1
 */

import { describe, it, expect } from "vitest";
import {
  ExecutionError,
  BoundaryValidationError,
  PermissionDeniedError,
  PlanExpiredError,
  SchemaValidationError,
  ExecutionContractError,
  RegistryFrozenError,
  ExecutionStateError,
} from "../errors";

describe("Phase 9.8 — Exception Hierarchy", () => {
  it("should correctly instantiate ExecutionError base class", () => {
    const err = new ExecutionError("Generic failure", "ERR_GENERIC", { key: "val" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err.message).toBe("Generic failure");
    expect(err.code).toBe("ERR_GENERIC");
    expect(err.metadata.key).toBe("val");
    expect(Object.isFrozen(err.metadata)).toBe(true);
    expect(typeof err.timestampMs).toBe("number");
  });

  it("should correctly instantiate BoundaryValidationError", () => {
    const err = new BoundaryValidationError("Invalid boundary", { planId: "p1" });
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(BoundaryValidationError);
    expect(err.code).toBe("ERR_BOUNDARY_VALIDATION");
    expect(err.metadata.planId).toBe("p1");
    expect(Object.isFrozen(err.metadata)).toBe(true);
  });

  it("should correctly instantiate PermissionDeniedError", () => {
    const err = new PermissionDeniedError("Permission denied");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(PermissionDeniedError);
    expect(err.code).toBe("ERR_PERMISSION_DENIED");
  });

  it("should correctly instantiate PlanExpiredError", () => {
    const err = new PlanExpiredError("Plan expired");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(PlanExpiredError);
    expect(err.code).toBe("ERR_PLAN_EXPIRED");
  });

  it("should correctly instantiate SchemaValidationError", () => {
    const err = new SchemaValidationError("Schema invalid");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(SchemaValidationError);
    expect(err.code).toBe("ERR_SCHEMA_VALIDATION");
  });

  it("should correctly instantiate ExecutionContractError", () => {
    const err = new ExecutionContractError("Contract invariant broken");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(ExecutionContractError);
    expect(err.code).toBe("ERR_EXECUTION_CONTRACT");
  });

  it("should correctly instantiate RegistryFrozenError", () => {
    const err = new RegistryFrozenError("Registry is read-only");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(RegistryFrozenError);
    expect(err.code).toBe("ERR_REGISTRY_FROZEN");
  });

  it("should correctly instantiate ExecutionStateError", () => {
    const err = new ExecutionStateError("Illegal state transition");
    expect(err).toBeInstanceOf(ExecutionError);
    expect(err).toBeInstanceOf(ExecutionStateError);
    expect(err.code).toBe("ERR_EXECUTION_STATE");
  });
});
