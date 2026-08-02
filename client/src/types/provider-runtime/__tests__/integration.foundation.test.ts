/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 1 Integration Test: Foundation & Barrel Export Suite (`integration.foundation.test.ts`)
 *
 * @file integration.foundation.test.ts
 * @description Integration verification suite validating end-to-end foundation contract construction,
 * barrel exports, immutability guarantees, and zero provider dependency leakages.
 */

import { describe, it, expect } from "vitest";
import {
  ProviderType,
  ProviderStatus,
  ProviderLifecycleState,
  ProviderCapability,
  ProviderSelectionPolicy,
  CircuitBreakerState,
  SessionType,
  ProviderRuntimeError,
  InvalidProviderConfigurationError,
  InvalidProviderMetadataError,
  createProviderMetadata,
  createProviderConfiguration,
  createProviderContract,
  createProviderRegistration,
  createProviderExecutionContext,
  verifyNoSecrets,
  deepFreeze,
} from "../index";

describe("Phase 9.9 — Milestone 1: Foundation Integration Test Suite", () => {
  it("should export all public contracts, enums, factories, and errors from canonical barrel index", () => {
    expect(ProviderType).toBeDefined();
    expect(ProviderStatus).toBeDefined();
    expect(ProviderLifecycleState).toBeDefined();
    expect(ProviderCapability).toBeDefined();
    expect(ProviderSelectionPolicy).toBeDefined();
    expect(CircuitBreakerState).toBeDefined();
    expect(SessionType).toBeDefined();

    expect(ProviderRuntimeError).toBeDefined();
    expect(InvalidProviderConfigurationError).toBeDefined();

    expect(createProviderMetadata).toBeTypeOf("function");
    expect(createProviderConfiguration).toBeTypeOf("function");
    expect(createProviderContract).toBeTypeOf("function");
    expect(createProviderRegistration).toBeTypeOf("function");
    expect(createProviderExecutionContext).toBeTypeOf("function");
    expect(verifyNoSecrets).toBeTypeOf("function");
    expect(deepFreeze).toBeTypeOf("function");
  });

  it("should assemble a complete frozen provider foundation environment", () => {
    const metadata = createProviderMetadata({
      providerId: "nvidia-nim-cloud",
      vendor: "NVIDIA",
      version: "1.2.0",
      providerType: ProviderType.AI_CLOUD,
      defaultTimeoutMs: 30000,
      supportsWarmup: true,
    });

    const configuration = createProviderConfiguration({
      providerId: "nvidia-nim-cloud",
      model: "meta/llama-3.3-70b-instruct",
      timeoutMs: 30000,
      temperature: 0.2,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    const contract = createProviderContract({
      metadata,
      configuration,
      lifecycleState: ProviderLifecycleState.READY,
      isAvailable: true,
    });

    const context = createProviderExecutionContext({
      requestId: "req_int_9000",
      providerId: "nvidia-nim-cloud",
      providerType: ProviderType.AI_CLOUD,
      selectionPolicy: ProviderSelectionPolicy.LOWEST_LATENCY,
      executionPriority: 1,
      timeoutMs: 30000,
      providerConfigurationReference: configuration.configurationId,
    });

    expect(contract.metadata.providerId).toBe("nvidia-nim-cloud");
    expect(contract.configuration.model).toBe("meta/llama-3.3-70b-instruct");
    expect(context.providerConfigurationReference).toBe(configuration.configurationId);

    expect(Object.isFrozen(metadata)).toBe(true);
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("should enforce fail-fast error throwing on invalid configuration attempts", () => {
    expect(() =>
      createProviderConfiguration({
        providerId: "test",
        model: "m1",
        // @ts-expect-error Secret key test
        client_secret: "unauthorized-secret-string",
      })
    ).toThrow(InvalidProviderConfigurationError);
  });
});
