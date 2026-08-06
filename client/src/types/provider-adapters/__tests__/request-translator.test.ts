/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Request Translator (`request-translator.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { translateRequest } from "../request-translator";
import { RequestTranslationError } from "../translation-errors";

describe("Phase 9.10 Request Translator Unit Tests", () => {
  it("should normalize and translate input parameters into a deeply frozen TranslationRequest", () => {
    const request = translateRequest({
      modelId: "llama-3.3-70b",
      systemInstruction: "Always speak in JSON format.",
      context: {
        conversationId: "conv-trans-01",
        messages: [{ id: "m1", role: "user", content: "List colors.", timestamp: 1000 }],
      },
      temperature: 0.2,
      maxTokens: 512,
    });

    expect(request.modelId).toBe("llama-3.3-70b");
    expect(request.context.messages.length).toBe(2);
    expect(request.context.messages[0].role).toBe("system");
    expect(request.context.messages[0].content).toBe("Always speak in JSON format.");
    expect(request.context.messages[1].role).toBe("user");
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.context)).toBe(true);
    expect(Object.isFrozen(request.context.messages)).toBe(true);
  });

  it("should throw RequestTranslationError when modelId is missing", () => {
    expect(() =>
      translateRequest({
        context: {
          conversationId: "conv-1",
          messages: [{ id: "m1", role: "user", content: "Test", timestamp: 1000 }],
        },
      })
    ).toThrow(RequestTranslationError);
  });

  it("should throw RequestTranslationError when context is missing or null", () => {
    expect(() =>
      translateRequest({
        modelId: "model-x",
      })
    ).toThrow(RequestTranslationError);
  });
});
