/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Provider Contracts (`contracts.test.ts`)
 */

import { describe, it, expect } from "vitest";
import {
  ProviderAdapterType,
  AdapterStatus,
  AdapterCapability,
  StreamingMode,
  ProviderVendor,
} from "../enums";
import type {
  ProviderAdapter,
  TextGenerationAdapter,
  VisionAdapter,
  EmbeddingAdapter,
  SpeechAdapter,
  ImageGenerationAdapter,
  ToolCallingAdapter,
  StreamingAdapter,
} from "../contracts";
import type { ProviderAdapterDescriptor } from "../adapter-types";
import { createAdapterMetadata, createAdapterDescriptor, createProviderModel, createCapabilityDeclaration } from "../factories";

describe("Phase 9.10 Provider Contracts Interface Compliance", () => {
  function buildMockDescriptor(): Readonly<ProviderAdapterDescriptor> {
    const meta = createAdapterMetadata({
      identity: {
        adapterId: "mock-adapter",
        adapterType: ProviderAdapterType.CUSTOM,
        vendor: ProviderVendor.CUSTOM,
        version: "1.0.0",
      },
      displayName: "Mock Adapter",
    });

    const model = createProviderModel({
      modelId: "mock-model",
      modelName: "Mock Model",
      contextWindowTokens: 4096,
      maxOutputTokens: 1024,
    });

    const caps = createCapabilityDeclaration([AdapterCapability.TEXT_GENERATION]);

    return createAdapterDescriptor({
      metadata: meta,
      supportedModels: [model],
      defaultModelId: "mock-model",
      capabilities: caps,
      status: AdapterStatus.READY,
    });
  }

  it("should implement base ProviderAdapter contract structure", async () => {
    const descriptor = buildMockDescriptor();

    const mockAdapter: ProviderAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      async initialize() {},
      async dispose() {},
      supportsCapability(cap: AdapterCapability) {
        return cap === AdapterCapability.TEXT_GENERATION;
      },
      getDescriptor() {
        return descriptor;
      },
    };

    expect(mockAdapter.identity.adapterId).toBe("mock-adapter");
    expect(mockAdapter.status).toBe(AdapterStatus.READY);
    expect(mockAdapter.supportsCapability(AdapterCapability.TEXT_GENERATION)).toBe(true);
    expect(mockAdapter.supportsCapability(AdapterCapability.VISION)).toBe(false);
    expect(mockAdapter.getDescriptor()).toBe(descriptor);
  });

  it("should verify specialized capability sub-contracts", () => {
    const descriptor = buildMockDescriptor();

    const textAdapter: TextGenerationAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportedTextModels: ["mock-model"],
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const visionAdapter: VisionAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportedVisionModels: ["mock-model-vision"],
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const embeddingAdapter: EmbeddingAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportedEmbeddingModels: ["text-embedding-3"],
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const speechAdapter: SpeechAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportedSpeechModels: ["tts-1"],
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const imageAdapter: ImageGenerationAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportedImageModels: ["dall-e-3"],
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const toolAdapter: ToolCallingAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      supportsToolCalling: true,
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    const streamAdapter: StreamingAdapter = {
      identity: descriptor.identity,
      metadata: descriptor.metadata,
      status: AdapterStatus.READY,
      streamingMode: StreamingMode.SERVER_SENT_EVENTS,
      async initialize() {},
      async dispose() {},
      supportsCapability: () => true,
      getDescriptor: () => descriptor,
    };

    expect(textAdapter.supportedTextModels).toContain("mock-model");
    expect(visionAdapter.supportedVisionModels).toContain("mock-model-vision");
    expect(embeddingAdapter.supportedEmbeddingModels).toContain("text-embedding-3");
    expect(speechAdapter.supportedSpeechModels).toContain("tts-1");
    expect(imageAdapter.supportedImageModels).toContain("dall-e-3");
    expect(toolAdapter.supportsToolCalling).toBe(true);
    expect(streamAdapter.streamingMode).toBe(StreamingMode.SERVER_SENT_EVENTS);
  });
});
