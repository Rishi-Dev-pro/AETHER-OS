/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Request Pipeline (`request-pipeline.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ProviderVendor, AuthenticationType } from "../enums";
import { createAdapterProviderConfig } from "../provider-configuration";
import { buildPipelineRequest } from "../request-pipeline";
import { PipelineExecutionError } from "../authentication-errors";

describe("Phase 9.10 Request Pipeline Engine", () => {
  function buildTestProviderConfig() {
    return createAdapterProviderConfig({
      providerId: "test-provider",
      vendor: ProviderVendor.CUSTOM,
      endpointConfig: {
        baseUrl: "https://api.test.com/v1",
        endpoints: {
          chat: "/chat/completions",
          embeddings: "/embeddings",
        },
      },
      authConfig: {
        authType: AuthenticationType.BEARER_TOKEN,
      },
      defaultTimeoutMs: 12000,
    });
  }

  it("should assemble a complete, authenticated, deeply frozen HttpRequest", async () => {
    const providerConfig = buildTestProviderConfig();

    const req = await buildPipelineRequest({
      providerConfig,
      endpointKey: "chat",
      method: "POST",
      queryParams: { model: "gpt-4o" },
      extraHeaders: { "X-Custom-Client": "AETHER-OS" },
      body: { messages: [{ role: "user", content: "Hello pipeline" }] },
      requestId: "req-pipeline-1",
      rawCredentials: { secret: "sk-test-token" },
    });

    expect(req.url).toBe("https://api.test.com/v1/chat/completions");
    expect(req.method).toBe("POST");
    expect(req.headers["authorization"]).toBe("Bearer sk-test-token");
    expect(req.headers["x-custom-client"]).toBe("AETHER-OS");
    expect(req.queryParams["model"]).toBe("gpt-4o");
    expect(req.timeoutMs).toBe(12000);
    expect(req.requestId).toBe("req-pipeline-1");
    expect(Object.isFrozen(req)).toBe(true);
    expect(Object.isFrozen(req.headers)).toBe(true);
  });

  it("should throw PipelineExecutionError on invalid endpoint key", async () => {
    const providerConfig = buildTestProviderConfig();

    await expect(
      buildPipelineRequest({
        providerConfig,
        endpointKey: "invalid-endpoint",
        method: "GET",
        rawCredentials: { secret: "sk-test" },
      })
    ).rejects.toThrow(PipelineExecutionError);
  });

  it("should throw PipelineExecutionError when missing providerConfig or context", async () => {
    await expect(buildPipelineRequest(null as any)).rejects.toThrow(PipelineExecutionError);
  });
});
