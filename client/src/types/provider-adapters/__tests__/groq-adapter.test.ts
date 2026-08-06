/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Groq Adapter (`groq-adapter.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { GroqAdapter } from "../groq-adapter";
import { ProviderVendor } from "../enums";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Groq Adapter Unit Tests", () => {
  it("should initialize GroqAdapter with correct vendor, capabilities, and provider config", () => {
    const adapter = new GroqAdapter("groq-cred-999");

    expect(adapter.identity.adapterId).toBe("groq-adapter");
    expect(adapter.identity.vendor).toBe(ProviderVendor.GROQ);
    expect(adapter.capabilities.supportsStreaming).toBe(true);
    expect(adapter.providerConfig.endpointConfig.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("should serialize TranslationRequest into Groq wire format", () => {
    const adapter = new GroqAdapter();
    const req = translateRequest({
      modelId: "llama-3.3-70b-versatile",
      context: {
        conversationId: "conv-groq",
        messages: [{ id: "m1", role: "user", content: "Fast inference", timestamp: 1000 }],
      },
    });

    const serialized = adapter.serializeRequest(req);

    expect(serialized["model"]).toBe("llama-3.3-70b-versatile");
    expect(Object.isFrozen(serialized)).toBe(true);
  });

  it("should parse Groq response JSON into canonical TranslationResponse", () => {
    const adapter = new GroqAdapter();
    const mockJson = {
      id: "groq-chat-01",
      model: "llama-3.3-70b-versatile",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "LPU Response",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    const res = adapter.parseResponse(mockJson, "req-groq", "llama-3.3-70b-versatile");

    expect(res.responseId).toBe("groq-chat-01");
    expect(res.message.content).toBe("LPU Response");
    expect(res.usage.totalTokens).toBe(15);
    expect(Object.isFrozen(res)).toBe(true);
  });
});
