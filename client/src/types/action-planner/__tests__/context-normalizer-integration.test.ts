/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 2 Integration Tests: Context Normalizer Compatibility (`context-normalizer-integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { normalizePlanningContext, validatePlanningContext } from "../context-normalizer";
import type { StructuredContext } from "../../cognitive";
import type { IntentResult } from "../../intent";
import { createConversationTurn, MessageRole, TurnStatus } from "../../conversation-core/types";
import { createMemoryEntry } from "../../memory-system/types";

describe("Phase 9.7 — Context Normalizer Integration Compatibility (Phases 9.1–9.6)", () => {
  it("should ingest and normalize real structures from Phases 9.1, 9.2, 9.5, and 9.6", () => {
    // Mock Phase 9.1 StructuredContext
    const mockStructuredContext: StructuredContext = {
      snapshotId: "snap_91001",
      timestamp: Date.now(),
      triggerType: "speech_final",
      systemStateSummary: "System online",
      visualFocusText: "Code editor focused",
      userExpression: "Neutral",
      userHandsText: "Hands idle",
      voiceInputText: "Open browser and search for AETHER OS",
      voice: {
        transcript: "Open browser and search for AETHER OS",
        isListening: false,
        isSpeaking: false,
        isFinal: true,
        confidence: 0.96,
      },
      contextMetadata: {
        builderVersion: "1.0.0",
        schemaVersion: "1.0.0",
        timeOffsetMs: 0,
      },
    };

    // Mock Phase 9.2 IntentResult
    const mockIntentResult: IntentResult = {
      intentId: "intent_92001",
      timestamp: Date.now(),
      category: "browser",
      domain: "web",
      intent: "browser_search",
      confidence: 0.92,
      entities: [
        { type: "text", value: "AETHER OS", normalized: "AETHER OS" },
      ],
      parameters: { query: "AETHER OS" },
      needsClarification: false,
    };

    // Mock Phase 9.5 ConversationTurn
    const mockTurn = createConversationTurn({
      turnId: "turn_95001",
      conversationId: "conv_95001",
      sessionId: "sess_95001",
      turnIndex: 1,
      userMessageId: "msg_user_95001",
      promptPackage: {
        systemPrompt: "You are AETHER OS",
        messages: [
          {
            messageId: "msg_user_95001",
            conversationId: "sess_95001",
            role: MessageRole.USER,
            content: "Open browser and search for AETHER OS",
            timestampMs: Date.now(),
          },
        ],
        estimatedTokenCount: 15,
        contextSensitivity: "INTERNAL",
      },
    });

    // Mock Phase 9.6 MemoryEntry
    const mockMemory = createMemoryEntry({
      id: "mem_96001",
      type: "short_term",
      content: "User prefers Chrome for web searches",
    });

    // Run Context Normalizer
    const planningContext = normalizePlanningContext({
      structuredContext: mockStructuredContext,
      intentResult: mockIntentResult,
      conversationTurn: mockTurn,
      retrievedMemories: [mockMemory],
    });

    // Verify
    expect(planningContext.contextId).toBeDefined();
    expect(planningContext.structuredContext?.snapshotId).toBe("snap_91001");
    expect(planningContext.intentResult?.intent).toBe("browser_search");
    expect(planningContext.conversationTurn?.turnId).toBe(mockTurn.turnId);
    expect(planningContext.retrievedMemories?.[0].id).toBe("mem_96001");

    // Verify fail-fast assertion check passes cleanly
    expect(() => validatePlanningContext(planningContext)).not.toThrow();

    // Verify deep freezing across all composite levels
    expect(Object.isFrozen(planningContext)).toBe(true);
    expect(Object.isFrozen(planningContext.structuredContext)).toBe(true);
    expect(Object.isFrozen(planningContext.intentResult)).toBe(true);
    expect(Object.isFrozen(planningContext.conversationTurn)).toBe(true);
    expect(Object.isFrozen(planningContext.retrievedMemories)).toBe(true);
  });
});
