/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: OpenAI Concrete Adapter (`openai-adapter.ts`)
 *
 * @file openai-adapter.ts
 * @description Concrete provider adapter implementation for OpenAI API.
 *
 * @module @aether/provider-adapters/openai-adapter
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderVendor, ProviderAdapterType, AdapterCapability } from "./enums";
import type { ProviderAdapterIdentity, ProviderAdapterMetadata, ProviderModelCapabilities } from "./adapter-types";
import type { AdapterProviderConfig } from "./authentication-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { ProviderBase } from "./provider-base";
import { createOpenAIProviderConfig } from "./provider-models";
import { serializeOpenAIFormat } from "./provider-serializer";
import { parseOpenAIResponse } from "./provider-response-parser";
import { createAdapterMetadata, createCapabilityDeclaration, deepFreeze } from "./factories";

/**
 * Concrete OpenAI AI Provider Adapter.
 */
export class OpenAIAdapter extends ProviderBase {
  public readonly identity: ProviderAdapterIdentity;
  public readonly metadata: ProviderAdapterMetadata;
  public readonly providerConfig: Readonly<AdapterProviderConfig>;
  public readonly capabilities: Readonly<ProviderModelCapabilities>;

  constructor(credentialId: string = "openai-credential-id") {
    super();
    this.providerConfig = createOpenAIProviderConfig(credentialId);
    this.identity = {
      adapterId: "openai-adapter",
      adapterType: ProviderAdapterType.OPENAI,
      vendor: ProviderVendor.OPENAI,
      version: "1.0.0",
    };
    this.metadata = createAdapterMetadata({
      identity: this.identity,
      displayName: "OpenAI Provider Adapter",
      description: "Adapter communicating with OpenAI API endpoints.",
    });
    this.capabilities = createCapabilityDeclaration([
      AdapterCapability.TEXT_GENERATION,
      AdapterCapability.STREAMING,
      AdapterCapability.VISION,
      AdapterCapability.TOOL_CALLING,
      AdapterCapability.STRUCTURED_OUTPUT,
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
