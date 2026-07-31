/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 4 Integration Tests: Plan Graph Construction & Deterministic Replay (`plan-graph-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel } from "../enums";
import { createPlanStep, createPlanDependency, createCandidatePlan } from "../factories";
import { constructExecutionPlan } from "../plan-graph";

describe("Phase 9.7 — Plan Graph Integration & Replay", () => {
  it("should construct multi-stage ExecutionPlan from CandidatePlan deterministically across replay runs", () => {
    const step1 = createPlanStep({ stepId: "step_open", sequenceIndex: 0, targetTool: "browser.openUrl" });
    const step2 = createPlanStep({
      stepId: "step_search",
      sequenceIndex: 1,
      targetTool: "browser.search",
      dependencies: [createPlanDependency({ stepId: "step_open" })],
    });

    const candidate = createCandidatePlan({
      candidateId: "cand_auto_100",
      primaryActionType: ActionType.AUTOMATION,
      candidateSteps: [step1, step2],
      estimatedConfidence: 0.9,
      rawRiskLevel: RiskLevel.MEDIUM,
    });

    const plan1 = constructExecutionPlan(candidate);
    const plan2 = constructExecutionPlan(candidate);

    expect(plan1.metadata.planId).toBe(plan2.metadata.planId);
    expect(plan1.primaryActionType).toBe(plan2.primaryActionType);
    expect(plan1.steps).toEqual(plan2.steps);
    expect(plan1.executionStages).toEqual(plan2.executionStages);
    expect(plan1.executionStages).toHaveLength(2);
    expect(plan1.executionStages[0].stepIds).toEqual(["step_open"]);
    expect(plan1.executionStages[1].stepIds).toEqual(["step_search"]);
    expect(Object.isFrozen(plan1)).toBe(true);
  });
});
