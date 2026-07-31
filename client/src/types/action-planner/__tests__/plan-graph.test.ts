/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 4 Unit Tests: Plan Construction Engine & DAG Graph Builder (`plan-graph.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel } from "../enums";
import { PlanDependencyError, InvalidCandidatePlanError } from "../errors";
import { createPlanStep, createPlanDependency, createCandidatePlan } from "../factories";
import {
  buildPlanGraph,
  detectGraphCycles,
  computeTopologicalStages,
  constructExecutionPlan,
} from "../plan-graph";

describe("Phase 9.7 — Plan Construction Engine & Graph Builder (Milestone 4)", () => {
  describe("Graph Construction & In-Degree Calculation", () => {
    it("should build valid DAG node map with in-degrees for linear steps", () => {
      const step1 = createPlanStep({ stepId: "step_1", sequenceIndex: 0, targetTool: "t1" });
      const step2 = createPlanStep({
        stepId: "step_2",
        sequenceIndex: 1,
        targetTool: "t2",
        dependencies: [createPlanDependency({ stepId: "step_1" })],
      });

      const graph = buildPlanGraph([step1, step2]);
      expect(graph.size).toBe(2);
      expect(graph.get("step_1")?.inDegree).toBe(0);
      expect(graph.get("step_2")?.inDegree).toBe(1);
    });

    it("should throw PlanDependencyError for missing prerequisite reference", () => {
      const step = createPlanStep({
        stepId: "step_2",
        sequenceIndex: 0,
        targetTool: "t2",
        dependencies: [createPlanDependency({ stepId: "non_existent_step" })],
      });

      expect(() => buildPlanGraph([step])).toThrow(PlanDependencyError);
    });
  });

  describe("Cycle Detection & Topological Stage Scheduler", () => {
    it("should detect dependency cycle and throw PlanDependencyError", () => {
      const stepA = createPlanStep({
        stepId: "step_A",
        sequenceIndex: 0,
        targetTool: "tA",
        dependencies: [createPlanDependency({ stepId: "step_B" })],
      });

      const stepB = createPlanStep({
        stepId: "step_B",
        sequenceIndex: 1,
        targetTool: "tB",
        dependencies: [createPlanDependency({ stepId: "step_A" })],
      });

      const graph = buildPlanGraph([stepA, stepB]);
      expect(() => detectGraphCycles(graph)).toThrow(PlanDependencyError);
    });

    it("should compute topological stages correctly for parallelizable steps", () => {
      // step1 has no deps (Stage 0)
      const step1 = createPlanStep({ stepId: "step_1", sequenceIndex: 0, targetTool: "t1" });
      // step2 has no deps (Stage 0, parallel with step1)
      const step2 = createPlanStep({ stepId: "step_2", sequenceIndex: 1, targetTool: "t2" });
      // step3 depends on step1 and step2 (Stage 1)
      const step3 = createPlanStep({
        stepId: "step_3",
        sequenceIndex: 2,
        targetTool: "t3",
        dependencies: [
          createPlanDependency({ stepId: "step_1" }),
          createPlanDependency({ stepId: "step_2" }),
        ],
      });

      const stages = computeTopologicalStages([step1, step2, step3]);
      expect(stages).toHaveLength(2);
      expect(stages[0].stepIds).toEqual(["step_1", "step_2"]);
      expect(stages[1].stepIds).toEqual(["step_3"]);
      expect(Object.isFrozen(stages)).toBe(true);
    });
  });

  describe("constructExecutionPlan", () => {
    it("should transform a CandidatePlan into a deeply frozen ExecutionPlan", () => {
      const step = createPlanStep({ stepId: "step_chat", sequenceIndex: 0, targetTool: "chat.respond" });
      const candidate = createCandidatePlan({
        primaryActionType: ActionType.CHAT,
        candidateSteps: [step],
        estimatedConfidence: 0.95,
        rawRiskLevel: RiskLevel.LOW,
      });

      const plan = constructExecutionPlan(candidate);
      expect(plan.primaryActionType).toBe(ActionType.CHAT);
      expect(plan.steps).toHaveLength(1);
      expect(plan.executionStages).toHaveLength(1);
      expect(plan.confidenceScore).toBe(0.95);
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.executionStages)).toBe(true);
    });

    it("should throw InvalidCandidatePlanError for malformed candidate plan input", () => {
      expect(() => constructExecutionPlan(null as unknown as CandidatePlan)).toThrow(
        InvalidCandidatePlanError
      );
    });
  });
});
