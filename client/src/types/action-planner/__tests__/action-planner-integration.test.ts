/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 6 Integration Tests: Master Pipeline End-to-End Execution (`action-planner-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ActionType, RiskLevel, ApprovalRequirement } from "../enums";
import { PlanningPolicyError } from "../errors";
import { planAction } from "../action-planner-manager";
import type { StructuredContext } from "../../cognitive";
import type { IntentResult } from "../../intent";
import { createConversationTurn, MessageRole } from "../../conversation-core/types";
import { createMemoryEntry } from "../../memory-system/types";

describe("Phase 9.7 — Action Planner Master Pipeline Integration & Replay", () => {
  it("should process end-to-end tool input from Phases 9.1-9.6 into secured ExecutionPlan with approval metadata", () => {
    const mockContext: StructuredContext = {
      snapshotId: "snap_m6_01",
      timestamp: 1700000000000,
      triggerType: "speech_final",
      systemStateSummary: "Active",
      visualFocusText: "Code editor",
      userExpression: "Neutral",
      userHandsText: "Idle",
      voiceInputText: "Delete file temp.txt",
      voice: { transcript: "Delete file temp.txt", isListening: false, isSpeaking: false, isFinal: true, confidence: 0.95 },
      contextMetadata: { builderVersion: "1.0.0", schemaVersion: "1.0.0", timeOffsetMs: 0 },
    };

    const mockIntent: IntentResult = {
      intentId: "int_m6_01",
      timestamp: 1700000000000,
      category: "system",
      domain: "file",
      intent: "file_delete",
      confidence: 0.94,
      entities: [{ type: "file_name", value: "temp.txt", normalized: "temp.txt" }],
      parameters: { filePath: "temp.txt" },
      needsClarification: false,
    };

    const mockTurn = createConversationTurn({
      turnId: "turn_m6_01",
      conversationId: "conv_m6_01",
      sessionId: "sess_m6_01",
      turnIndex: 1,
      userMessageId: "msg_m6_01",
      promptPackage: {
        systemPrompt: "You are AETHER OS",
        messages: [{ messageId: "msg_m6_01", conversationId: "conv_m6_01", role: MessageRole.USER, text: "Delete file temp.txt", timestamp: 1700000000000, sensitivity: 0 }],
        estimatedTokenCount: 10,
        contextSensitivity: "INTERNAL",
      },
    });

    const mockMemory = createMemoryEntry({ id: "mem_m6_01", type: "short_term", content: "User confirmed deletion request." });

    const result = planAction({
      contextId: "ctx_e2e_delete",
      timestampMs: 1700000000000,
      structuredContext: mockContext,
      intentResult: mockIntent,
      conversationTurn: mockTurn,
      retrievedMemories: [mockMemory],
    });

    expect(result.candidatePlan.primaryActionType).toBe(ActionType.TOOL);
    expect(result.securedPlan.compositeRiskLevel).toBe(RiskLevel.CRITICAL);
    expect(result.securedPlan.requiresUserApproval).toBe(true);
    expect(result.securedPlan.approvalRequirement).toBe(ApprovalRequirement.STRICT_CONFIRMATION);
    expect(result.securedPlan.userConfirmationPrompt).toContain("Safety Approval Required");

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.securedPlan)).toBe(true);
  });

  it("should fail-fast and propagate PlanningPolicyError when restricted tools are included", () => {
    const mockIntent: IntentResult = {
      intentId: "int_cmd",
      timestamp: 1700000000000,
      category: "system",
      domain: "os",
      intent: "system_control",
      confidence: 0.95,
      entities: [],
      parameters: { command: "rm -rf /" },
      needsClarification: false,
    };

    expect(() =>
      planAction({
        intentResult: mockIntent,
        policy: { restrictedTools: ["system.executeCommand"] },
      })
    ).toThrow(PlanningPolicyError);
  });

  it("should generate bit-for-bit identical PlanningPipelineResult across repeated replay runs", () => {
    const mockIntent: IntentResult = {
      intentId: "int_replay",
      timestamp: 1700000000000,
      category: "web",
      domain: "browser",
      intent: "browser_open",
      confidence: 0.9,
      entities: [{ type: "url", value: "https://aether.os", normalized: "https://aether.os" }],
      parameters: { url: "https://aether.os" },
      needsClarification: false,
    };

    const res1 = planAction({ contextId: "ctx_replay_all", timestampMs: 1700000000000, intentResult: mockIntent });
    const res2 = planAction({ contextId: "ctx_replay_all", timestampMs: 1700000000000, intentResult: mockIntent });

    expect(res1.candidatePlan).toEqual(res2.candidatePlan);
    expect(res1.structuralPlan).toEqual(res2.structuralPlan);
    expect(res1.securedPlan).toEqual(res2.securedPlan);
    expect(res1.diagnostics).toEqual(res2.diagnostics);
  });
});
