/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Foundation Component: Immutable Domain Types (`provider-types.ts`)
 *
 * @file provider-types.ts
 * @description Strongly-typed, deeply immutable domain types for metadata, identity,
 * capabilities, capabilities descriptors, limits, and provider descriptors.
 *
 * @module @aether/provider-runtime/provider-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 1
 */

import {
  ProviderType,
  ProviderStatus,
  ProviderCapability,
  ConfigurationSource,
} from "./enums";
import type { ProviderConfiguration } from "./provider-configuration";

/**
 * Unique identity descriptor for a provider runtime adapter.
 */
export interface ProviderIdentity {
  readonly providerId: string;
  readonly vendor: string;
  readonly name: string;
  readonly version: string;
}

/**
 * Semantic version metadata structure.
 */
export interface ProviderVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly preRelease?: string;
}

/**
 * Detailed capability metadata specification.
 */
export interface CapabilityMetadata {
  readonly capabilityId: string;
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsImageGeneration: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVideo: boolean;
  readonly supportsBatching: boolean;
  readonly maximumImageResolution?: Readonly<{
    readonly width: number;
    readonly height: number;
  }>;
  readonly maximumTokens?: number;
  readonly maximumContextWindow?: number;
  readonly customMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Descriptor mapping a capability to its specific metadata.
 */
export interface ProviderCapabilityDescriptor {
  readonly capability: ProviderCapability | string;
  readonly metadata: Readonly<CapabilityMetadata>;
}

/**
 * Capability container descriptor.
 */
export interface ProviderCapabilities {
  readonly capabilities: readonly Readonly<ProviderCapabilityDescriptor>[];
  readonly defaultTimeoutMs: number;
  readonly supportsWarmup: boolean;
}

/**
 * Operational resource limits for a provider adapter.
 */
export interface ProviderLimits {
  readonly maxConcurrentExecutions: number;
  readonly maxContextWindowTokens?: number;
  readonly maxOutputTokens?: number;
  readonly rateLimitRequestsPerMinute?: number;
}

/**
 * Source provenance for a provider configuration.
 */
export interface ProviderConfigurationSource {
  readonly source: ConfigurationSource;
  readonly location?: string;
  readonly injectedAtMs: number;
}

/**
 * Authoritative immutable provider metadata structure.
 */
export interface ProviderMetadata {
  readonly identity: Readonly<ProviderIdentity>;
  readonly providerId: string;
  readonly providerType: ProviderType;
  readonly version: string;
  readonly minFrameworkVersion: string;
  readonly vendor: string;
  readonly capabilities: readonly Readonly<ProviderCapabilityDescriptor>[];
  readonly defaultTimeoutMs: number;
  readonly supportsWarmup: boolean;
  readonly limits: Readonly<ProviderLimits>;
}

/**
 * High-level provider descriptor bundling metadata, configuration, and status.
 */
export interface ProviderDescriptor {
  readonly metadata: Readonly<ProviderMetadata>;
  readonly configuration: Readonly<ProviderConfiguration>;
  readonly status: ProviderStatus;
}
