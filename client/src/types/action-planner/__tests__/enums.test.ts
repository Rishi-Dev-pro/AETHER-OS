/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 1 Unit Tests: Domain Enumerations (`enums.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel, PlanPriority, StepType, ApprovalRequirement } from "../enums";

describe("Phase 9.7 — Action Planning Layer Enums", () => {
  it("should define correct values for ActionType enum", () => {
    expect(ActionType.CHAT).toBe("CHAT");
    expect(ActionType.TOOL).toBe("TOOL");
    expect(ActionType.AUTOMATION).toBe("AUTOMATION");
    expect(ActionType.ASK_CLARIFICATION).toBe("ASK_CLARIFICATION");
    expect(ActionType.NO_ACTION).toBe("NO_ACTION");
    expect(Object.keys(ActionType).length).toBe(5);
  });

  it("should define correct values for RiskLevel enum", () => {
    expect(RiskLevel.LOW).toBe("LOW");
    expect(RiskLevel.MEDIUM).toBe("MEDIUM");
    expect(RiskLevel.HIGH).toBe("HIGH");
    expect(RiskLevel.CRITICAL).toBe("CRITICAL");
    expect(Object.keys(RiskLevel).length).toBe(4);
  });

  it("should define correct values for PlanPriority enum", () => {
    expect(PlanPriority.LOW).toBe("LOW");
    expect(PlanPriority.NORMAL).toBe("NORMAL");
    expect(PlanPriority.HIGH).toBe("HIGH");
    expect(PlanPriority.URGENT).toBe("URGENT");
    expect(Object.keys(PlanPriority).length).toBe(4);
  });

  it("should define correct values for StepType enum", () => {
    expect(StepType.ATOMIC_TOOL).toBe("ATOMIC_TOOL");
    expect(StepType.CONDITION_CHECK).toBe("CONDITION_CHECK");
    expect(StepType.CLARIFICATION_PROMPT).toBe("CLARIFICATION_PROMPT");
    expect(StepType.AUTOMATION_SUBSTAGE).toBe("AUTOMATION_SUBSTAGE");
    expect(Object.keys(StepType).length).toBe(4);
  });

  it("should define correct values for ApprovalRequirement enum", () => {
    expect(ApprovalRequirement.NONE).toBe("NONE");
    expect(ApprovalRequirement.OPTIONAL).toBe("OPTIONAL");
    expect(ApprovalRequirement.MANDATORY).toBe("MANDATORY");
    expect(ApprovalRequirement.STRICT_CONFIRMATION).toBe("STRICT_CONFIRMATION");
    expect(Object.keys(ApprovalRequirement).length).toBe(4);
  });
});
