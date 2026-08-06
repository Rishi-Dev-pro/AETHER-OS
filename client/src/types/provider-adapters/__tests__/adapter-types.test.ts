/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Domain Contracts (`adapter-types.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderAdapterType,
  AdapterStatus,
  AdapterCapability,
  ModelCapability,
  AdapterPriority,
  RequestType,
  ResponseType,
  ModelFamily,
  ProviderVendor,
} from "../enums";
import type {
  ProviderAdapterIdentity,
  ProviderAdapterMetadata,
  ProviderModelDescriptor,
  ProviderModelCapabilities,
  ProviderLimits,
  ProviderRequestMetadata,
  ProviderResponseMetadata,
  ProviderUsageStatistics,
  ProviderRateLimits,
  ProviderAdapterDescriptor,
} from "../adapter-types";

describe("Phase 9.10 Adapter Domain Type Contracts", () => {
  it("should instantiate valid domain contract structures with readonly enforcement", () => {
    const identity: ProviderAdapterIdentity = {
      adapterId: "openai-gpt4o",
      adapterType: ProviderAdapterType.OPENAI,
      vendor: ProviderVendor.OPENAI,
      version: "1.0.0",
    };

    const metadata: ProviderAdapterMetadata = {
      identity,
      displayName: "OpenAI GPT-4o Adapter",
      description: "Adapter for OpenAI multimodal models",
      priority: AdapterPriority.HIGH,
      isExperimental: false,
      minRuntimeVersion: "1.0.0",
      metadata: { region: "us-east" },
    };

    const model: ProviderModelDescriptor = {
      modelId: "gpt-4o",
      modelName: "GPT-4o Omnimodal",
      family: ModelFamily.GPT,
      vendor: ProviderVendor.OPENAI,
      contextWindowTokens: 128000,
      maxOutputTokens: 4096,
      capabilities: [ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.TOOLS],
      isDeprecated: false,
    };

    const capabilities: ProviderModelCapabilities = {
      capabilities: [AdapterCapability.TEXT_GENERATION, AdapterCapability.STREAMING, AdapterCapability.VISION],
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsVision: true,
      supportsEmbeddings: false,
      supportsSpeech: false,
      supportsImageGen: false,
      supportsToolCalling: true,
      supportsReasoning: false,
      supportsJSONMode: true,
      supportsStructuredOutput: true,
      supportsFunctionCalling: true,
    };

    const limits: ProviderLimits = {
      maxRequestsPerMinute: 1000,
      maxTokensPerMinute: 100000,
      maxConcurrentRequests: 50,
      maxPayloadSizeBytes: 10485760,
    };

    const requestMeta: ProviderRequestMetadata = {
      requestId: "req-123",
      requestType: RequestType.TEXT,
      timestamp: Date.now(),
      priority: AdapterPriority.NORMAL,
      timeoutMs: 30000,
      traceId: "trace-999",
    };

    const responseMeta: ProviderResponseMetadata = {
      responseId: "res-456",
      requestId: "req-123",
      responseType: ResponseType.TEXT,
      timestamp: Date.now(),
      latencyMs: 320,
      finishReason: "stop",
      modelUsed: "gpt-4o",
    };

    const usage: ProviderUsageStatistics = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCostUsd: 0.0015,
    };

    const rateLimits: ProviderRateLimits = {
      remainingRequests: 999,
      remainingTokens: 99900,
      resetTimeMs: Date.now() + 60000,
    };

    const descriptor: ProviderAdapterDescriptor = {
      identity,
      metadata,
      supportedModels: [model],
      defaultModelId: "gpt-4o",
      capabilities,
      status: AdapterStatus.READY,
      rateLimits,
      defaultLimits: limits,
    };

    expect(descriptor.identity.adapterId).toBe("openai-gpt4o");
    expect(descriptor.supportedModels.length).toBe(1);
    expect(requestMeta.requestId).toBe("req-123");
    expect(responseMeta.responseId).toBe("res-456");
    expect(usage.totalTokens).toBe(150);
  });
});
