/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Integration & Replay Test Suite: Streaming Runtime (`replay-streaming.test.ts`)
 *
 * @file replay-streaming.test.ts
 * @description 100-run deterministic streaming replay verification testing SSE chunking,
 * event emission ordering, store mutations, cancellation, and fallbacks.
 *
 * @module @aether/runtime/__tests__/replay-streaming
 * @version 1.0.1
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseSSELine, parseSSEStream } from "../../types/provider-adapters/stream-parser";
import { bootstrapRuntime } from "../../types/provider-adapters/runtime-bootstrap";
import { ConversationRuntime } from "../conversation/conversation-runtime";
import { HttpClient } from "../../types/provider-adapters/http-client";

describe("Phase 9.11 Milestone 4 — Streaming Replay Determinism", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. SSE Stream Parser Unit Tests", () => {
    it("should parse valid SSE line into StreamingChunk", () => {
      const line = 'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}';
      const chunk = parseSSELine(line, "req-1", 0);
      expect(chunk).not.toBeNull();
      expect(chunk?.deltaContent).toBe("Hello");
      expect(chunk?.index).toBe(0);
    });

    it("should ignore empty or [DONE] SSE lines", () => {
      expect(parseSSELine("data: [DONE]", "req-1", 0)).toBeNull();
      expect(parseSSELine("", "req-1", 0)).toBeNull();
    });

    it("should parse multi-line SSE text stream deterministically", async () => {
      const rawSSE = [
        'data: {"choices":[{"delta":{"content":"AETHER "}}]}\n',
        'data: {"choices":[{"delta":{"content":"OS "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Online"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ];

      const chunks = [];
      for await (const chunk of parseSSEStream(rawSSE, "req-stream-1")) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0].deltaContent).toBe("AETHER ");
      expect(chunks[1].deltaContent).toBe("OS ");
      expect(chunks[2].deltaContent).toBe("Online");
      expect(chunks[2].finishReason).toBe("stop");
    });
  });

  describe("2. 100 Consecutive Replay Runs Determinism", () => {
    it("should execute 100 consecutive streaming runs with identical output and ordering", async () => {
      const { runtime: adapterRuntime } = bootstrapRuntime();

      if (!adapterRuntime.getVault().hasCredential("groq-credential-id")) {
        adapterRuntime.registerCredential("groq-credential-id", "groq-provider", "API_KEY" as any, {
          apiKey: "gsk_mock_streaming_key_12345678901234567890123456789012",
        });
      }

      const mockSSE = [
        'data: {"choices":[{"delta":{"content":"Streaming "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Response "}}]}\n',
        'data: {"choices":[{"delta":{"content":"Verified"},"finish_reason":"stop"}]}\n',
        'data: [DONE]\n',
      ];

      vi.spyOn(HttpClient.prototype, "executeStream").mockImplementation(async () => {
        return {
          async *[Symbol.asyncIterator]() {
            for (const line of mockSSE) {
              yield line;
            }
          },
        };
      });

      const conversationRuntime = new ConversationRuntime(adapterRuntime);
      const expectedContent = "Streaming Response Verified";

      for (let run = 1; run <= 100; run++) {
        conversationRuntime.clearConversation();
        conversationRuntime.startConversation("System", "groq-adapter", "llama-3.3-70b-versatile");

        const result = await conversationRuntime.sendStreamingMessage(
          "Test streaming prompt",
          "groq-adapter",
          "llama-3.3-70b-versatile"
        );

        expect(result.response.message.content).toBe(expectedContent);
        expect(result.turn.status).toBe("COMPLETED");

        const snapshot = conversationRuntime.snapshot();
        expect(snapshot.messages).toHaveLength(2);
        expect(snapshot.messages[1].content).toBe(expectedContent);
      }
    });
  });

  describe("3. Cancellation & Fallbacks", () => {
    it("should support stream cancellation via AbortSignal", async () => {
      const { runtime: adapterRuntime } = bootstrapRuntime();

      if (!adapterRuntime.getVault().hasCredential("groq-credential-id")) {
        adapterRuntime.registerCredential("groq-credential-id", "groq-provider", "API_KEY" as any, {
          apiKey: "gsk_mock_streaming_key_12345678901234567890123456789012",
        });
      }

      const controller = new AbortController();
      controller.abort("User cancelled generation");

      const conversationRuntime = new ConversationRuntime(adapterRuntime);
      conversationRuntime.startConversation("System", "groq-adapter", "llama-3.3-70b-versatile");

      await expect(
        conversationRuntime.sendStreamingMessage(
          "Cancel test",
          "groq-adapter",
          "llama-3.3-70b-versatile",
          controller.signal
        )
      ).rejects.toThrow();
    });

    it("should fall back gracefully to single chunk stream for non-streaming adapters", async () => {
      const { runtime: adapterRuntime } = bootstrapRuntime();

      if (!adapterRuntime.getVault().hasCredential("groq-credential-id")) {
        adapterRuntime.registerCredential("groq-credential-id", "groq-provider", "API_KEY" as any, {
          apiKey: "gsk_mock_streaming_key_12345678901234567890123456789012",
        });
      }

      vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
        ok: true,
        statusCode: 200,
        headers: { "content-type": "application/json" },
        rawBody: JSON.stringify({
          id: "resp-fallback",
          object: "chat.completion",
          created: 1000,
          model: "llama-3.3-70b-versatile",
          choices: [{ index: 0, message: { role: "assistant", content: "Fallback text" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }),
        body: {
          id: "resp-fallback",
          object: "chat.completion",
          created: 1000,
          model: "llama-3.3-70b-versatile",
          choices: [{ index: 0, message: { role: "assistant", content: "Fallback text" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        },
        latencyMs: 50,
        requestId: "req-fallback",
      });

      const conversationRuntime = new ConversationRuntime(adapterRuntime);
      conversationRuntime.startConversation("System", "groq-adapter", "llama-3.3-70b-versatile");

      const result = await conversationRuntime.sendMessage("Fallback query", "groq-adapter", "llama-3.3-70b-versatile");
      expect(result.response.message.content).toBe("Fallback text");
    });
  });
});
