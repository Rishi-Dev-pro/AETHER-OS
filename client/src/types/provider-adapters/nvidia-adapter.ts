/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: NVIDIA NIM Concrete Adapter (`nvidia-adapter.ts`)
 *
 * @file nvidia-adapter.ts
 * @description Concrete provider adapter implementation for NVIDIA NIM API.
 *
 * @module @aether/provider-adapters/nvidia-adapter
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderVendor, ProviderAdapterType, AdapterCapability } from "./enums";
import type { ProviderAdapterIdentity, ProviderAdapterMetadata, ProviderModelCapabilities } from "./adapter-types";
import type { AdapterProviderConfig } from "./authentication-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { ProviderBase } from "./provider-base";
import { createNVIDIAProviderConfig } from "./provider-models";
import { serializeOpenAIFormat } from "./provider-serializer";
import { parseOpenAIResponse } from "./provider-response-parser";
import { createAdapterMetadata, createCapabilityDeclaration, deepFreeze } from "./factories";

/**
 * Concrete NVIDIA NIM AI Provider Adapter.
 */
export class NVIDIAAdapter extends ProviderBase {
  public readonly identity: ProviderAdapterIdentity;
  public readonly metadata: ProviderAdapterMetadata;
  public readonly providerConfig: Readonly<AdapterProviderConfig>;
  public readonly capabilities: Readonly<ProviderModelCapabilities>;

  constructor(credentialId: string = "nvidia-credential-id") {
    super();
    this.providerConfig = createNVIDIAProviderConfig(credentialId);
    this.identity = {
      adapterId: "nvidia-adapter",
      adapterType: ProviderAdapterType.NVIDIA,
      vendor: ProviderVendor.NVIDIA,
      version: "1.0.0",
    };
    this.metadata = createAdapterMetadata({
      identity: this.identity,
      displayName: "NVIDIA NIM Provider Adapter",
      description: "Adapter communicating with NVIDIA NIM API.",
    });
    this.capabilities = createCapabilityDeclaration([
      AdapterCapability.TEXT_GENERATION,
      AdapterCapability.STREAMING,
      AdapterCapability.TOOL_CALLING,
      AdapterCapability.VISION,
    ]);
    deepFreeze(this);
  }

  public serializeRequest(request: TranslationRequest): Readonly<Record<string, unknown>> {
    return serializeOpenAIFormat(request);
  }

  public parseResponse(
    raw: Record<string, unknown>,
    requestId: string,
    modelId: string
  ): Readonly<TranslationResponse> {
    return parseOpenAIResponse(raw, requestId, modelId);
  }
}
