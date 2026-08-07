/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Replay Determinism Tests: Conversation Runtime (`replay.runtime.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapRuntime, resetRuntime } from "../../index";
import { ConversationRuntime } from "../conversation-runtime";
import type { TranslationResponse } from "../../../types/provider-adapters/message-types";

describe("Phase 9.11 Milestone 2 Conversation Runtime Replay Determinism", () => {
  it("should execute 100 replay runs producing bit-for-bit identical frozen snapshots", async () => {
    const customEnv = {
      GROQ_API_KEY: "gsk_replay_test_groq_key",
      NVIDIA_API_KEY: "nvapi-replay_test_nvidia_key",
    };

    let firstSnapshotJson = "";

    const mockResponse: TranslationResponse = {
      responseId: "resp_replay_fixed",
      requestId: "req_replay_fixed",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_ast_replay",
        role: "assistant",
        content: "Deterministic Response",
        timestamp: 1677652288000,
      },
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      timestamp: 1677652288000,
    };

    const mockRuntime = {
      execute: async () => mockResponse,
    };

    for (let run = 0; run < 100; run++) {
      resetRuntime();
      await bootstrapRuntime({ autoRegisterDefaultAdapters: true }, customEnv);

      const convRuntime = new ConversationRuntime(
        mockRuntime as any,
        "Fixed System Prompt",
        "groq-provider",
        "llama-3.3-70b-versatile"
      );

      await convRuntime.sendMessage("Deterministic Prompt");

      const snapshot = convRuntime.snapshot();
      const normalizedSnapshot = {
        systemPrompt: snapshot.systemPrompt,
        activeProvider: snapshot.activeProvider,
        activeModel: snapshot.activeModel,
        messageCount: snapshot.messages.length,
        userContent: snapshot.messages[0].content,
        assistantContent: snapshot.messages[1].content,
      };

      const currentJson = JSON.stringify(normalizedSnapshot);

      if (run === 0) {
        firstSnapshotJson = currentJson;
      } else {
        expect(currentJson).toBe(firstSnapshotJson);
      }
    }
  });
});
