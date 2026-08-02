/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Unit Test: ProviderRegistry Suite (`registry.test.ts`)
 *
 * @file registry.test.ts
 * @description Unit test suite validating provider registration, duplicate detection,
 * registry freezing, alphabetical catalog lookup, and immutable snapshot generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProviderType, ProviderLifecycleState, ProviderCapability } from "../enums";
import {
  DuplicateProviderError,
  ProviderNotFoundError,
  ProviderRegistryFrozenError,
} from "../errors";
import { ProviderRegistry } from "../provider-registry";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 2: ProviderRegistry Test Suite", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("should register providers and retrieve them by providerId", () => {
    const meta = createProviderMetadata({
      providerId: "groq-cloud",
      vendor: "Groq",
      version: "1.0.0",
      defaultTimeoutMs: 15000,
    });
    const cfg = createProviderConfiguration({
      providerId: "groq-cloud",
      model: "llama-3.3-70b",
    });
    const contract = createProviderContract({
      metadata: meta,
      configuration: cfg,
    });

    const entry = registry.registerProvider(contract);
    expect(entry.providerId).toBe("groq-cloud");
    expect(registry.hasProvider("groq-cloud")).toBe(true);

    const fetched = registry.getProvider("groq-cloud");
    expect(fetched.providerId).toBe("groq-cloud");
    expect(Object.isFrozen(fetched)).toBe(true);
  });

  it("should reject duplicate provider registration with DuplicateProviderError", () => {
    const meta = createProviderMetadata({
      providerId: "openai-cloud",
      vendor: "OpenAI",
      version: "1.0.0",
      defaultTimeoutMs: 30000,
    });
    const cfg = createProviderConfiguration({
      providerId: "openai-cloud",
      model: "gpt-4o",
    });
    const contract = createProviderContract({ metadata: meta, configuration: cfg });

    registry.registerProvider(contract);

    expect(() => registry.registerProvider(contract)).toThrow(DuplicateProviderError);
  });

  it("should return sorted provider list and capability list", () => {
    const p1 = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "z-provider",
        vendor: "Vendor Z",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
        capabilities: [
          {
            capability: ProviderCapability.VISION,
            metadata: {
              capabilityId: "c1",
              supportsStreaming: true,
              supportsVision: true,
              supportsImageGeneration: false,
              supportsFunctionCalling: true,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "z-provider", model: "m1" }),
    });

    const p2 = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "a-provider",
        vendor: "Vendor A",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: {
              capabilityId: "c2",
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
      configuration: createProviderConfiguration({ providerId: "a-provider", model: "m2" }),
    });

    registry.registerProvider(p1);
    registry.registerProvider(p2);

    const list = registry.listProviders();
    expect(list.length).toBe(2);
    expect(list[0].providerId).toBe("a-provider");
    expect(list[1].providerId).toBe("z-provider");

    const caps = registry.listCapabilities();
    expect(caps).toEqual(["STREAMING", "VISION"]);
  });

  it("should freeze registry and prevent mutations", () => {
    const p1 = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "p1",
        vendor: "v1",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
      }),
      configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
    });

    registry.registerProvider(p1);
    registry.freezeRegistry();

    expect(registry.isFrozen()).toBe(true);

    const p2 = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "p2",
        vendor: "v2",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
      }),
      configuration: createProviderConfiguration({ providerId: "p2", model: "m2" }),
    });

    expect(() => registry.registerProvider(p2)).toThrow(ProviderRegistryFrozenError);
    expect(() => registry.unregisterProvider("p1")).toThrow(ProviderRegistryFrozenError);
    expect(() => registry.clear()).toThrow(ProviderRegistryFrozenError);
  });

  it("should generate deeply frozen snapshots", () => {
    const p1 = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "p1",
        vendor: "v1",
        version: "1.0.0",
        defaultTimeoutMs: 1000,
      }),
      configuration: createProviderConfiguration({ providerId: "p1", model: "m1" }),
    });

    registry.registerProvider(p1);
    const snap = registry.createSnapshot();

    expect(snap.providersCount).toBe(1);
    expect(snap.providers[0].providerId).toBe("p1");
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.providers)).toBe(true);
  });

  it("should throw ProviderNotFoundError when requesting missing provider", () => {
    expect(() => registry.getProvider("missing-id")).toThrow(ProviderNotFoundError);
    expect(() => registry.unregisterProvider("missing-id")).toThrow(ProviderNotFoundError);
  });
});
