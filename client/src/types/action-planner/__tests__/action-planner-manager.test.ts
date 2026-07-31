/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 6 Unit Tests: Action Planner Manager Orchestrator (`action-planner-manager.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel } from "../enums";
import { ActionPlannerManager, planAction } from "../action-planner-manager";
import type { IntentResult } from "../../intent";

describe("Phase 9.7 — Action Planner Manager Orchestrator (Milestone 6)", () => {
  it("should orchestrate default context input through all 4 modules and emit deeply frozen result", () => {
    const result = planAction();

    expect(result.normalizedContext).toBeDefined();
    expect(result.candidatePlan.primaryActionType).toBe(ActionType.NO_ACTION);
    expect(result.structuralPlan.primaryActionType).toBe(ActionType.NO_ACTION);
    expect(result.securedPlan.compositeRiskLevel).toBe(RiskLevel.LOW);

    expect(result.diagnostics.success).toBe(true);
    expect(result.diagnostics.checkpoints).toHaveLength(4);
    expect(result.diagnostics.moduleSequence).toEqual([
      "ContextNormalizer",
      "CandidateResolver",
      "PlanConstructionEngine",
      "PlanSafetyLayer",
    ]);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    expect(Object.isFrozen(result.securedPlan)).toBe(true);
  });

  it("should execute ActionPlannerManager class instance methods cleanly", () => {
    const manager = new ActionPlannerManager();
    const mockIntent: IntentResult = {
      intentId: "int_mgr_1",
      timestamp: Date.now(),
      category: "dialogue",
      domain: "chat",
      intent: "greeting",
      confidence: 0.95,
      entities: [],
      parameters: {},
      needsClarification: false,
    };

    const result = manager.executePipeline({ intentResult: mockIntent });
    expect(result.candidatePlan.primaryActionType).toBe(ActionType.CHAT);
    expect(result.securedPlan.steps[0].targetTool).toBe("chat.respond");
    expect(Object.isFrozen(result)).toBe(true);
  });
});
