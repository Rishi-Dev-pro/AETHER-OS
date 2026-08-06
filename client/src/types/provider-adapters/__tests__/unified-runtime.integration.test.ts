/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Unified Adapter Runtime Pipeline (`unified-runtime.integration.test.ts`)
 */

import { describe, it, expect, vi } from "vitest";
import { bootstrapRuntime } from "../runtime-bootstrap";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Unified Runtime Pipeline Integration", () => {
  it("should execute end-to-end request pipeline through bootstrapped runtime", async () => {
    const { runtime } = bootstrapRuntime({ autoRegisterDefaultAdapters: true });
    await runtime.initialize();

    runtime.registerCredential("groq-credential-id", "groq-provider", "API_KEY", {
      apiKey: "gsk_integ_test_secret_key_100",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({
          id: "groq-resp-integ",
          model: "llama-3.3-70b-versatile",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "OK" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        }),
    } as Response);

    try {
      const req = translateRequest({
        requestId: "req-unified-integ-1",
        modelId: "llama-3.3-70b-versatile",
        context: {
          conversationId: "conv-unified-1",
          messages: [{ id: "m1", role: "user", content: "Reply with OK", timestamp: 1000 }],
        },
      });

      const response = await runtime.execute("groq-adapter", req);

      expect(response.responseId).toBe("groq-resp-integ");
      expect(response.message.content).toBe("OK");
      expect(response.usage.totalTokens).toBe(12);
      expect(Object.isFrozen(response)).toBe(true);

      const snapshot = runtime.runtimeSnapshot();
      expect(snapshot.registeredAdapterIds.length).toBe(4);
      expect(Object.isFrozen(snapshot)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
