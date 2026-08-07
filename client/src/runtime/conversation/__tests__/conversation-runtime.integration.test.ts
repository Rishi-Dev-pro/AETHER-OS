/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Integration Tests: Conversation Runtime (`conversation-runtime.integration.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { bootstrapRuntime, resetRuntime } from "../../index";
import { ConversationRuntime } from "../conversation-runtime";
import type { TranslationResponse } from "../../../types/provider-adapters/message-types";

describe("Phase 9.11 Milestone 2 Conversation Runtime Integration Tests", () => {
  beforeEach(async () => {
    resetRuntime();
    await bootstrapRuntime(
      { autoRegisterDefaultAdapters: true },
      { GROQ_API_KEY: "gsk_test_groq_integration_key" }
    );
  });

  it("should execute full conversation pipeline via sendMessage façade", async () => {
    const mockResponse: TranslationResponse = {
      responseId: "resp_integration_1",
      requestId: "req_integration_1",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_ast_integration",
        role: "assistant",
        content: "AETHER OS Runtime is fully active.",
        timestamp: Date.now(),
      },
      finishReason: "stop",
      usage: { promptTokens: 15, completionTokens: 15, totalTokens: 30 },
      timestamp: Date.now(),
    };

    const mockRuntime = {
      execute: async () => mockResponse,
    };

    const convRuntime = new ConversationRuntime(mockRuntime as any);

    const result = await convRuntime.sendMessage("Status check");

    expect(result.response.message.content).toBe("AETHER OS Runtime is fully active.");

    const snapshot = convRuntime.snapshot();
    expect(snapshot.messages.length).toBe(2);
    expect(snapshot.messages[0].content).toBe("Status check");
    expect(snapshot.messages[1].content).toBe("AETHER OS Runtime is fully active.");

    const diag = convRuntime.diagnostics();
    expect(diag.totalRequests).toBe(1);
    expect(diag.successfulRequests).toBe(1);

    const exp = convRuntime.exportConversation();
    expect(exp.turns.length).toBe(1);
    expect(Object.isFrozen(exp)).toBe(true);
  });
});
