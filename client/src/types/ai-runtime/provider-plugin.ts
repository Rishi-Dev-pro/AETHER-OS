/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 8: Provider Plugin Contracts (`provider-plugin.ts`)
 *
 * @file provider-plugin.ts
 * @description Immutable provider plugin interface contracts, capability descriptors,
 * wire-format wrappers, health status models, and registry entry structures
 * for Phase 9.4 multi-vendor LLM dispatch.
 *
 * @module @aether/ai-runtime/provider-plugin
 * @version 1.0.0
 * @status MILESTONE 2 — PROVIDER INFRASTRUCTURE
 */

import {
  ModelTier,
  CircuitState,
  type CorrelationContext,
} from "./types";
import type { AIRequest } from "./ai-request";
import type { AIResponse } from "./ai-response";
import { ConfigurationError } from "./errors";
import { deepFreeze } from "./internal/deep-freeze";


// ============================================================================
// 1. CAPABILITY DESCRIPTORS
// ============================================================================

/**
 * Immutable descriptor enumerating the features and model tiers
 * supported by a specific provider backend.
 */
export interface ProviderCapabilities {
  /** Provider supports incremental token delta streaming */
  readonly supportsStreaming: boolean;
  /** Provider supports structured tool/function call generation */
  readonly supportsToolCalls: boolean;
  /** Provider supports multimodal vision input payloads */
  readonly supportsVision: boolean;
  /** Provider supports structured JSON output mode */
  readonly supportsJsonMode: boolean;
  /** Provider supports intermediate reasoning/thought token streaming */
  readonly supportsThoughtStreaming: boolean;
  /** Ordered list of abstract model tiers this provider can serve */
  readonly supportedModelTiers: readonly ModelTier[];
  /** Maximum context window size in tokens (provider-defined ceiling) */
  readonly maxContextWindowTokens: number;
}


// ============================================================================
// 2. WIRE FORMAT WRAPPERS
// ============================================================================

/**
 * Opaque vendor-specific wire request payload.
 * Contains the translated provider-native format produced by `ProviderPlugin.translateRequest()`.
 */
export interface ProviderWireRequest {
  /** Provider identifier this wire request targets */
  readonly providerId: string;
  /** Concrete vendor model handle (e.g. "gpt-4o", "gemini-2.5-flash") */
  readonly concreteModel: string;
  /** Opaque vendor-native request payload (JSON-serializable) */
  readonly payload: Readonly<Record<string, unknown>>;
  /** Wire request creation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Opaque vendor-specific wire response payload.
 * Contains the raw provider-native format received before normalization.
 */
export interface ProviderWireResponse {
  /** Provider identifier this wire response originated from */
  readonly providerId: string;
  /** HTTP status code returned by vendor transport */
  readonly statusCode: number;
  /** Opaque vendor-native response payload (JSON-serializable) */
  readonly payload: Readonly<Record<string, unknown>>;
  /** Raw response headers map (read-only) */
  readonly headers: Readonly<Record<string, string>>;
  /** Wire response reception timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 3. HEALTH STATUS
// ============================================================================

/**
 * Immutable health probe result returned by `ProviderPlugin.healthCheck()`.
 */
export interface ProviderHealthStatus {
  /** Provider identifier */
  readonly providerId: string;
  /** True if the provider responded successfully to the health probe */
  readonly isHealthy: boolean;
  /** Round-trip latency of the health probe in milliseconds */
  readonly latencyMs: number;
  /** Optional error message if the health probe failed */
  readonly errorMessage?: string;
  /** Health probe execution timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 4. PROVIDER PLUGIN INTERFACE
// ============================================================================

/**
 * Core Provider Plugin interface that every vendor LLM adapter must implement.
 * The Runtime Orchestrator dispatches through this contract for all AI executions.
 *
 * Implementations are responsible for:
 * 1. Translating canonical AIRequest into vendor wire format
 * 2. Executing the actual HTTP/gRPC transport call
 * 3. Normalizing vendor response into canonical AIResponse
 * 4. Providing health check probes for circuit breaker monitoring
 */
export interface ProviderPlugin {
  /** Unique provider identifier (e.g. "openai", "gemini", "claude", "ollama") */
  readonly providerId: string;
  /** Static capability manifest describing supported features */
  readonly capabilities: ProviderCapabilities;

  /**
   * Translates a canonical AIRequest into the vendor-specific wire request format.
   * Must be a pure transformation — no network calls, no side effects.
   */
  translateRequest(request: AIRequest): ProviderWireRequest;

  /**
   * Executes the actual network transport call to the vendor API.
   * Returns the raw vendor wire response payload.
   */
  executeTransport(wireRequest: ProviderWireRequest): Promise<ProviderWireResponse>;

  /**
   * Normalizes a vendor wire response into the canonical AIResponse envelope.
   * Must be a pure transformation — no network calls, no side effects.
   */
  normalizeResponse(wireResponse: ProviderWireResponse, requestId: string, correlationContext?: CorrelationContext): AIResponse;

  /**
   * Performs a lightweight health probe against the provider endpoint.
   * Used by the circuit breaker to determine provider availability.
   */
  healthCheck(): Promise<ProviderHealthStatus>;
}


// ============================================================================
// 5. PROVIDER REGISTRY ENTRY
// ============================================================================

/**
 * Immutable registry record linking a provider plugin to its runtime configuration,
 * circuit breaker state, and model tier resolution mappings.
 */
export interface ProviderRegistryEntry {
  /** Reference to the provider plugin implementation */
  readonly plugin: ProviderPlugin;
  /** Current circuit breaker state for this provider */
  readonly circuitState: CircuitState;
  /** Map of ModelTier to concrete vendor model string for this provider */
  readonly modelTierMap: Readonly<Record<string, string>>;
  /** Provider registration timestamp (epoch ms) */
  readonly registeredAt: number;
  /**
   * Flag indicating whether this provider is active for routing.
   * Disabled providers remain registered but are skipped during strategy resolution.
   */
  readonly enabled: boolean;
}


// ============================================================================
// 6. FACTORY FUNCTIONS & INVARIANT VALIDATORS
// ============================================================================

/**
 * Parameters passed to createProviderCapabilities factory function.
 */
export interface CreateProviderCapabilitiesParams {
  readonly supportsStreaming?: boolean;
  readonly supportsToolCalls?: boolean;
  readonly supportsVision?: boolean;
  readonly supportsJsonMode?: boolean;
  readonly supportsThoughtStreaming?: boolean;
  readonly supportedModelTiers?: readonly ModelTier[];
  readonly maxContextWindowTokens?: number;
}

/**
 * Factory function creating an immutable ProviderCapabilities object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If supportedModelTiers is empty or maxContextWindowTokens is invalid.
 */
export function createProviderCapabilities(
  params: CreateProviderCapabilitiesParams = {}
): Readonly<ProviderCapabilities> {
  const supportedModelTiers = params.supportedModelTiers ?? [ModelTier.STANDARD];
  const maxContextWindowTokens = params.maxContextWindowTokens ?? 128000;

  if (supportedModelTiers.length === 0) {
    throw new ConfigurationError({
      subCode: "EmptySupportedModelTiers",
      message: "ProviderCapabilities requires at least one supported ModelTier.",
    });
  }

  // Validate all model tiers are valid enum values
  const validTiers = Object.values(ModelTier);
  for (const tier of supportedModelTiers) {
    if (!validTiers.includes(tier)) {
      throw new ConfigurationError({
        subCode: "InvalidModelTier",
        message: `Invalid ModelTier in supportedModelTiers: ${String(tier)}`,
      });
    }
  }

  if (maxContextWindowTokens < 1 || !Number.isInteger(maxContextWindowTokens)) {
    throw new ConfigurationError({
      subCode: "InvalidMaxContextWindowTokens",
      message: `maxContextWindowTokens must be a positive integer. Received: ${maxContextWindowTokens}`,
    });
  }

  const rawCapabilities: ProviderCapabilities = {
    supportsStreaming: params.supportsStreaming ?? true,
    supportsToolCalls: params.supportsToolCalls ?? false,
    supportsVision: params.supportsVision ?? false,
    supportsJsonMode: params.supportsJsonMode ?? false,
    supportsThoughtStreaming: params.supportsThoughtStreaming ?? false,
    supportedModelTiers: [...supportedModelTiers],
    maxContextWindowTokens,
  };

  return deepFreeze(rawCapabilities);
}

/**
 * Parameters passed to createProviderRegistryEntry factory function.
 */
export interface CreateProviderRegistryEntryParams {
  readonly plugin: ProviderPlugin;
  readonly circuitState?: CircuitState;
  readonly modelTierMap?: Record<string, string>;
  readonly enabled?: boolean;
}

/**
 * Factory function creating an immutable ProviderRegistryEntry object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If plugin is null or has an empty providerId.
 */
export function createProviderRegistryEntry(
  params: CreateProviderRegistryEntryParams
): Readonly<ProviderRegistryEntry> {
  if (!params || !params.plugin) {
    throw new ConfigurationError({
      subCode: "NullProviderPlugin",
      message: "ProviderRegistryEntry requires a non-null ProviderPlugin instance.",
    });
  }

  if (!params.plugin.providerId || params.plugin.providerId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidProviderId",
      message: "ProviderPlugin must have a non-empty providerId string.",
    });
  }

  const rawEntry: ProviderRegistryEntry = {
    plugin: params.plugin,
    circuitState: params.circuitState ?? CircuitState.CLOSED,
    modelTierMap: { ...(params.modelTierMap ?? {}) },
    registeredAt: Date.now(),
    enabled: params.enabled ?? true,
  };

  return deepFreeze(rawEntry);
}

/**
 * Parameters passed to createProviderHealthStatus factory function.
 */
export interface CreateProviderHealthStatusParams {
  readonly providerId: string;
  readonly isHealthy: boolean;
  readonly latencyMs: number;
  readonly errorMessage?: string;
}

/**
 * Factory function creating an immutable ProviderHealthStatus object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If providerId is empty or latencyMs is negative.
 */
export function createProviderHealthStatus(
  params: CreateProviderHealthStatusParams
): Readonly<ProviderHealthStatus> {
  if (!params || !params.providerId || params.providerId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidProviderId",
      message: "ProviderHealthStatus requires a non-empty providerId string.",
    });
  }

  if (typeof params.latencyMs !== "number" || params.latencyMs < 0) {
    throw new ConfigurationError({
      subCode: "InvalidLatencyMs",
      message: `ProviderHealthStatus latencyMs must be a non-negative number. Received: ${params.latencyMs}`,
    });
  }

  const rawStatus: ProviderHealthStatus = {
    providerId: params.providerId,
    isHealthy: params.isHealthy,
    latencyMs: params.latencyMs,
    errorMessage: params.errorMessage,
    timestamp: Date.now(),
  };

  return deepFreeze(rawStatus);
}
