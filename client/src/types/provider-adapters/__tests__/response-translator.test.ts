/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Response Translator (`response-translator.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { translateResponse } from "../response-translator";
import { ResponseTranslationError } from "../translation-errors";

describe("Phase 9.10 Response Translator Unit Tests", () => {
  it("should normalize raw response attributes into a deeply frozen TranslationResponse", () => {
    const res = translateResponse({
      responseId: "resp-999",
      requestId: "req-888",
      modelId: "gpt-4o",
      finishReason: "tool_calls",
      message: {
        id: "msg-assistant-1",
        role: "assistant",
        content: "I will execute the tool for you.",
        toolCalls: [{ id: "call-xyz", type: "function", name: "search", arguments: { q: "weather" } }],
        timestamp: 2000,
      },
      usage: {
        promptTokens: 150,
        completionTokens: 45,
        totalTokens: 195,
      },
    });

    expect(res.responseId).toBe("resp-999");
    expect(res.requestId).toBe("req-888");
    expect(res.modelId).toBe("gpt-4o");
    expect(res.finishReason).toBe("tool_calls");
    expect(res.message.toolCalls?.length).toBe(1);
    expect(res.usage.totalTokens).toBe(195);
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.message)).toBe(true);
    expect(Object.isFrozen(res.usage)).toBe(true);
  });

  it("should throw ResponseTranslationError on missing responseId or invalid finishReason", () => {
    expect(() =>
      translateResponse({
        responseId: "",
        requestId: "req-1",
        modelId: "model-1",
        message: { id: "m1", role: "assistant", content: "Hi", timestamp: 1000 },
      })
    ).toThrow(ResponseTranslationError);

    expect(() =>
      translateResponse({
        responseId: "res-1",
        requestId: "req-1",
        modelId: "model-1",
        finishReason: "invalid_reason" as any,
        message: { id: "m1", role: "assistant", content: "Hi", timestamp: 1000 },
      })
    ).toThrow(ResponseTranslationError);
  });
});
