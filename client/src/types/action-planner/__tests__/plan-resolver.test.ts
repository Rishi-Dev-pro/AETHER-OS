/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 3 Unit Tests: Candidate Plan Resolver (`plan-resolver.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel } from "../enums";
import { normalizePlanningContext } from "../context-normalizer";
import {
  resolveCandidatePlan,
  calculatePlanningConfidence,
  resolveIntentCategory,
  resolveParameters,
  findMissingParameters,
} from "../plan-resolver";
import type { IntentResult } from "../../intent";

describe("Phase 9.7 — Candidate Plan Resolver (Milestone 3)", () => {
  describe("Confidence Engine & Sub-Resolvers", () => {
    it("should calculate confidence correctly with base intent score", () => {
      const intent: IntentResult = {
        intentId: "int_1",
        timestamp: Date.now(),
        category: "web",
        domain: "browser",
        intent: "browser_open",
        confidence: 0.8,
        entities: [],
        parameters: {},
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const conf = calculatePlanningConfidence(ctx);
      expect(conf).toBe(0.8);
    });

    it("should resolve parameters and map extracted entities", () => {
      const intent: IntentResult = {
        intentId: "int_2",
        timestamp: Date.now(),
        category: "web",
        domain: "browser",
        intent: "browser_open",
        confidence: 0.9,
        entities: [{ type: "url", value: "https://aether.os", normalized: "https://aether.os" }],
        parameters: {},
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const params = resolveParameters(ctx, "browser.openUrl");
      expect(params.url).toBe("https://aether.os");
    });

    it("should identify missing required parameters for tools", () => {
      const missing = findMissingParameters("browser.openUrl", {});
      expect(missing).toEqual(["url"]);

      const complete = findMissingParameters("browser.openUrl", { url: "https://example.com" });
      expect(complete).toEqual([]);
    });
  });

  describe("5 Canonical Action Category Resolution", () => {
    it("1. NO_ACTION: should resolve NO_ACTION candidate plan when intent is idle or missing", () => {
      const ctx = normalizePlanningContext();
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.NO_ACTION);
      expect(plan.candidateSteps).toHaveLength(0);
      expect(plan.estimatedConfidence).toBe(1.0);
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it("2. CHAT: should resolve CHAT candidate plan for conversational intent", () => {
      const intent: IntentResult = {
        intentId: "int_chat",
        timestamp: Date.now(),
        category: "dialogue",
        domain: "chat",
        intent: "user_greeting",
        confidence: 0.95,
        entities: [],
        parameters: {},
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.CHAT);
      expect(plan.candidateSteps).toHaveLength(1);
      expect(plan.candidateSteps[0].targetTool).toBe("chat.respond");
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it("3. TOOL: should resolve TOOL candidate plan with complete parameters", () => {
      const intent: IntentResult = {
        intentId: "int_tool",
        timestamp: Date.now(),
        category: "web",
        domain: "browser",
        intent: "browser_search",
        confidence: 0.92,
        entities: [],
        parameters: { query: "AETHER OS architecture" },
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.TOOL);
      expect(plan.candidateSteps).toHaveLength(1);
      expect(plan.candidateSteps[0].targetTool).toBe("browser.search");
      expect(plan.candidateSteps[0].parameters.query).toBe("AETHER OS architecture");
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it("4. AUTOMATION: should resolve AUTOMATION candidate plan for multi-step workflow", () => {
      const intent: IntentResult = {
        intentId: "int_auto",
        timestamp: Date.now(),
        category: "automation",
        domain: "system",
        intent: "workflow_automate",
        confidence: 0.88,
        entities: [],
        parameters: { query: "Full OS Test" },
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.AUTOMATION);
      expect(plan.candidateSteps.length).toBeGreaterThan(1);
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it("5. ASK_CLARIFICATION: should trigger ASK_CLARIFICATION when parameters are missing", () => {
      const intent: IntentResult = {
        intentId: "int_missing_url",
        timestamp: Date.now(),
        category: "web",
        domain: "browser",
        intent: "browser_open", // requires 'url' parameter
        confidence: 0.95,
        entities: [],
        parameters: {}, // url missing
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.ASK_CLARIFICATION);
      expect(plan.candidateSteps[0].targetTool).toBe("system.ask_clarification");
      expect(plan.candidateSteps[0].parameters.missingParameters).toEqual(["url"]);
      expect(Object.isFrozen(plan)).toBe(true);
    });

    it("5b. ASK_CLARIFICATION: should trigger ASK_CLARIFICATION when confidence is below policy threshold", () => {
      const intent: IntentResult = {
        intentId: "int_low_conf",
        timestamp: Date.now(),
        category: "web",
        domain: "browser",
        intent: "browser_search",
        confidence: 0.45, // < minConfidenceThreshold (0.7)
        entities: [],
        parameters: { query: "uncertain query" },
        needsClarification: false,
      };

      const ctx = normalizePlanningContext({ intentResult: intent });
      const plan = resolveCandidatePlan(ctx);
      expect(plan.primaryActionType).toBe(ActionType.ASK_CLARIFICATION);
      expect(plan.reasoningSummary).toBeDefined();
      expect(Object.isFrozen(plan)).toBe(true);
    });
  });
});
