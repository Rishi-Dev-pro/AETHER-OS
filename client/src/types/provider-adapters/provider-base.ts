/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Provider Base Abstract Class (`provider-base.ts`)
 *
 * @file provider-base.ts
 * @description Abstract base class for concrete AI provider adapters. Implements the foundation
 * ProviderAdapter interface and orchestrates runtime validation, request translation, request pipeline assembly,
 * authentication delegation, HTTP dispatch, and response parsing.
 *
 * @module @aether/provider-adapters/provider-base
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { AdapterStatus, AdapterCapability } from "./enums";
import type { ProviderAdapter } from "./contracts";
import type {
  ProviderAdapterIdentity,
  ProviderAdapterMetadata,
  ProviderAdapterDescriptor,
  ProviderModelCapabilities,
} from "./adapter-types";
import type { AdapterProviderConfig } from "./authentication-types";
import type { TranslationRequest, TranslationResponse } from "./message-types";
import { validateTranslationRequest } from "./payload-validator";
import { buildPipelineRequest } from "./request-pipeline";
import { HttpClient } from "./http-client";
import { ResponseTranslationError } from "./translation-errors";
import type { CredentialVault, CredentialReference } from "../provider-runtime";
import { deepFreeze, createAdapterDescriptor } from "./factories";

/**
 * Abstract base class for all concrete AI provider adapters.
 */
export abstract class ProviderBase implements ProviderAdapter {
  public abstract readonly identity: ProviderAdapterIdentity;
  public abstract readonly metadata: ProviderAdapterMetadata;
  public abstract readonly providerConfig: Readonly<AdapterProviderConfig>;
  public abstract readonly capabilities: Readonly<ProviderModelCapabilities>;
  public readonly status: AdapterStatus = AdapterStatus.READY;

  /**
   * Initializes adapter lifecycle resources.
   */
  public async initialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Disposes adapter lifecycle resources.
   */
  public async dispose(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Checks whether the adapter supports a given capability.
   */
  public supportsCapability(capability: AdapterCapability): boolean {
    return this.capabilities.capabilities.includes(capability);
  }

  /**
   * Returns a complete, frozen descriptor of the provider adapter.
   */
  public getDescriptor(): Readonly<ProviderAdapterDescriptor> {
    const supportedModels = this.providerConfig.supportedModels.map((modelId) => ({
      modelId,
      modelName: modelId,
      family: 0 as any,
      vendor: this.identity.vendor,
      contextWindowTokens: this.capabilities.maxContextTokens,
      maxOutputTokens: this.capabilities.maxOutputTokens,
      capabilities: [],
      isDeprecated: false,
    }));

    return createAdapterDescriptor({
      metadata: this.metadata,
      supportedModels,
      defaultModelId: this.providerConfig.supportedModels[0] || "default-model",
      capabilities: this.capabilities,
      status: this.status,
    });
  }

  /**
   * Serializes a canonical TranslationRequest into the provider's native wire JSON format.
   */
  public abstract serializeRequest(request: TranslationRequest): Readonly<Record<string, unknown>>;

  /**
   * Parses raw provider response JSON back into a canonical TranslationResponse contract.
   */
  public abstract parseResponse(
    raw: Record<string, unknown>,
    requestId: string,
    modelId: string
  ): Readonly<TranslationResponse>;

  /**
   * Executes a complete AI request end-to-end through translation, serialization, request pipeline assembly,
   * authentication delegation, transport execution, and response parsing.
   */
  public async execute(
    request: TranslationRequest,
    vault?: CredentialVault,
    credentialRef?: CredentialReference
  ): Promise<Readonly<TranslationResponse>> {
    // 1. Runtime validation
    validateTranslationRequest(request);

    // 2. Serialize canonical request into provider wire format
    const serializedBody = this.serializeRequest(request);

    // 3. Assemble authenticated HTTP request via Milestone 3 RequestPipeline
    const httpRequest = await buildPipelineRequest(
      {
        providerConfig: this.providerConfig,
        endpointKey: "chat",
        method: "POST",
        body: serializedBody,
        requestId: request.requestId,
        credentialRef,
      },
      vault
    );

    // 4. Dispatch transport execution via Milestone 2 HttpClient instance
    const httpClient = new HttpClient();
    const httpResponse = await httpClient.execute({
      method: httpRequest.method,
      url: httpRequest.url,
      headers: httpRequest.headers,
      queryParams: httpRequest.queryParams,
      body: httpRequest.body,
      timeoutMs: httpRequest.timeoutMs,
      requestId: httpRequest.requestId,
    });

    if (!httpResponse.ok) {
      throw new ResponseTranslationError(
        `Provider execution failed with HTTP status ${httpResponse.statusCode}: ${
          typeof httpResponse.body === "string" ? httpResponse.body : JSON.stringify(httpResponse.body)
        }`
      );
    }

    const rawJson =
      typeof httpResponse.body === "object" && httpResponse.body !== null
        ? (httpResponse.body as Record<string, unknown>)
        : JSON.parse(String(httpResponse.body || "{}"));

    // 5. Parse response body back into canonical TranslationResponse
    const translatedResponse = this.parseResponse(rawJson, request.requestId, request.modelId);

    return deepFreeze(translatedResponse);
  }

  /**
   * Executes a streaming request yielding StreamingChunk domain objects.
   */
  public async *executeStreaming(
    request: TranslationRequest,
    vault?: CredentialVault,
    credentialRef?: CredentialReference,
    signal?: AbortSignal
  ): AsyncGenerator<import("../../runtime/streaming/streaming-contracts").StreamingChunk, void, unknown> {
    validateTranslationRequest(request);

    const serializedBody = {
      ...this.serializeRequest(request),
      stream: true,
    };

    const httpRequest = await buildPipelineRequest(
      {
        providerConfig: this.providerConfig,
        endpointKey: "chat",
        method: "POST",
        body: serializedBody,
        requestId: request.requestId,
        credentialRef,
      },
      vault
    );

    const httpClient = new HttpClient();
    const byteStream = await httpClient.executeStream(
      {
        method: httpRequest.method,
        url: httpRequest.url,
        headers: httpRequest.headers,
        queryParams: httpRequest.queryParams,
        body: httpRequest.body,
        timeoutMs: httpRequest.timeoutMs,
        requestId: httpRequest.requestId,
      },
      signal
    );

    const { parseSSEStream } = await import("./stream-parser");
    yield* parseSSEStream(byteStream, request.requestId);
  }
}



