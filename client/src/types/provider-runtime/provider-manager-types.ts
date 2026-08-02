/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 6 Component: ProviderManager Types (`provider-manager-types.ts`)
 *
 * @file provider-manager-types.ts
 * @description Strongly-typed domain contracts for unified ProviderRuntime snapshots,
 * initialization parameters, and manager configuration settings.
 *
 * @module @aether/provider-runtime/provider-manager-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 6
 */

import { ProviderSelectionPolicy } from "./enums";
import type { ProviderRegistrySnapshot } from "./registry-types";
import type { CredentialVaultSnapshot } from "./credential-types";
import type { ProviderSessionSnapshot } from "./session-types";

/**
 * Global configuration settings for ProviderManager facade.
 */
export interface ProviderManagerConfig {
  readonly autoFreezeOnBoot?: boolean;
  readonly defaultSelectionPolicy?: ProviderSelectionPolicy;
}

/**
 * Unified, deeply immutable snapshot representing frozen or active Provider Runtime state.
 */
export interface ProviderRuntimeSnapshot {
  readonly snapshotId: string;
  readonly timestampMs: number;
  readonly isFrozen: boolean;
  readonly registrySnapshot: Readonly<ProviderRegistrySnapshot>;
  readonly credentialSnapshot: Readonly<CredentialVaultSnapshot>;
  readonly sessionSnapshot: Readonly<ProviderSessionSnapshot>;
  readonly totalProvidersCount: number;
  readonly activeSessionsCount: number;
  readonly credentialsCount: number;
}
