/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: OpenAI Adapter (`openai-adapter.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { OpenAIAdapter } from "../openai-adapter";
import { ProviderVendor } from "../enums";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 OpenAI Adapter Unit Tests", () => {
  it("should initialize OpenAIAdapter with correct vendor, capabilities, and provider config", () => {
    const adapter = new OpenAIAdapter("openai-cred-123");

    expect(adapter.identity.adapterId).toBe("openai-adapter");
    expect(adapter.identity.vendor).toBe(ProviderVendor.OPENAI);
    expect(adapter.capabilities.supportsStreaming).toBe(true);
    expect(adapter.capabilities.supportsToolCalling).toBe(true);
    expect(adapter.providerConfig.endpointConfig.baseUrl).toBe("https://api.openai.com/v1");
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Object.isFrozen(adapter.providerConfig)).toBe(true);
  });

  it("should serialize TranslationRequest into OpenAI chat completions wire JSON", () => {
    const adapter = new OpenAIAdapter();
    const req = translateRequest({
      modelId: "gpt-4o",
      context: {
        conversationId: "conv-1",
        messages: [{ id: "m1", role: "user", content: "Hello OpenAI", timestamp: 1000 }],
      },
      temperature: 0.7,
    });

    const serialized = adapter.serializeRequest(req);

    expect(serialized["model"]).toBe("gpt-4o");
    expect(Array.isArray(serialized["messages"])).toBe(true);
    expect((serialized["messages"] as any[])[0].content).toBe("Hello OpenAI");
    expect(serialized["temperature"]).toBe(0.7);
    expect(Object.isFrozen(serialized)).toBe(true);
  });

  it("should parse OpenAI response JSON into canonical TranslationResponse", () => {
    const adapter = new OpenAIAdapter();
    const mockJson = {
      id: "chatcmpl-123",
      object: "chat.completion",
      created: 1677652288,
      model: "gpt-4o",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello there!",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
    };

    const res = adapter.parseResponse(mockJson, "req-1", "gpt-4o");

    expect(res.responseId).toBe("chatcmpl-123");
    expect(res.requestId).toBe("req-1");
    expect(res.modelId).toBe("gpt-4o");
    expect(res.message.content).toBe("Hello there!");
    expect(res.finishReason).toBe("stop");
    expect(res.usage.totalTokens).toBe(21);
    expect(Object.isFrozen(res)).toBe(true);
  });
});
