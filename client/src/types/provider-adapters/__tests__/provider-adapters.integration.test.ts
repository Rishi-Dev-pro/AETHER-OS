/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Provider Adapters & Credential Vault (`provider-adapters.integration.test.ts`)
 */

import { describe, it, expect, vi } from "vitest";
import { OpenAIAdapter } from "../openai-adapter";
import { GroqAdapter } from "../groq-adapter";
import { OllamaAdapter } from "../ollama-adapter";
import { translateRequest } from "../request-translator";
import { CredentialVault } from "../../provider-runtime";

describe("Phase 9.10 Provider Adapters End-to-End Integration", () => {
  it("should execute OpenAIAdapter pipeline end-to-end with CredentialVault authentication", async () => {
    const vault = new CredentialVault();
    const credRef = vault.registerCredential(
      "openai-cred-123",
      "openai-provider",
      "API_KEY",
      { apiKey: "sk-proj-integration-test-key-9999" }
    );

    const adapter = new OpenAIAdapter("openai-cred-123");

    // Mock global fetch for transport dispatch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({
          id: "chatcmpl-integ-openai",
          object: "chat.completion",
          model: "gpt-4o",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "OpenAI integration success." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
        }),
    } as Response);

    try {
      const request = translateRequest({
        requestId: "req-openai-integ-1",
        modelId: "gpt-4o",
        context: {
          conversationId: "conv-openai-1",
          messages: [{ id: "m1", role: "user", content: "Test OpenAI prompt", timestamp: 1000 }],
        },
      });

      const response = await adapter.execute(request, vault, credRef);

      expect(response.responseId).toBe("chatcmpl-integ-openai");
      expect(response.message.content).toBe("OpenAI integration success.");
      expect(response.usage.totalTokens).toBe(25);
      expect(Object.isFrozen(response)).toBe(true);

      // Verify fetch was called with lowercased authorization header containing vault key
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const callArgs = (globalThis.fetch as any).mock.calls[0];
      const reqHeaders = callArgs[1].headers;
      expect(reqHeaders["authorization"]).toBe("Bearer sk-proj-integration-test-key-9999");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should execute OllamaAdapter local execution without authentication", async () => {
    const adapter = new OllamaAdapter();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({
          model: "llama3",
          message: { role: "assistant", content: "Ollama local success." },
          done: true,
          prompt_eval_count: 8,
          eval_count: 6,
        }),
    } as Response);

    try {
      const request = translateRequest({
        requestId: "req-ollama-integ-1",
        modelId: "llama3",
        context: {
          conversationId: "conv-ollama-1",
          messages: [{ id: "m1", role: "user", content: "Test Ollama prompt", timestamp: 1000 }],
        },
      });

      const response = await adapter.execute(request);

      expect(response.message.content).toBe("Ollama local success.");
      expect(response.usage.totalTokens).toBe(14);
      expect(Object.isFrozen(response)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
