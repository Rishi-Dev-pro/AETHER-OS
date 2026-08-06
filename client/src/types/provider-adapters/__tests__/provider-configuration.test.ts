/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Provider Configuration (`provider-configuration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ProviderVendor, AuthenticationType } from "../enums";
import {
  createProviderEndpointConfig,
  createAdapterProviderConfig,
  verifyNoSecretsInConfig,
} from "../provider-configuration";
import { InvalidProviderConfigError } from "../authentication-errors";

describe("Phase 9.10 Provider Configuration & Secret Isolation", () => {
  it("should construct valid, deeply frozen ProviderEndpointConfig", () => {
    const endpointConfig = createProviderEndpointConfig({
      baseUrl: "https://api.example.com/v1",
      endpoints: {
        chat: "/chat/completions",
        embeddings: "/embeddings",
      },
      defaultApiVersion: "v1",
    });

    expect(endpointConfig.baseUrl).toBe("https://api.example.com/v1");
    expect(endpointConfig.endpoints["chat"]).toBe("/chat/completions");
    expect(endpointConfig.defaultApiVersion).toBe("v1");
    expect(Object.isFrozen(endpointConfig)).toBe(true);
    expect(Object.isFrozen(endpointConfig.endpoints)).toBe(true);
  });

  it("should construct valid AdapterProviderConfig without secret material", () => {
    const providerConfig = createAdapterProviderConfig({
      providerId: "example-ai",
      vendor: ProviderVendor.CUSTOM,
      endpointConfig: {
        baseUrl: "https://api.example.com",
        endpoints: { chat: "/chat" },
      },
      authConfig: {
        authType: AuthenticationType.BEARER_TOKEN,
        credentialId: "cred-123",
      },
      defaultTimeoutMs: 15000,
      supportedModels: ["model-alpha", "model-beta"],
    });

    expect(providerConfig.providerId).toBe("example-ai");
    expect(providerConfig.defaultTimeoutMs).toBe(15000);
    expect(Object.isFrozen(providerConfig)).toBe(true);
    expect(Object.isFrozen(providerConfig.authConfig)).toBe(true);
  });

  it("should throw InvalidProviderConfigError on secret isolation violations", () => {
    const invalidConfig: any = {
      providerId: "leaky-provider",
      vendor: ProviderVendor.CUSTOM,
      endpointConfig: {
        baseUrl: "https://api.example.com",
        endpoints: { chat: "/chat" },
      },
      authConfig: {
        authType: AuthenticationType.API_KEY,
      },
      metadata: {
        apiKey: "sk-secret-key-leaked-12345", // VIOLATION!
      },
    };

    expect(() => verifyNoSecretsInConfig(invalidConfig)).toThrow(InvalidProviderConfigError);
  });

  it("should throw InvalidProviderConfigError on invalid parameters", () => {
    expect(() => createProviderEndpointConfig({ baseUrl: "not-a-url", endpoints: {} })).toThrow(
      InvalidProviderConfigError
    );

    expect(() =>
      createAdapterProviderConfig({
        providerId: "",
        vendor: ProviderVendor.CUSTOM,
        endpointConfig: { baseUrl: "https://example.com", endpoints: { chat: "/chat" } },
      })
    ).toThrow(InvalidProviderConfigError);
  });
});
