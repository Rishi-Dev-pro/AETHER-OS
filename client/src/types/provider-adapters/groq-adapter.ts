/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Groq Concrete Adapter (`groq-adapter.ts`)
 *
 * @file groq-adapter.ts
 * @description Concrete provider adapter implementation for Groq LPU Cloud API.
 *
 * @module @aether/provider-adapters/groq-adapter
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderVendor, ProviderAdapterType, AdapterCapability } from "./enums";
import type { ProviderAdapterIdentity, ProviderAdapterMetadata, ProviderModelCapabilities } from "./adapter-types";
import type { AdapterProviderConfig } from "./authentication-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { ProviderBase } from "./provider-base";
import { createGroqProviderConfig } from "./provider-models";
import { serializeOpenAIFormat } from "./provider-serializer";
import { parseOpenAIResponse } from "./provider-response-parser";
import { createAdapterMetadata, createCapabilityDeclaration, deepFreeze } from "./factories";

/**
 * Concrete Groq AI Provider Adapter.
 */
export class GroqAdapter extends ProviderBase {
  public readonly identity: ProviderAdapterIdentity;
  public readonly metadata: ProviderAdapterMetadata;
  public readonly providerConfig: Readonly<AdapterProviderConfig>;
  public readonly capabilities: Readonly<ProviderModelCapabilities>;

  constructor(credentialId: string = "groq-credential-id") {
    super();
    this.providerConfig = createGroqProviderConfig(credentialId);
    this.identity = {
      adapterId: "groq-adapter",
      adapterType: ProviderAdapterType.GROQ,
      vendor: ProviderVendor.GROQ,
      version: "1.0.0",
    };
    this.metadata = createAdapterMetadata({
      identity: this.identity,
      displayName: "Groq Provider Adapter",
      description: "Adapter communicating with Groq LPU Cloud API.",
    });
    this.capabilities = createCapabilityDeclaration([
      AdapterCapability.TEXT_GENERATION,
      AdapterCapability.STREAMING,
      AdapterCapability.TOOL_CALLING,
      AdapterCapability.JSON_MODE,
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
