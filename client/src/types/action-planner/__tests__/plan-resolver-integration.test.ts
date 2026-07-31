/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 3 Integration Tests: Candidate Plan Replay & Resolution (`plan-resolver-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { normalizePlanningContext } from "../context-normalizer";
import { resolveCandidatePlan } from "../plan-resolver";
import { ActionType } from "../enums";
import type { IntentResult } from "../../intent";

describe("Phase 9.7 — Candidate Plan Resolver Integration & Replay", () => {
  it("should generate bit-for-bit identical CandidatePlans across repeated replay runs", () => {
    const mockIntent: IntentResult = {
      intentId: "int_replay_100",
      timestamp: 1700000000000,
      category: "web",
      domain: "browser",
      intent: "browser_search",
      confidence: 0.94,
      entities: [{ type: "text", value: "AETHER OS", normalized: "AETHER OS" }],
      parameters: { query: "AETHER OS" },
      needsClarification: false,
    };

    const ctx1 = normalizePlanningContext({ contextId: "ctx_replay_1", timestampMs: 1700000000000, intentResult: mockIntent });
    const ctx2 = normalizePlanningContext({ contextId: "ctx_replay_1", timestampMs: 1700000000000, intentResult: mockIntent });

    const plan1 = resolveCandidatePlan(ctx1);
    const plan2 = resolveCandidatePlan(ctx2);

    expect(plan1.candidateId).toBe(plan2.candidateId);
    expect(plan1.primaryActionType).toBe(plan2.primaryActionType);
    expect(plan1.estimatedConfidence).toBe(plan2.estimatedConfidence);
    expect(plan1.rawRiskLevel).toBe(plan2.rawRiskLevel);
    expect(plan1.candidateSteps.length).toBe(plan2.candidateSteps.length);
    expect(plan1.candidateSteps[0].targetTool).toBe(plan2.candidateSteps[0].targetTool);
    expect(plan1.candidateSteps[0].parameters).toEqual(plan2.candidateSteps[0].parameters);
  });

  it("should resolve valid candidate plans for all 5 action categories", () => {
    // 1. CHAT
    const chatCtx = normalizePlanningContext({
      intentResult: { intentId: "1", timestamp: 1, category: "dialogue", domain: "chat", intent: "hello", confidence: 0.9, entities: [], parameters: {}, needsClarification: false }
    });
    expect(resolveCandidatePlan(chatCtx).primaryActionType).toBe(ActionType.CHAT);

    // 2. TOOL
    const toolCtx = normalizePlanningContext({
      intentResult: { intentId: "2", timestamp: 1, category: "web", domain: "browser", intent: "browser_search", confidence: 0.9, entities: [], parameters: { query: "test" }, needsClarification: false }
    });
    expect(resolveCandidatePlan(toolCtx).primaryActionType).toBe(ActionType.TOOL);

    // 3. AUTOMATION
    const autoCtx = normalizePlanningContext({
      intentResult: { intentId: "3", timestamp: 1, category: "automation", domain: "system", intent: "macro_sequence", confidence: 0.9, entities: [], parameters: {}, needsClarification: false }
    });
    expect(resolveCandidatePlan(autoCtx).primaryActionType).toBe(ActionType.AUTOMATION);

    // 4. ASK_CLARIFICATION
    const clarifyCtx = normalizePlanningContext({
      intentResult: { intentId: "4", timestamp: 1, category: "web", domain: "browser", intent: "browser_search", confidence: 0.3, entities: [], parameters: {}, needsClarification: false }
    });
    expect(resolveCandidatePlan(clarifyCtx).primaryActionType).toBe(ActionType.ASK_CLARIFICATION);

    // 5. NO_ACTION
    const noActionCtx = normalizePlanningContext();
    expect(resolveCandidatePlan(noActionCtx).primaryActionType).toBe(ActionType.NO_ACTION);
  });
});
