/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Integration Test: ProviderRegistry Integration Suite (`registry.integration.test.ts`)
 *
 * @file registry.integration.test.ts
 * @description Validates complex registry lookups, multi-provider indexing, and snapshot replay.
 */

import { describe, it, expect } from "vitest";
import { ProviderType, ProviderCapability } from "../enums";
import { ProviderRegistry } from "../provider-registry";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 2: ProviderRegistry Integration Suite", () => {
  it("should perform complex multi-attribute provider lookups", () => {
    const registry = new ProviderRegistry();

    const groq = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "groq-cloud",
        vendor: "Groq",
        version: "1.0.0",
        providerType: ProviderType.AI_CLOUD,
        defaultTimeoutMs: 10000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: {
              capabilityId: "c_stream",
              supportsStreaming: true,
              supportsVision: false,
              supportsImageGeneration: false,
              supportsFunctionCalling: false,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "groq-cloud", model: "llama-3.3-70b" }),
    });

    const ollama = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "ollama-local",
        vendor: "Ollama",
        version: "1.0.0",
        providerType: ProviderType.AI_LOCAL,
        defaultTimeoutMs: 60000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: {
              capabilityId: "c_stream",
              supportsStreaming: true,
              supportsVision: false,
              supportsImageGeneration: false,
              supportsFunctionCalling: false,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
          {
            capability: ProviderCapability.VISION,
            metadata: {
              capabilityId: "c_vision",
              supportsStreaming: false,
              supportsVision: true,
              supportsImageGeneration: false,
              supportsFunctionCalling: false,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "ollama-local", model: "llava" }),
    });

    registry.registerProvider(groq);
    registry.registerProvider(ollama);

    const localProviders = registry.lookupProvider({ providerType: ProviderType.AI_LOCAL });
    expect(localProviders.length).toBe(1);
    expect(localProviders[0].providerId).toBe("ollama-local");

    const visionProviders = registry.lookupProvider({ capability: ProviderCapability.VISION });
    expect(visionProviders.length).toBe(1);
    expect(visionProviders[0].providerId).toBe("ollama-local");

    const streamingProviders = registry.lookupProvider({ capability: ProviderCapability.STREAMING });
    expect(streamingProviders.length).toBe(2);
    expect(streamingProviders[0].providerId).toBe("groq-cloud");
    expect(streamingProviders[1].providerId).toBe("ollama-local");
  });

  it("should validate registrations without mutating registry state", () => {
    const registry = new ProviderRegistry();
    const contract = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "test-p",
        vendor: "v1",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
      }),
      configuration: createProviderConfiguration({ providerId: "test-p", model: "m1" }),
    });

    const res1 = registry.validateRegistration(contract);
    expect(res1.isValid).toBe(true);
    expect(registry.hasProvider("test-p")).toBe(false);

    registry.registerProvider(contract);

    const res2 = registry.validateRegistration(contract);
    expect(res2.isValid).toBe(false);
    expect(res2.errors).toContain("Provider 'test-p' is already registered.");
  });
});
