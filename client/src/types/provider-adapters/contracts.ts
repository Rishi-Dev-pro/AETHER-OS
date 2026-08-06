/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Provider Contracts (`contracts.ts`)
 *
 * @file contracts.ts
 * @description Abstract TypeScript interfaces defining core contracts for provider adapters,
 * text generation, vision, embedding, speech, image generation, tool calling, and streaming capabilities.
 *
 * @module @aether/provider-adapters/contracts
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import {
  AdapterStatus,
  AdapterCapability,
  StreamingMode,
} from "./enums";
import type {
  ProviderAdapterIdentity,
  ProviderAdapterMetadata,
  ProviderAdapterDescriptor,
} from "./adapter-types";

/**
 * Base abstract contract for all Phase 9.10 AI Provider Adapters.
 * Defines identity, metadata, status lifecycle, capability checks, and descriptor inspection.
 */
export interface ProviderAdapter {
  readonly identity: ProviderAdapterIdentity;
  readonly metadata: ProviderAdapterMetadata;
  readonly status: AdapterStatus;

  /**
   * Initializes the adapter and its underlying configuration.
   */
  initialize(): Promise<void>;

  /**
   * Disposes of adapter resources cleanly.
   */
  dispose(): Promise<void>;

  /**
   * Queries whether the adapter supports a given capability.
   */
  supportsCapability(capability: AdapterCapability): boolean;

  /**
   * Returns a complete, frozen descriptor of the provider adapter.
   */
  getDescriptor(): Readonly<ProviderAdapterDescriptor>;
}

/**
 * Interface contract for adapters supporting text generation.
 */
export interface TextGenerationAdapter extends ProviderAdapter {
  readonly supportedTextModels: ReadonlyArray<string>;
}

/**
 * Interface contract for adapters supporting multimodal vision processing.
 */
export interface VisionAdapter extends ProviderAdapter {
  readonly supportedVisionModels: ReadonlyArray<string>;
}

/**
 * Interface contract for adapters supporting vector embeddings.
 */
export interface EmbeddingAdapter extends ProviderAdapter {
  readonly supportedEmbeddingModels: ReadonlyArray<string>;
}

/**
 * Interface contract for adapters supporting text-to-speech or speech-to-text.
 */
export interface SpeechAdapter extends ProviderAdapter {
  readonly supportedSpeechModels: ReadonlyArray<string>;
}

/**
 * Interface contract for adapters supporting image generation.
 */
export interface ImageGenerationAdapter extends ProviderAdapter {
  readonly supportedImageModels: ReadonlyArray<string>;
}

/**
 * Interface contract for adapters supporting function and tool calling.
 */
export interface ToolCallingAdapter extends ProviderAdapter {
  readonly supportsToolCalling: true;
}

/**
 * Interface contract for adapters supporting response streaming.
 */
export interface StreamingAdapter extends ProviderAdapter {
  readonly streamingMode: StreamingMode;
}
