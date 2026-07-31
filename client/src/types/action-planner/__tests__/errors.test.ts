/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 1 Unit Tests: Error Hierarchy (`errors.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ActionPlannerError,
  InvalidPlanningContextError,
  InvalidExecutionPlanError,
  InvalidCandidatePlanError,
  PlanDependencyError,
  PlanningPolicyError,
  PlanConstructionError,
} from "../errors";

describe("Phase 9.7 — Action Planning Layer Error Hierarchy", () => {
  it("should instantiate base ActionPlannerError with code and timestamp", () => {
    const error = new ActionPlannerError("Base error message");
    expect(error.name).toBe("ActionPlannerError");
    expect(error.message).toBe("Base error message");
    expect(error.code).toBe("ACTION_PLANNER_ERROR");
    expect(error.timestampMs).toBeGreaterThan(0);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ActionPlannerError).toBe(true);
  });

  it("should freeze error details dictionary", () => {
    const details = { key: "value" };
    const error = new ActionPlannerError("Error with details", "CUSTOM_CODE", details);
    expect(error.details).toBeDefined();
    expect(error.details?.key).toBe("value");
    expect(Object.isFrozen(error.details)).toBe(true);
  });

  it("should verify inheritance and codes for specific domain errors", () => {

    const err1 = new InvalidPlanningContextError("Bad context");
    expect(err1.code).toBe("INVALID_PLANNING_CONTEXT");
    expect(err1 instanceof ActionPlannerError).toBe(true);

    const err2 = new InvalidExecutionPlanError("Bad plan");
    expect(err2.code).toBe("INVALID_EXECUTION_PLAN");
    expect(err2 instanceof ActionPlannerError).toBe(true);

    const err3 = new InvalidCandidatePlanError("Bad candidate");
    expect(err3.code).toBe("INVALID_CANDIDATE_PLAN");
    expect(err3 instanceof ActionPlannerError).toBe(true);

    const err4 = new PlanDependencyError("Cycle detected");
    expect(err4.code).toBe("PLAN_DEPENDENCY_ERROR");
    expect(err4 instanceof ActionPlannerError).toBe(true);

    const err5 = new PlanningPolicyError("Policy breach");
    expect(err5.code).toBe("PLANNING_POLICY_ERROR");
    expect(err5 instanceof ActionPlannerError).toBe(true);

    const err6 = new PlanConstructionError("Construction error");
    expect(err6.code).toBe("PLAN_CONSTRUCTION_ERROR");
    expect(err6 instanceof ActionPlannerError).toBe(true);
  });
});
