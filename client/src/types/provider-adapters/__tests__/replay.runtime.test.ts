/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: 100 Unified Runtime Replay Determinism (`replay.runtime.test.ts`)
 */

import { describe, it, expect, vi } from "vitest";
import { bootstrapRuntime } from "../runtime-bootstrap";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Unified Runtime Replay Determinism", () => {
  it("should execute 100 replay runs of UnifiedAdapterRuntime producing 100% bit-for-bit identical frozen outputs", async () => {
    const { runtime } = bootstrapRuntime();
    await runtime.initialize();

    runtime.registerCredential("nvidia-credential-id", "nvidia-provider", "API_KEY", {
      apiKey: "nvapi-deterministic-replay-secret-key",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () =>
        JSON.stringify({
          id: "chatcmpl-nv-replay-100",
          model: "meta/llama-3.3-70b-instruct",
          choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 12, completion_tokens: 2, total_tokens: 14 },
        }),
    } as Response);

    try {
      const request = translateRequest({
        requestId: "req-runtime-replay-100",
        modelId: "meta/llama-3.3-70b-instruct",
        context: {
          conversationId: "conv-runtime-replay",
          messages: [{ id: "m1", role: "user", content: "Reply OK", timestamp: 1000 }],
        },
      });

      const replayCount = 100;
      const outputs: string[] = [];

      for (let i = 0; i < replayCount; i++) {
        const response = await runtime.execute("nvidia-adapter", request);
        expect(Object.isFrozen(response)).toBe(true);
        expect(Object.isFrozen(response.message)).toBe(true);
        expect(Object.isFrozen(response.usage)).toBe(true);
        outputs.push(JSON.stringify(response));
      }

      const firstOutput = outputs[0];
      for (let i = 1; i < replayCount; i++) {
        expect(outputs[i]).toBe(firstOutput);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
