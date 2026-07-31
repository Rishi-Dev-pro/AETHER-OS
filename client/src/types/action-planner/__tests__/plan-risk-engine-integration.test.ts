/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 5 Integration Tests: Plan Safety Integration & Deterministic Replay (`plan-risk-engine-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel } from "../enums";
import { createPlanStep, createCandidatePlan, createPlanningPolicy } from "../factories";
import { constructExecutionPlan } from "../plan-graph";
import { evaluatePlanSafety } from "../plan-risk-engine";

describe("Phase 9.7 — Plan Safety Layer Integration & Replay", () => {
  it("should generate bit-for-bit identical safety metadata across repeated replay runs", () => {
    const step1 = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "browser.openUrl" });
    const step2 = createPlanStep({ stepId: "s2", sequenceIndex: 1, targetTool: "system.writeFile" });

    const candidate = createCandidatePlan({
      candidateId: "cand_sec_100",
      primaryActionType: ActionType.AUTOMATION,
      candidateSteps: [step1, step2],
      rawRiskLevel: RiskLevel.HIGH,
    });

    const structuralPlan = constructExecutionPlan(candidate);
    const policy = createPlanningPolicy();

    const secured1 = evaluatePlanSafety(structuralPlan, policy);
    const secured2 = evaluatePlanSafety(structuralPlan, policy);

    expect(secured1.compositeRiskLevel).toBe(secured2.compositeRiskLevel);
    expect(secured1.requiresUserApproval).toBe(secured2.requiresUserApproval);
    expect(secured1.approvalRequirement).toBe(secured2.approvalRequirement);
    expect(secured1.userConfirmationPrompt).toBe(secured2.userConfirmationPrompt);
    expect(Object.isFrozen(secured1)).toBe(true);
    expect(Object.isFrozen(secured2)).toBe(true);
  });
});
