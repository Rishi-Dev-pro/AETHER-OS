/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Request Pipeline & 100 Replay Determinism (`request-pipeline.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ProviderVendor, AuthenticationType } from "../enums";
import { createAdapterProviderConfig } from "../provider-configuration";
import { buildPipelineRequest } from "../request-pipeline";
import { CredentialVault } from "../../provider-runtime";

describe("Phase 9.10 Request Pipeline End-to-End & Replay Determinism", () => {
  it("should execute full request pipeline and 100 deterministic replay runs producing identical outputs", async () => {
    const vault = new CredentialVault();
    const credRef = vault.registerCredential(
      "pipeline-cred-001",
      "groq-provider",
      "API_KEY",
      { apiKey: "gsk_deterministic_test_key_001" }
    );

    const providerConfig = createAdapterProviderConfig({
      providerId: "groq-provider",
      vendor: ProviderVendor.GROQ,
      endpointConfig: {
        baseUrl: "https://api.groq.com/openai/v1",
        endpoints: {
          chat: "/chat/completions",
        },
      },
      authConfig: {
        authType: AuthenticationType.BEARER_TOKEN,
        credentialId: "pipeline-cred-001",
      },
      defaultTimeoutMs: 20000,
    });

    const replayCount = 100;
    const outputs: string[] = [];

    for (let i = 0; i < replayCount; i++) {
      const httpRequest = await buildPipelineRequest(
        {
          providerConfig,
          endpointKey: "chat",
          method: "POST",
          queryParams: {
            stream: "false",
            temperature: 0.7,
          },
          extraHeaders: {
            "X-Client-Version": "1.0.0",
          },
          body: {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Deterministic test prompt" }],
          },
          requestId: "req-deterministic-pipeline-001",
          credentialRef: credRef,
        },
        vault
      );

      // Assert deep immutability across returned request
      expect(Object.isFrozen(httpRequest)).toBe(true);
      expect(Object.isFrozen(httpRequest.headers)).toBe(true);
      expect(Object.isFrozen(httpRequest.queryParams)).toBe(true);
      expect(Object.isFrozen(httpRequest.body)).toBe(true);

      expect(httpRequest.url).toBe("https://api.groq.com/openai/v1/chat/completions");
      expect(httpRequest.queryParams["stream"]).toBe("false");
      expect(httpRequest.headers["authorization"]).toBe("Bearer gsk_deterministic_test_key_001");
      expect(httpRequest.headers["x-client-version"]).toBe("1.0.0");

      const serialized = JSON.stringify({
        method: httpRequest.method,
        url: httpRequest.url,
        headers: httpRequest.headers,
        queryParams: httpRequest.queryParams,
        body: httpRequest.body,
        timeoutMs: httpRequest.timeoutMs,
        requestId: httpRequest.requestId,
      });

      outputs.push(serialized);
    }

    // Assert all 100 replay runs produced bit-for-bit identical outputs
    const firstOutput = outputs[0];
    for (let i = 1; i < replayCount; i++) {
      expect(outputs[i]).toBe(firstOutput);
    }
  });
});
