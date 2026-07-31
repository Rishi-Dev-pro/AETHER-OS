/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 5 Unit Tests: Plan Safety Layer & Risk Estimator (`plan-risk-engine.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { RiskLevel, ApprovalRequirement, ActionType } from "../enums";
import { PlanningPolicyError } from "../errors";
import { createPlanStep, createCandidatePlan, createPlanningPolicy } from "../factories";
import { constructExecutionPlan } from "../plan-graph";
import {
  SystemCapability,
  analyzeStepCapabilities,
  analyzePlanCapabilities,
  estimateStepRisk,
  estimateCompositeRisk,
  evaluatePlanningPolicy,
  evaluateApprovalMetadata,
  evaluatePlanSafety,
} from "../plan-risk-engine";

describe("Phase 9.7 — Plan Safety Layer & Risk Estimator (Milestone 5)", () => {
  describe("Capability Analyzer", () => {
    it("should classify capabilities for standard tools correctly", () => {
      const stepChat = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "chat.respond" });
      const capsChat = analyzeStepCapabilities(stepChat);
      expect(capsChat).toContain(SystemCapability.DIALOGUE_ONLY);

      const stepDelete = createPlanStep({ stepId: "s2", sequenceIndex: 1, targetTool: "system.deleteFile" });
      const capsDelete = analyzeStepCapabilities(stepDelete);
      expect(capsDelete).toContain(SystemCapability.FILESYSTEM_WRITE);
      expect(capsDelete).toContain(SystemCapability.DESKTOP_AUTOMATION);
    });

    it("should aggregate all unique capabilities across plan steps", () => {
      const step1 = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "browser.openUrl" });
      const step2 = createPlanStep({ stepId: "s2", sequenceIndex: 1, targetTool: "system.readFile" });
      const caps = analyzePlanCapabilities([step1, step2]);

      expect(caps).toContain(SystemCapability.BROWSER_AUTOMATION);
      expect(caps).toContain(SystemCapability.NETWORK_ACCESS);
      expect(caps).toContain(SystemCapability.FILESYSTEM_READ);
      expect(Object.isFrozen(caps)).toBe(true);
    });
  });

  describe("Risk Estimator", () => {
    it("should calculate step risk levels deterministically", () => {
      const stepRead = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "system.readFile" });
      expect(estimateStepRisk(stepRead)).toBe(RiskLevel.MEDIUM);

      const stepWrite = createPlanStep({ stepId: "s2", sequenceIndex: 1, targetTool: "system.writeFile" });
      expect(estimateStepRisk(stepWrite)).toBe(RiskLevel.HIGH);

      const stepCommand = createPlanStep({ stepId: "s3", sequenceIndex: 2, targetTool: "system.executeCommand" });
      expect(estimateStepRisk(stepCommand)).toBe(RiskLevel.CRITICAL);
    });

    it("should calculate composite risk as highest step risk in plan", () => {
      const step1 = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "chat.respond" }); // LOW
      const step2 = createPlanStep({ stepId: "s2", sequenceIndex: 1, targetTool: "system.writeFile" }); // HIGH
      const risk = estimateCompositeRisk([step1, step2]);
      expect(risk).toBe(RiskLevel.HIGH);
    });
  });

  describe("Policy Engine & Approval Engine", () => {
    it("should throw PlanningPolicyError when plan contains restricted tool", () => {
      const step = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "system.executeCommand" });
      const policy = createPlanningPolicy({ restrictedTools: ["system.executeCommand"] });

      expect(() => evaluatePlanningPolicy([step], policy)).toThrow(PlanningPolicyError);
    });

    it("should evaluate mandatory approval requirements for HIGH and CRITICAL risk plans", () => {
      const policy = createPlanningPolicy();
      const metaLow = evaluateApprovalMetadata(RiskLevel.LOW, [], policy);
      expect(metaLow.requiresUserApproval).toBe(false);
      expect(metaLow.approvalRequirement).toBe(ApprovalRequirement.NONE);

      const stepHigh = createPlanStep({ stepId: "s1", sequenceIndex: 0, targetTool: "system.writeFile" });
      const metaHigh = evaluateApprovalMetadata(RiskLevel.HIGH, [stepHigh], policy);
      expect(metaHigh.requiresUserApproval).toBe(true);
      expect(metaHigh.approvalRequirement).toBe(ApprovalRequirement.MANDATORY);
      expect(metaHigh.userConfirmationPrompt).toContain("Safety Approval Required");
    });
  });

  describe("evaluatePlanSafety (Secured ExecutionPlan Factory)", () => {
    it("should enrich ExecutionPlan with safety metadata and freeze output deeply", () => {
      const step = createPlanStep({ stepId: "step_delete", sequenceIndex: 0, targetTool: "system.deleteFile" });
      const candidate = createCandidatePlan({
        primaryActionType: ActionType.TOOL,
        candidateSteps: [step],
        rawRiskLevel: RiskLevel.CRITICAL,
      });

      const structuralPlan = constructExecutionPlan(candidate);
      const securedPlan = evaluatePlanSafety(structuralPlan);

      expect(securedPlan.compositeRiskLevel).toBe(RiskLevel.CRITICAL);
      expect(securedPlan.requiresUserApproval).toBe(true);
      expect(securedPlan.approvalRequirement).toBe(ApprovalRequirement.STRICT_CONFIRMATION);
      expect(securedPlan.userConfirmationPrompt).toBeDefined();
      expect(Object.isFrozen(securedPlan)).toBe(true);
    });
  });
});
