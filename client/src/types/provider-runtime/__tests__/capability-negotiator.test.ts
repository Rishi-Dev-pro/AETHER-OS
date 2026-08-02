/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Unit Test: CapabilityNegotiator Suite (`capability-negotiator.test.ts`)
 *
 * @file capability-negotiator.test.ts
 * @description Validates capability matching, partition into supported vs unsupported,
 * strict mode behavior, and immutable negotiation results.
 */

import { describe, it, expect } from "vitest";
import { ProviderCapability } from "../enums";
import { IncompatibleCapabilityError } from "../errors";
import { CapabilityNegotiator } from "../capability-negotiator";
import { createProviderMetadata } from "../factories";

describe("Phase 9.9 — Milestone 2: CapabilityNegotiator Test Suite", () => {
  const sampleMetadata = createProviderMetadata({
    providerId: "openai-gpt4o",
    vendor: "OpenAI",
    version: "1.0.0",
    defaultTimeoutMs: 30000,
    capabilities: [
      {
        capability: ProviderCapability.STREAMING,
        metadata: {
          capabilityId: "cap_1",
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
          capabilityId: "cap_2",
          supportsStreaming: false,
          supportsVision: true,
          supportsImageGeneration: false,
          supportsFunctionCalling: false,
          supportsVideo: false,
          supportsBatching: false,
        },
      },
    ],
  });

  it("should negotiate capabilities and return supported/unsupported partitions", () => {
    const result = CapabilityNegotiator.negotiateCapabilities(sampleMetadata, {
      requiredCapabilities: [ProviderCapability.STREAMING, ProviderCapability.VISION],
      optionalCapabilities: [ProviderCapability.IMAGE_GENERATION],
    });

    expect(result.providerId).toBe("openai-gpt4o");
    expect(result.isFullyCompatible).toBe(true);
    expect(result.supportedCapabilities).toEqual(["STREAMING", "VISION"]);
    expect(result.unsupportedCapabilities).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("should detect unsupported capabilities and mark isFullyCompatible as false", () => {
    const result = CapabilityNegotiator.negotiateCapabilities(sampleMetadata, {
      requiredCapabilities: [ProviderCapability.STREAMING, ProviderCapability.FUNCTION_CALLING],
    });

    expect(result.isFullyCompatible).toBe(false);
    expect(result.supportedCapabilities).toEqual(["STREAMING"]);
    expect(result.unsupportedCapabilities).toEqual(["FUNCTION_CALLING"]);
  });

  it("should throw IncompatibleCapabilityError when strict option is set to true", () => {
    expect(() =>
      CapabilityNegotiator.negotiateCapabilities(
        sampleMetadata,
        {
          requiredCapabilities: [ProviderCapability.STREAMING, ProviderCapability.IMAGE_GENERATION],
        },
        { strict: true }
      )
    ).toThrow(IncompatibleCapabilityError);
  });

  it("should validate capabilities using validateCapabilities() fast boolean check", () => {
    const hasStreamingAndVision = CapabilityNegotiator.validateCapabilities(sampleMetadata, [
      ProviderCapability.STREAMING,
      ProviderCapability.VISION,
    ]);
    expect(hasStreamingAndVision).toBe(true);

    const hasFuncCalling = CapabilityNegotiator.validateCapabilities(sampleMetadata, [
      ProviderCapability.FUNCTION_CALLING,
    ]);
    expect(hasFuncCalling).toBe(false);
  });
});
