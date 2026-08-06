/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Foundation Component: Factory Functions (`factories.ts`)
 *
 * @file factories.ts
 * @description Immutable constructor functions for adapter metadata, descriptors, models,
 * request/response metadata, capabilities declarations, and token usage statistics.
 * Validates invariants fail-fast and recursively freezes returned domain objects via deepFreeze().
 *
 * @module @aether/provider-adapters/factories
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
import {
  InvalidAdapterError,
  InvalidRequestError,
  InvalidResponseError,
} from "./errors";
import type {
  ProviderAdapterMetadata,
  ProviderModelDescriptor,
  ProviderModelCapabilities,
  ProviderRequestMetadata,
  ProviderResponseMetadata,
  ProviderUsageStatistics,
  ProviderAdapterDescriptor,
} from "./adapter-types";

/**
 * Recursively freezes an object and all nested properties to guarantee total runtime immutability.
 *
 * @template T
 * @param obj Target object to deeply freeze.
 * @param seen Set tracking visited objects to prevent infinite loops on circular structures.
 * @returns Deeply frozen object.
 */
export function deepFreeze<T>(obj: T, seen: Set<unknown> = new Set()): Readonly<T> {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj as Readonly<T>;
  }

  if (seen.has(obj)) {
    return obj as Readonly<T>;
  }
  seen.add(obj);

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
  } else {
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const val = (obj as Record<string, unknown>)[key];
      if (val !== null && typeof val === "object") {
        deepFreeze(val, seen);
      }
    }
  }

  return obj as Readonly<T>;
}

/**
 * Constructs and validates a ProviderAdapterMetadata object, returning a deeply frozen result.
 */
export function createAdapterMetadata(
  input: Partial<ProviderAdapterMetadata>
): Readonly<ProviderAdapterMetadata> {
  if (!input.identity) {
    throw new InvalidAdapterError("Adapter metadata requires a valid identity object.");
  }
  const { adapterId, adapterType, vendor, version } = input.identity;
  if (!adapterId || typeof adapterId !== "string" || adapterId.trim() === "") {
    throw new InvalidAdapterError("Adapter identity requires a non-empty adapterId.");
  }
  if (!adapterType || !Object.values(ProviderAdapterType).includes(adapterType)) {
    throw new InvalidAdapterError("Adapter identity requires a valid ProviderAdapterType.");
  }
  if (!vendor || !Object.values(ProviderVendor).includes(vendor)) {
    throw new InvalidAdapterError("Adapter identity requires a valid ProviderVendor.");
  }
  if (!version || typeof version !== "string" || version.trim() === "") {
    throw new InvalidAdapterError("Adapter identity requires a non-empty version string.");
  }

  if (!input.displayName || typeof input.displayName !== "string" || input.displayName.trim() === "") {
    throw new InvalidAdapterError("Adapter metadata requires a non-empty displayName.");
  }

  const result: ProviderAdapterMetadata = {
    identity: {
      adapterId: adapterId.trim(),
      adapterType,
      vendor,
      version: version.trim(),
    },
    displayName: input.displayName.trim(),
    description: input.description ?? "",
    priority: input.priority ?? AdapterPriority.NORMAL,
    isExperimental: input.isExperimental ?? false,
    minRuntimeVersion: input.minRuntimeVersion ?? "1.0.0",
    metadata: input.metadata ?? {},
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates a ProviderModelDescriptor object.
 */
export function createProviderModel(
  input: Partial<ProviderModelDescriptor>
): Readonly<ProviderModelDescriptor> {
  if (!input.modelId || typeof input.modelId !== "string" || input.modelId.trim() === "") {
    throw new InvalidAdapterError("Provider model descriptor requires a non-empty modelId.");
  }
  if (!input.modelName || typeof input.modelName !== "string" || input.modelName.trim() === "") {
    throw new InvalidAdapterError("Provider model descriptor requires a non-empty modelName.");
  }
  if (
    input.contextWindowTokens === undefined ||
    typeof input.contextWindowTokens !== "number" ||
    input.contextWindowTokens <= 0
  ) {
    throw new InvalidAdapterError("Provider model contextWindowTokens must be a positive number.");
  }
  if (
    input.maxOutputTokens === undefined ||
    typeof input.maxOutputTokens !== "number" ||
    input.maxOutputTokens <= 0
  ) {
    throw new InvalidAdapterError("Provider model maxOutputTokens must be a positive number.");
  }

  const result: ProviderModelDescriptor = {
    modelId: input.modelId.trim(),
    modelName: input.modelName.trim(),
    family: input.family ?? ModelFamily.CUSTOM,
    vendor: input.vendor ?? ProviderVendor.CUSTOM,
    contextWindowTokens: input.contextWindowTokens,
    maxOutputTokens: input.maxOutputTokens,
    capabilities: input.capabilities ?? [ModelCapability.TEXT],
    isDeprecated: input.isDeprecated ?? false,
  };

  return deepFreeze(result);
}

/**
 * Constructs a capability declaration structure for a model or adapter.
 */
export function createCapabilityDeclaration(
  capabilities: AdapterCapability[],
  maxContextTokens: number = 128000,
  maxOutputTokens: number = 4096
): Readonly<ProviderModelCapabilities> {
  if (maxContextTokens <= 0) {
    throw new InvalidAdapterError("maxContextTokens must be a positive number.");
  }
  if (maxOutputTokens <= 0) {
    throw new InvalidAdapterError("maxOutputTokens must be a positive number.");
  }

  const capsSet = new Set(capabilities);

  const result: ProviderModelCapabilities = {
    capabilities: Array.from(capsSet),
    maxContextTokens,
    maxOutputTokens,
    supportsStreaming: capsSet.has(AdapterCapability.STREAMING),
    supportsVision: capsSet.has(AdapterCapability.VISION),
    supportsEmbeddings: capsSet.has(AdapterCapability.EMBEDDING),
    supportsSpeech: capsSet.has(AdapterCapability.SPEECH),
    supportsImageGen: capsSet.has(AdapterCapability.IMAGE_GENERATION),
    supportsToolCalling: capsSet.has(AdapterCapability.TOOL_CALLING),
    supportsReasoning: capsSet.has(AdapterCapability.REASONING),
    supportsJSONMode: capsSet.has(AdapterCapability.JSON_MODE),
    supportsStructuredOutput: capsSet.has(AdapterCapability.STRUCTURED_OUTPUT),
    supportsFunctionCalling: capsSet.has(AdapterCapability.FUNCTION_CALLING),
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates ProviderRequestMetadata.
 */
export function createProviderRequestMetadata(
  input: Partial<ProviderRequestMetadata>
): Readonly<ProviderRequestMetadata> {
  if (!input.requestId || typeof input.requestId !== "string" || input.requestId.trim() === "") {
    throw new InvalidRequestError("Provider request metadata requires a non-empty requestId.");
  }
  if (input.timeoutMs !== undefined && (typeof input.timeoutMs !== "number" || input.timeoutMs <= 0)) {
    throw new InvalidRequestError("Provider request timeoutMs must be a positive number.");
  }

  const result: ProviderRequestMetadata = {
    requestId: input.requestId.trim(),
    requestType: input.requestType ?? RequestType.TEXT,
    timestamp: input.timestamp ?? Date.now(),
    priority: input.priority ?? AdapterPriority.NORMAL,
    timeoutMs: input.timeoutMs ?? 30000,
    traceId: input.traceId ?? `trace-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    callerId: input.callerId,
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates ProviderResponseMetadata.
 */
export function createProviderResponseMetadata(
  input: Partial<ProviderResponseMetadata>
): Readonly<ProviderResponseMetadata> {
  if (!input.responseId || typeof input.responseId !== "string" || input.responseId.trim() === "") {
    throw new InvalidResponseError("Provider response metadata requires a non-empty responseId.");
  }
  if (!input.requestId || typeof input.requestId !== "string" || input.requestId.trim() === "") {
    throw new InvalidResponseError("Provider response metadata requires a non-empty requestId.");
  }
  if (!input.modelUsed || typeof input.modelUsed !== "string" || input.modelUsed.trim() === "") {
    throw new InvalidResponseError("Provider response metadata requires a non-empty modelUsed.");
  }
  if (input.latencyMs !== undefined && (typeof input.latencyMs !== "number" || input.latencyMs < 0)) {
    throw new InvalidResponseError("Provider response latencyMs must be a non-negative number.");
  }

  const result: ProviderResponseMetadata = {
    responseId: input.responseId.trim(),
    requestId: input.requestId.trim(),
    responseType: input.responseType ?? ResponseType.TEXT,
    timestamp: input.timestamp ?? Date.now(),
    latencyMs: input.latencyMs ?? 0,
    finishReason: input.finishReason ?? "stop",
    modelUsed: input.modelUsed.trim(),
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates token usage statistics.
 */
export function createUsageStatistics(
  input: Partial<ProviderUsageStatistics>
): Readonly<ProviderUsageStatistics> {
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;

  if (typeof promptTokens !== "number" || promptTokens < 0) {
    throw new InvalidResponseError("Usage statistics promptTokens must be a non-negative number.");
  }
  if (typeof completionTokens !== "number" || completionTokens < 0) {
    throw new InvalidResponseError("Usage statistics completionTokens must be a non-negative number.");
  }

  const totalTokens = input.totalTokens ?? (promptTokens + completionTokens);
  if (typeof totalTokens !== "number" || totalTokens < promptTokens + completionTokens) {
    throw new InvalidResponseError("Usage statistics totalTokens cannot be less than prompt + completion tokens.");
  }

  if (input.estimatedCostUsd !== undefined && (typeof input.estimatedCostUsd !== "number" || input.estimatedCostUsd < 0)) {
    throw new InvalidResponseError("Usage statistics estimatedCostUsd must be a non-negative number.");
  }

  const result: ProviderUsageStatistics = {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: input.estimatedCostUsd,
  };

  return deepFreeze(result);
}

/**
 * Constructs and validates a complete ProviderAdapterDescriptor object.
 */
export function createAdapterDescriptor(
  input: Partial<ProviderAdapterDescriptor>
): Readonly<ProviderAdapterDescriptor> {
  if (!input.metadata) {
    throw new InvalidAdapterError("Adapter descriptor requires metadata.");
  }
  if (!input.supportedModels || !Array.isArray(input.supportedModels) || input.supportedModels.length === 0) {
    throw new InvalidAdapterError("Adapter descriptor requires at least one supported model.");
  }
  if (!input.defaultModelId || typeof input.defaultModelId !== "string" || input.defaultModelId.trim() === "") {
    throw new InvalidAdapterError("Adapter descriptor requires a non-empty defaultModelId.");
  }
  if (!input.capabilities) {
    throw new InvalidAdapterError("Adapter descriptor requires capabilities declaration.");
  }

  const defaultModelExists = input.supportedModels.some(m => m.modelId === input.defaultModelId);
  if (!defaultModelExists) {
    throw new InvalidAdapterError(`defaultModelId '${input.defaultModelId}' must exist in supportedModels.`);
  }

  const result: ProviderAdapterDescriptor = {
    identity: input.metadata.identity,
    metadata: input.metadata,
    supportedModels: input.supportedModels,
    defaultModelId: input.defaultModelId.trim(),
    capabilities: input.capabilities,
    status: input.status ?? AdapterStatus.READY,
    rateLimits: input.rateLimits,
    defaultLimits: input.defaultLimits,
  };

  return deepFreeze(result);
}
