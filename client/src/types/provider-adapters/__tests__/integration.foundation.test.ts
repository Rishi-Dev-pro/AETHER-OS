/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: Foundation & Replay Determinism (`integration.foundation.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderAdapterType,
  AdapterStatus,
  AdapterCapability,
  ModelCapability,
  ModelFamily,
  ProviderVendor,
  RequestType,
  ResponseType,
} from "../enums";
import { ProviderAdapterError, InvalidAdapterError } from "../errors";
import {
  createAdapterMetadata,
  createProviderModel,
  createCapabilityDeclaration,
  createAdapterDescriptor,
  createProviderRequestMetadata,
  createProviderResponseMetadata,
  createUsageStatistics,
} from "../factories";

describe("Phase 9.10 Integration & Replay Determinism Suite", () => {
  it("should execute 100 deterministic replay runs producing strictly identical immutable outputs", () => {
    const replayCount = 100;
    const outputs: string[] = [];

    for (let i = 0; i < replayCount; i++) {
      const meta = createAdapterMetadata({
        identity: {
          adapterId: "nvidia-nim-llama",
          adapterType: ProviderAdapterType.NVIDIA,
          vendor: ProviderVendor.NVIDIA,
          version: "1.0.0",
        },
        displayName: "NVIDIA NIM Llama Adapter",
        description: "NVIDIA NIM microservice adapter",
        minRuntimeVersion: "1.0.0",
      });

      const model = createProviderModel({
        modelId: "meta/llama3-70b-instruct",
        modelName: "Llama 3 70B Instruct",
        family: ModelFamily.LLAMA,
        vendor: ProviderVendor.META,
        contextWindowTokens: 8192,
        maxOutputTokens: 4096,
        capabilities: [ModelCapability.TEXT, ModelCapability.TOOLS],
      });

      const capabilities = createCapabilityDeclaration(
        [AdapterCapability.TEXT_GENERATION, AdapterCapability.STREAMING, AdapterCapability.TOOL_CALLING],
        8192,
        4096
      );

      const descriptor = createAdapterDescriptor({
        metadata: meta,
        supportedModels: [model],
        defaultModelId: "meta/llama3-70b-instruct",
        capabilities,
        status: AdapterStatus.READY,
      });

      const reqMeta = createProviderRequestMetadata({
        requestId: "req-deterministic-001",
        requestType: RequestType.TEXT,
        timestamp: 1700000000000,
        traceId: "trace-fixed-001",
        timeoutMs: 30000,
      });

      const resMeta = createProviderResponseMetadata({
        responseId: "res-deterministic-001",
        requestId: "req-deterministic-001",
        responseType: ResponseType.TEXT,
        timestamp: 1700000005000,
        latencyMs: 250,
        finishReason: "stop",
        modelUsed: "meta/llama3-70b-instruct",
      });

      const usage = createUsageStatistics({
        promptTokens: 120,
        completionTokens: 80,
        estimatedCostUsd: 0.0004,
      });

      // Verify immutability for every replay
      expect(Object.isFrozen(descriptor)).toBe(true);
      expect(Object.isFrozen(descriptor.identity)).toBe(true);
      expect(Object.isFrozen(descriptor.metadata)).toBe(true);
      expect(Object.isFrozen(descriptor.capabilities)).toBe(true);
      expect(Object.isFrozen(reqMeta)).toBe(true);
      expect(Object.isFrozen(resMeta)).toBe(true);
      expect(Object.isFrozen(usage)).toBe(true);

      const serialized = JSON.stringify({
        descriptor,
        reqMeta,
        resMeta,
        usage,
      });

      outputs.push(serialized);
    }

    // Assert all 100 runs produced identical output
    const firstOutput = outputs[0];
    for (let i = 1; i < replayCount; i++) {
      expect(outputs[i]).toBe(firstOutput);
    }
  });

  it("should integrate exception hierarchy with factory errors", () => {
    try {
      createAdapterMetadata({
        displayName: "Missing identity",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderAdapterError);
      expect(err).toBeInstanceOf(InvalidAdapterError);
    }
  });
});
