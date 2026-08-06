/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Domain Contracts (`adapter-types.ts`)
 *
 * @file adapter-types.ts
 * @description Pure, immutable interface declarations defining provider adapter identities,
 * model descriptors, capability sets, rate limits, execution request/response metadata,
 * usage statistics, and full adapter descriptors.
 *
 * @module @aether/provider-adapters/adapter-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

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
} from "./enums";

/**
 * Unique identity descriptor for a provider adapter instance.
 */
export interface ProviderAdapterIdentity {
  readonly adapterId: string;
  readonly adapterType: ProviderAdapterType;
  readonly vendor: ProviderVendor;
  readonly version: string;
}

/**
 * Complete metadata profile for a provider adapter.
 */
export interface ProviderAdapterMetadata {
  readonly identity: ProviderAdapterIdentity;
  readonly displayName: string;
  readonly description: string;
  readonly priority: AdapterPriority;
  readonly isExperimental: boolean;
  readonly minRuntimeVersion: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Specification and context windows for a supported model.
 */
export interface ProviderModelDescriptor {
  readonly modelId: string;
  readonly modelName: string;
  readonly family: ModelFamily;
  readonly vendor: ProviderVendor;
  readonly contextWindowTokens: number;
  readonly maxOutputTokens: number;
  readonly capabilities: ReadonlyArray<ModelCapability>;
  readonly isDeprecated: boolean;
}

/**
 * Comprehensive capabilities matrix for an adapter or model.
 */
export interface ProviderModelCapabilities {
  readonly capabilities: ReadonlyArray<AdapterCapability>;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsEmbeddings: boolean;
  readonly supportsSpeech: boolean;
  readonly supportsImageGen: boolean;
  readonly supportsToolCalling: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsJSONMode: boolean;
  readonly supportsStructuredOutput: boolean;
  readonly supportsFunctionCalling: boolean;
}

/**
 * Operating throughput limits and payload constraints.
 */
export interface ProviderLimits {
  readonly maxRequestsPerMinute: number;
  readonly maxTokensPerMinute: number;
  readonly maxConcurrentRequests: number;
  readonly maxPayloadSizeBytes: number;
}

/**
 * Metadata attached to an outgoing provider adapter request.
 */
export interface ProviderRequestMetadata {
  readonly requestId: string;
  readonly requestType: RequestType;
  readonly timestamp: number;
  readonly priority: AdapterPriority;
  readonly timeoutMs: number;
  readonly traceId: string;
  readonly callerId?: string;
}

/**
 * Telemetry and response metadata attached to adapter output.
 */
export interface ProviderResponseMetadata {
  readonly responseId: string;
  readonly requestId: string;
  readonly responseType: ResponseType;
  readonly timestamp: number;
  readonly latencyMs: number;
  readonly finishReason: string;
  readonly modelUsed: string;
}

/**
 * Token usage counters and cost accounting.
 */
export interface ProviderUsageStatistics {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUsd?: number;
}

/**
 * Real-time rate limit accounting details.
 */
export interface ProviderRateLimits {
  readonly remainingRequests: number;
  readonly remainingTokens: number;
  readonly resetTimeMs: number;
}

/**
 * Full structural descriptor combining metadata, capabilities, status, and supported models.
 */
export interface ProviderAdapterDescriptor {
  readonly identity: ProviderAdapterIdentity;
  readonly metadata: ProviderAdapterMetadata;
  readonly supportedModels: ReadonlyArray<ProviderModelDescriptor>;
  readonly defaultModelId: string;
  readonly capabilities: ProviderModelCapabilities;
  readonly status: AdapterStatus;
  readonly rateLimits?: ProviderRateLimits;
  readonly defaultLimits?: ProviderLimits;
}
