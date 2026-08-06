/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Ollama Local Adapter (`ollama-adapter.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { OllamaAdapter } from "../ollama-adapter";
import { ProviderVendor, AuthenticationType } from "../enums";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Ollama Local Adapter Unit Tests", () => {
  it("should initialize OllamaAdapter with localhost endpoint and NONE auth", () => {
    const adapter = new OllamaAdapter();

    expect(adapter.identity.adapterId).toBe("ollama-adapter");
    expect(adapter.identity.vendor).toBe(ProviderVendor.OLLAMA);
    expect(adapter.providerConfig.endpointConfig.baseUrl).toBe("http://localhost:11434/api");
    expect(adapter.providerConfig.authConfig.authType).toBe(AuthenticationType.NONE);
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("should serialize TranslationRequest into Ollama wire JSON format", () => {
    const adapter = new OllamaAdapter();
    const req = translateRequest({
      modelId: "llama3",
      context: {
        conversationId: "conv-ollama",
        messages: [{ id: "m1", role: "user", content: "Local LLM", timestamp: 1000 }],
      },
      temperature: 0.5,
      maxTokens: 256,
    });

    const serialized = adapter.serializeRequest(req);

    expect(serialized["model"]).toBe("llama3");
    expect(serialized["stream"]).toBe(false);
    expect((serialized["options"] as any)["temperature"]).toBe(0.5);
    expect((serialized["options"] as any)["num_predict"]).toBe(256);
    expect(Object.isFrozen(serialized)).toBe(true);
  });

  it("should parse Ollama response JSON into canonical TranslationResponse", () => {
    const adapter = new OllamaAdapter();
    const mockJson = {
      model: "llama3",
      message: {
        role: "assistant",
        content: "Local response",
      },
      done: true,
      done_reason: "stop",
      prompt_eval_count: 20,
      eval_count: 15,
    };

    const res = adapter.parseResponse(mockJson, "req-ollama", "llama3");

    expect(res.modelId).toBe("llama3");
    expect(res.message.content).toBe("Local response");
    expect(res.usage.totalTokens).toBe(35);
    expect(res.finishReason).toBe("stop");
    expect(Object.isFrozen(res)).toBe(true);
  });
});
