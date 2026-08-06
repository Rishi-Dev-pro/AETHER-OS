/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Ollama Local Concrete Adapter (`ollama-adapter.ts`)
 *
 * @file ollama-adapter.ts
 * @description Concrete provider adapter implementation for local Ollama API (localhost).
 *
 * @module @aether/provider-adapters/ollama-adapter
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderVendor, ProviderAdapterType, AdapterCapability } from "./enums";
import type { ProviderAdapterIdentity, ProviderAdapterMetadata, ProviderModelCapabilities } from "./adapter-types";
import type { AdapterProviderConfig } from "./authentication-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { ProviderBase } from "./provider-base";
import { createOllamaProviderConfig } from "./provider-models";
import { serializeOllamaFormat } from "./provider-serializer";
import { parseOllamaResponse } from "./provider-response-parser";
import { createAdapterMetadata, createCapabilityDeclaration, deepFreeze } from "./factories";

/**
 * Concrete Ollama AI Provider Adapter.
 */
export class OllamaAdapter extends ProviderBase {
  public readonly identity: ProviderAdapterIdentity;
  public readonly metadata: ProviderAdapterMetadata;
  public readonly providerConfig: Readonly<AdapterProviderConfig>;
  public readonly capabilities: Readonly<ProviderModelCapabilities>;

  constructor() {
    super();
    this.providerConfig = createOllamaProviderConfig();
    this.identity = {
      adapterId: "ollama-adapter",
      adapterType: ProviderAdapterType.OLLAMA,
      vendor: ProviderVendor.OLLAMA,
      version: "1.0.0",
    };
    this.metadata = createAdapterMetadata({
      identity: this.identity,
      displayName: "Ollama Local Provider Adapter",
      description: "Adapter communicating with local Ollama service.",
    });
    this.capabilities = createCapabilityDeclaration([
      AdapterCapability.TEXT_GENERATION,
      AdapterCapability.STREAMING,
    ]);
    deepFreeze(this);
  }

  public serializeRequest(request: TranslationRequest): Readonly<Record<string, unknown>> {
    return serializeOllamaFormat(request);
  }

  public parseResponse(
    raw: Record<string, unknown>,
    requestId: string,
    modelId: string
  ): Readonly<TranslationResponse> {
    return parseOllamaResponse(raw, requestId, modelId);
  }
}
