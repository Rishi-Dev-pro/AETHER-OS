/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Endpoint Resolver (`endpoint-resolver.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { resolveEndpoint } from "../endpoint-resolver";
import { createProviderEndpointConfig } from "../provider-configuration";
import { EndpointResolutionError } from "../authentication-errors";

describe("Phase 9.10 Endpoint Resolver Determinism & URL Formatting", () => {
  it("should resolve clean fullUrl and endpointPath without double slashes", () => {
    const config = createProviderEndpointConfig({
      baseUrl: "https://api.example.com/v1/",
      endpoints: {
        chat: "/chat/completions",
        embeddings: "embeddings",
      },
    });

    const resolvedChat = resolveEndpoint(config, "chat");
    expect(resolvedChat.fullUrl).toBe("https://api.example.com/v1/chat/completions");
    expect(resolvedChat.endpointPath).toBe("/chat/completions");
    expect(Object.isFrozen(resolvedChat)).toBe(true);

    const resolvedEmbeddings = resolveEndpoint(config, "embeddings");
    expect(resolvedEmbeddings.fullUrl).toBe("https://api.example.com/v1/embeddings");
    expect(resolvedEmbeddings.endpointPath).toBe("/embeddings");
  });

  it("should handle {version} template replacement in endpoint path", () => {
    const config = createProviderEndpointConfig({
      baseUrl: "https://api.example.com",
      endpoints: {
        templated: "/{version}/models",
      },
      defaultApiVersion: "v2",
    });

    const resolvedDefault = resolveEndpoint(config, "templated");
    expect(resolvedDefault.fullUrl).toBe("https://api.example.com/v2/models");
    expect(resolvedDefault.apiVersion).toBe("v2");

    const resolvedOverride = resolveEndpoint(config, "templated", "v3");
    expect(resolvedOverride.fullUrl).toBe("https://api.example.com/v3/models");
    expect(resolvedOverride.apiVersion).toBe("v3");
  });

  it("should throw EndpointResolutionError when endpointKey is not found", () => {
    const config = createProviderEndpointConfig({
      baseUrl: "https://api.example.com",
      endpoints: { chat: "/chat" },
    });

    expect(() => resolveEndpoint(config, "non-existent-key")).toThrow(EndpointResolutionError);
  });

  it("should throw EndpointResolutionError on missing parameters", () => {
    const config = createProviderEndpointConfig({
      baseUrl: "https://api.example.com",
      endpoints: { chat: "/chat" },
    });

    expect(() => resolveEndpoint(config, "")).toThrow(EndpointResolutionError);
    expect(() => resolveEndpoint(null as any, "chat")).toThrow(EndpointResolutionError);
  });
});
