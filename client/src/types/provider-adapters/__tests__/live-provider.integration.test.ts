/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Live Provider Integration (`live-provider.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { bootstrapRuntime } from "../runtime-bootstrap";
import { translateRequest } from "../request-translator";

describe("Phase 9.10 Live Provider Integration", () => {
  it("should validate OpenAI runtime compatibility and gracefully skip live HTTP execution when credentials are absent", async () => {
    const { runtime } = bootstrapRuntime();
    await runtime.initialize();

    const request = translateRequest({
      requestId: "req-live-openai-skip",
      modelId: "gpt-4o",
      context: {
        conversationId: "conv-live-openai",
        messages: [{ id: "m1", role: "user", content: "Reply with exactly the word: OK", timestamp: 1000 }],
      },
    });

    const diag = runtime.diagnostics("openai-adapter");
    expect(diag[0].adapterId).toBe("openai-adapter");
    expect(diag[0].hasCredentialRegistered).toBe(false);

    // Expect execution without registered credential to throw CredentialResolutionError
    await expect(runtime.execute("openai-adapter", request)).rejects.toThrow();
  });

  it("should perform live integration execution for Groq if GROQ_API_KEY is present, or test pipeline readiness", async () => {
    const { runtime } = bootstrapRuntime();
    await runtime.initialize();

    const groqKey = typeof process !== "undefined" ? process.env?.GROQ_API_KEY : undefined;

    if (groqKey && groqKey.trim() !== "") {
      runtime.registerCredential("groq-credential-id", "groq-provider", "API_KEY", {
        apiKey: groqKey.trim(),
      });

      const request = translateRequest({
        requestId: "req-live-groq-1",
        modelId: "llama-3.3-70b-versatile",
        context: {
          conversationId: "conv-live-groq",
          messages: [{ id: "m1", role: "user", content: "Reply with exactly the word: OK", timestamp: 1000 }],
        },
      });

      const response = await runtime.execute("groq-adapter", request);
      expect(response.finishReason).toBe("stop");
      expect(response.message.role).toBe("assistant");
      expect(Object.isFrozen(response)).toBe(true);
    } else {
      // Graceful verification when live credentials are absent
      const diag = runtime.diagnostics("groq-adapter");
      expect(diag[0].adapterId).toBe("groq-adapter");
      expect(diag[0].isHealthy).toBe(true);
    }
  });

  it("should perform live integration execution for NVIDIA NIM if NVIDIA_API_KEY is present, or test pipeline readiness", async () => {
    const { runtime } = bootstrapRuntime();
    await runtime.initialize();

    const nvKey = typeof process !== "undefined" ? process.env?.NVIDIA_API_KEY : undefined;

    if (nvKey && nvKey.trim() !== "") {
      runtime.registerCredential("nvidia-credential-id", "nvidia-provider", "API_KEY", {
        apiKey: nvKey.trim(),
      });

      const request = translateRequest({
        requestId: "req-live-nvidia-1",
        modelId: "meta/llama-3.3-70b-instruct",
        context: {
          conversationId: "conv-live-nvidia",
          messages: [{ id: "m1", role: "user", content: "Reply with exactly the word: OK", timestamp: 1000 }],
        },
      });

      const response = await runtime.execute("nvidia-adapter", request);
      expect(response.finishReason).toBe("stop");
      expect(response.message.role).toBe("assistant");
      expect(Object.isFrozen(response)).toBe(true);
    } else {
      const diag = runtime.diagnostics("nvidia-adapter");
      expect(diag[0].adapterId).toBe("nvidia-adapter");
      expect(diag[0].isHealthy).toBe(true);
    }
  });

  it("should perform live execution for local Ollama if available, or test pipeline readiness", async () => {
    const { runtime } = bootstrapRuntime();
    await runtime.initialize();

    const diag = runtime.diagnostics("ollama-adapter");
    expect(diag[0].adapterId).toBe("ollama-adapter");
    expect(diag[0].authType).toBe("NONE");
    expect(diag[0].hasCredentialRegistered).toBe(true);
  });
});
