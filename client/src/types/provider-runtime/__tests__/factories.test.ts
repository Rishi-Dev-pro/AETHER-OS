/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Unit Test: Factories & deepFreeze Suite (`factories.test.ts`)
 *
 * @file factories.test.ts
 * @description Validates deepFreeze functionality, invariant validations, and immutable factory constructor behavior.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderType,
  ProviderLifecycleState,
  ProviderCapability,
  ProviderSelectionPolicy,
} from "../enums";
import {
  InvalidProviderMetadataError,
  InvalidProviderConfigurationError,
  ProviderContractError,
  ProviderRegistrationError,
} from "../errors";
import {
  deepFreeze,
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
  createProviderRegistration,
  createProviderValidationResult,
  createProviderExecutionContext,
} from "../factories";

describe("Phase 9.9 — Milestone 1: Factories & Deep Freeze Test Suite", () => {
  it("should deeply freeze nested objects and arrays with deepFreeze()", () => {
    const mutableObj = {
      id: "test",
      nested: {
        count: 10,
        tags: ["a", "b", "c"],
      },
    };

    const frozen = deepFreeze(mutableObj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested.tags)).toBe(true);

    expect(() => {
      // @ts-expect-error Mutation attempt on frozen object
      frozen.nested.count = 20;
    }).toThrow();
  });

  it("should create valid ProviderMetadata using createProviderMetadata()", () => {
    const metadata = createProviderMetadata({
      providerId: "anthropic-claude",
      vendor: "Anthropic",
      version: "1.0.0",
      providerType: ProviderType.AI_CLOUD,
      defaultTimeoutMs: 60000,
      supportsWarmup: true,
      capabilities: [
        {
          capability: ProviderCapability.STREAMING,
          metadata: {
            capabilityId: "cap_streaming",
            supportsStreaming: true,
            supportsVision: true,
            supportsImageGeneration: false,
            supportsFunctionCalling: true,
            supportsVideo: false,
            supportsBatching: false,
          },
        },
      ],
    });

    expect(metadata.providerId).toBe("anthropic-claude");
    expect(metadata.vendor).toBe("Anthropic");
    expect(metadata.supportsWarmup).toBe(true);
    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(metadata.capabilities)).toBe(true);
  });

  it("should throw InvalidProviderMetadataError on invalid createProviderMetadata inputs", () => {
    expect(() => createProviderMetadata({ providerId: "" })).toThrow(InvalidProviderMetadataError);
    expect(() => createProviderMetadata({ providerId: "p1", vendor: "" })).toThrow(InvalidProviderMetadataError);
    expect(() => createProviderMetadata({ providerId: "p1", vendor: "v1", version: "" })).toThrow(InvalidProviderMetadataError);
    expect(() => createProviderMetadata({ providerId: "p1", vendor: "v1", version: "1.0", defaultTimeoutMs: -100 })).toThrow(InvalidProviderMetadataError);
  });

  it("should create ProviderContract and throw ProviderContractError when invalid", () => {
    const meta = createProviderMetadata({
      providerId: "p1",
      vendor: "v1",
      version: "1.0.0",
      defaultTimeoutMs: 1000,
    });
    const cfg = createProviderConfiguration({
      providerId: "p1",
      model: "m1",
    });

    const contract = createProviderContract({
      metadata: meta,
      configuration: cfg,
      lifecycleState: ProviderLifecycleState.READY,
    });

    expect(contract.isAvailable).toBe(true);
    expect(Object.isFrozen(contract)).toBe(true);

    expect(() => createProviderContract({ metadata: meta })).toThrow(ProviderContractError);
  });

  it("should create ProviderRegistration and ProviderValidationResult", () => {
    const meta = createProviderMetadata({
      providerId: "p1",
      vendor: "v1",
      version: "1.0.0",
      defaultTimeoutMs: 1000,
    });

    const reg = createProviderRegistration({
      providerId: "p1",
      metadata: meta,
    });
    expect(reg.providerId).toBe("p1");
    expect(Object.isFrozen(reg)).toBe(true);

    const val = createProviderValidationResult({ isValid: true });
    expect(val.isValid).toBe(true);
    expect(Object.isFrozen(val)).toBe(true);

    expect(() => createProviderRegistration({ providerId: "" })).toThrow(ProviderRegistrationError);
  });

  it("should create valid expanded ProviderExecutionContext with createProviderExecutionContext()", () => {
    const ctx = createProviderExecutionContext({
      requestId: "req_1001",
      providerId: "ollama-local",
      providerType: ProviderType.AI_LOCAL,
      selectionPolicy: ProviderSelectionPolicy.PREFER_LOCAL,
      executionPriority: 5,
      sessionId: "sess_uuid_v4_12345",
      timeoutMs: 45000,
      permissions: ["fs.read", "model.execute"],
      providerConfigurationReference: "cfg_ollama_local",
    });

    expect(ctx.requestId).toBe("req_1001");
    expect(ctx.sessionId).toBe("sess_uuid_v4_12345");
    expect(ctx.providerId).toBe("ollama-local");
    expect(ctx.providerType).toBe(ProviderType.AI_LOCAL);
    expect(ctx.selectionPolicy).toBe(ProviderSelectionPolicy.PREFER_LOCAL);
    expect(ctx.executionPriority).toBe(5);
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.permissions)).toBe(true);
  });
});
