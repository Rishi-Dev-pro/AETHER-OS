/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Integration Test: CapabilityNegotiator Integration Suite (`capability-negotiator.integration.test.ts`)
 *
 * @file capability-negotiator.integration.test.ts
 * @description Integration verification suite validating capability negotiation across registered ProviderRegistry catalog snapshots.
 */

import { describe, it, expect } from "vitest";
import { ProviderCapability, ProviderType } from "../enums";
import { ProviderRegistry } from "../provider-registry";
import { CapabilityNegotiator } from "../capability-negotiator";
import {
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
} from "../factories";

describe("Phase 9.9 — Milestone 2: CapabilityNegotiator Integration Suite", () => {
  it("should filter registered providers through CapabilityNegotiator", () => {
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
              capabilityId: "cap_s",
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
      configuration: createProviderConfiguration({ providerId: "groq-cloud", model: "llama" }),
    });

    const anthropic = createProviderContract({
      metadata: createProviderMetadata({
        providerId: "anthropic-claude",
        vendor: "Anthropic",
        version: "1.0.0",
        providerType: ProviderType.AI_CLOUD,
        defaultTimeoutMs: 20000,
        capabilities: [
          {
            capability: ProviderCapability.STREAMING,
            metadata: {
              capabilityId: "cap_s",
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
              capabilityId: "cap_v",
              supportsStreaming: false,
              supportsVision: true,
              supportsImageGeneration: false,
              supportsFunctionCalling: false,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
          {
            capability: ProviderCapability.FUNCTION_CALLING,
            metadata: {
              capabilityId: "cap_f",
              supportsStreaming: false,
              supportsVision: false,
              supportsImageGeneration: false,
              supportsFunctionCalling: true,
              supportsVideo: false,
              supportsBatching: false,
            },
          },
        ],
      }),
      configuration: createProviderConfiguration({ providerId: "anthropic-claude", model: "claude-3-5-sonnet" }),
    });

    registry.registerProvider(groq);
    registry.registerProvider(anthropic);

    const snapshot = registry.createSnapshot();
    const requiredCaps = [ProviderCapability.STREAMING, ProviderCapability.VISION];

    const compatibleProviders = snapshot.providers.filter((entry) => {
      const negotiation = CapabilityNegotiator.negotiateCapabilities(entry.metadata, {
        requiredCapabilities: requiredCaps,
      });
      return negotiation.isFullyCompatible;
    });

    expect(compatibleProviders.length).toBe(1);
    expect(compatibleProviders[0].providerId).toBe("anthropic-claude");
  });

  it("should produce deterministic replay results for identical negotiation inputs", () => {
    const meta = createProviderMetadata({
      providerId: "test-replay",
      vendor: "TestVendor",
      version: "1.0.0",
      defaultTimeoutMs: 5000,
      capabilities: [
        {
          capability: ProviderCapability.VISION,
          metadata: {
            capabilityId: "c1",
            supportsStreaming: false,
            supportsVision: true,
            supportsImageGeneration: false,
            supportsFunctionCalling: false,
            supportsVideo: false,
            supportsBatching: false,
          },
        },
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
    });

    const run1 = CapabilityNegotiator.negotiateCapabilities(meta, {
      requiredCapabilities: [ProviderCapability.STREAMING, ProviderCapability.VISION],
    });
    const run2 = CapabilityNegotiator.negotiateCapabilities(meta, {
      requiredCapabilities: [ProviderCapability.STREAMING, ProviderCapability.VISION],
    });

    expect(run1.supportedCapabilities).toEqual(run2.supportedCapabilities);
    expect(run1.unsupportedCapabilities).toEqual(run2.unsupportedCapabilities);
    expect(run1.isFullyCompatible).toBe(run2.isFullyCompatible);
  });
});
