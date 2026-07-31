/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 1 Unit Tests: Immutable Factory Constructors (`factories.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel, PlanPriority, StepType, ApprovalRequirement } from "../enums";
import { PlanConstructionError } from "../errors";
import {
  createPlanMetadata,
  createPlanDependency,
  createPlanPrecondition,
  createPlanPostcondition,
  createPlanStep,
  createCandidatePlan,
  createPlanningPolicy,
  createPlanningContext,
  createExecutionStage,
  createExecutionPlan,
} from "../factories";

describe("Phase 9.7 — Action Planning Layer Factory Constructors", () => {
  describe("createPlanMetadata", () => {
    it("should construct valid metadata with default values and deep freeze", () => {
      const metadata = createPlanMetadata();
      expect(metadata.planId).toBeDefined();
      expect(metadata.sessionId).toBeDefined();
      expect(metadata.turnId).toBeDefined();
      expect(metadata.createdAtMs).toBeGreaterThan(0);
      expect(metadata.expiresAtMs).toBeGreaterThan(metadata.createdAtMs);
      expect(Object.isFrozen(metadata)).toBe(true);
    });

    it("should throw PlanConstructionError if expiresAtMs <= createdAtMs", () => {
      expect(() => createPlanMetadata({ createdAtMs: 1000, expiresAtMs: 500 })).toThrow(
        PlanConstructionError
      );
    });
  });

  describe("createPlanDependency", () => {
    it("should construct valid dependency and freeze it", () => {
      const dep = createPlanDependency({ stepId: "step_1", dependencyType: "STRICT" });
      expect(dep.stepId).toBe("step_1");
      expect(dep.dependencyType).toBe("STRICT");
      expect(Object.isFrozen(dep)).toBe(true);
    });

    it("should throw PlanConstructionError for empty stepId", () => {
      expect(() => createPlanDependency({ stepId: "  " })).toThrow(PlanConstructionError);
    });
  });

  describe("createPlanPrecondition & createPlanPostcondition", () => {
    it("should construct preconditions and postconditions cleanly", () => {
      const pre = createPlanPrecondition({ key: "user.isLoggedIn", expectedValue: true });
      expect(pre.key).toBe("user.isLoggedIn");
      expect(pre.comparator).toBe("EQUALS");
      expect(Object.isFrozen(pre)).toBe(true);

      const post = createPlanPostcondition({ key: "file.written", targetValue: true });
      expect(post.key).toBe("file.written");
      expect(post.assertType).toBe("STATE_MUTATION");
      expect(Object.isFrozen(post)).toBe(true);
    });
  });

  describe("createPlanStep", () => {
    it("should construct a valid PlanStep and enforce immutability", () => {
      const step = createPlanStep({
        stepId: "step_open",
        sequenceIndex: 0,
        targetTool: "browser.openUrl",
        parameters: { url: "https://example.com" },
        riskLevel: RiskLevel.LOW,
      });

      expect(step.stepId).toBe("step_open");
      expect(step.sequenceIndex).toBe(0);
      expect(step.targetTool).toBe("browser.openUrl");
      expect(step.parameters.url).toBe("https://example.com");
      expect(Object.isFrozen(step)).toBe(true);
      expect(Object.isFrozen(step.parameters)).toBe(true);
    });

    it("should throw PlanConstructionError for invalid sequenceIndex or negative timeout", () => {
      expect(() =>
        createPlanStep({ stepId: "s1", sequenceIndex: -1, targetTool: "tool" })
      ).toThrow(PlanConstructionError);

      expect(() =>
        createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "tool", timeoutMs: -100 })
      ).toThrow(PlanConstructionError);
    });
  });

  describe("createCandidatePlan", () => {
    it("should construct candidate plan with valid confidence", () => {
      const cand = createCandidatePlan({
        primaryActionType: ActionType.CHAT,
        estimatedConfidence: 0.95,
      });
      expect(cand.primaryActionType).toBe(ActionType.CHAT);
      expect(cand.estimatedConfidence).toBe(0.95);
      expect(Object.isFrozen(cand)).toBe(true);
    });

    it("should throw for invalid confidence score", () => {
      expect(() =>
        createCandidatePlan({ primaryActionType: ActionType.CHAT, estimatedConfidence: 1.5 })
      ).toThrow(PlanConstructionError);
    });
  });

  describe("createPlanningPolicy", () => {
    it("should construct default policy deeply frozen", () => {
      const policy = createPlanningPolicy();
      expect(policy.minConfidenceThreshold).toBe(0.7);
      expect(policy.mandatoryApprovalRiskLevels).toContain(RiskLevel.HIGH);
      expect(policy.mandatoryApprovalRiskLevels).toContain(RiskLevel.CRITICAL);
      expect(Object.isFrozen(policy)).toBe(true);
      expect(Object.isFrozen(policy.mandatoryApprovalRiskLevels)).toBe(true);
    });
  });

  describe("createPlanningContext", () => {
    it("should construct context with default policy and freeze", () => {
      const ctx = createPlanningContext();
      expect(ctx.contextId).toBeDefined();
      expect(ctx.timestampMs).toBeGreaterThan(0);
      expect(ctx.policy).toBeDefined();
      expect(Object.isFrozen(ctx)).toBe(true);
    });
  });

  describe("createExecutionStage", () => {
    it("should construct stage with stepIds array", () => {
      const stage = createExecutionStage({ stageIndex: 0, stepIds: ["step_1", "step_2"] });
      expect(stage.stageIndex).toBe(0);
      expect(stage.stepIds).toEqual(["step_1", "step_2"]);
      expect(Object.isFrozen(stage)).toBe(true);
    });

    it("should throw for empty stepIds array", () => {
      expect(() => createExecutionStage({ stageIndex: 0, stepIds: [] })).toThrow(
        PlanConstructionError
      );
    });
  });

  describe("createExecutionPlan", () => {
    it("should construct valid CHAT execution plan", () => {
      const plan = createExecutionPlan({
        primaryActionType: ActionType.CHAT,
        steps: [],
        confidenceScore: 0.98,
      });

      expect(plan.primaryActionType).toBe(ActionType.CHAT);
      expect(plan.compositeRiskLevel).toBe(RiskLevel.LOW);
      expect(plan.requiresUserApproval).toBe(false);
      expect(plan.approvalRequirement).toBe(ApprovalRequirement.NONE);
      expect(plan.confidenceScore).toBe(0.98);
      expect(Object.isFrozen(plan)).toBe(true);
      expect(Object.isFrozen(plan.metadata)).toBe(true);
    });

    it("should automatically require user approval for HIGH risk level plan", () => {
      const step = createPlanStep({
        stepId: "step_delete",
        sequenceIndex: 0,
        targetTool: "file.delete",
        riskLevel: RiskLevel.HIGH,
      });

      const plan = createExecutionPlan({
        primaryActionType: ActionType.TOOL,
        steps: [step],
        compositeRiskLevel: RiskLevel.HIGH,
      });

      expect(plan.requiresUserApproval).toBe(true);
      expect(plan.approvalRequirement).toBe(ApprovalRequirement.MANDATORY);
    });

    it("should throw PlanConstructionError if TOOL or AUTOMATION plan has zero steps", () => {
      expect(() =>
        createExecutionPlan({ primaryActionType: ActionType.TOOL, steps: [] })
      ).toThrow(PlanConstructionError);
    });
  });
});
