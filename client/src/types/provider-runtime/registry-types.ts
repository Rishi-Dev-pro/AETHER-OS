/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Component: Provider Registry & Capability Types (`registry-types.ts`)
 *
 * @file registry-types.ts
 * @description Domain interfaces and contracts for provider catalog entries, snapshots,
 * lookup queries, capability requirements, and negotiation outputs.
 *
 * @module @aether/provider-runtime/registry-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import { ProviderType, ProviderCapability } from "./enums";
import type { ProviderMetadata } from "./provider-types";
import type { ProviderContract } from "./contracts";

/**
 * Immutable catalog entry within ProviderRegistry.
 */
export interface ProviderEntry {
  readonly providerId: string;
  readonly metadata: Readonly<ProviderMetadata>;
  readonly contract: Readonly<ProviderContract>;
  readonly registeredAtMs: number;
}

/**
 * Immutable snapshot of ProviderRegistry catalog state.
 */
export interface ProviderRegistrySnapshot {
  readonly snapshotId: string;
  readonly createdAtMs: number;
  readonly providersCount: number;
  readonly isFrozen: boolean;
  readonly providers: readonly Readonly<ProviderEntry>[];
}

/**
 * Query criteria for filtering providers in the catalog.
 */
export interface ProviderLookupQuery {
  readonly providerId?: string;
  readonly providerType?: ProviderType;
  readonly capability?: ProviderCapability | string;
  readonly vendor?: string;
  readonly minVersion?: string;
}

/**
 * Specification of capability demands for execution negotiation.
 */
export interface CapabilityRequirements {
  readonly requiredCapabilities: readonly (ProviderCapability | string)[];
  readonly optionalCapabilities?: readonly (ProviderCapability | string)[];
}

/**
 * Deterministic capability negotiation output envelope.
 */
export interface CapabilityNegotiationResult {
  readonly providerId: string;
  readonly supportedCapabilities: readonly string[];
  readonly unsupportedCapabilities: readonly string[];
  readonly isFullyCompatible: boolean;
  readonly negotiatedAtMs: number;
}
