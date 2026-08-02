/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Component: Credential Vault Contracts & Types (`credential-types.ts`)
 *
 * @file credential-types.ts
 * @description Strongly-typed domain interfaces for credentials, metadata, transient
 * credential references, vault snapshots, and lookup queries.
 *
 * @module @aether/provider-runtime/credential-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { CredentialType } from "./enums";

/**
 * Metadata descriptor for a registered credential in CredentialVault.
 * Contains ZERO secret values. Safe for snapshots and telemetry references.
 */
export interface CredentialMetadata {
  readonly credentialId: string;
  readonly providerId: string;
  readonly credentialType: CredentialType | string;
  readonly createdAtMs: number;
  readonly expiresAtMs?: number;
  readonly description?: string;
}

/**
 * Internal vault entry containing metadata and isolated secret payload.
 */
export interface CredentialEntry {
  readonly credentialId: string;
  readonly metadata: Readonly<CredentialMetadata>;
  readonly secretPayload: Readonly<Record<string, string>>;
}

/**
 * Ephemeral credential handle reference injected into execution contexts.
 * Contains ZERO raw secret material.
 */
export interface CredentialReference {
  readonly referenceId: string;
  readonly credentialId: string;
  readonly providerId: string;
  readonly credentialType: CredentialType | string;
  readonly issuedAtMs: number;
  readonly expiresAtMs?: number;
}

/**
 * Immutable snapshot of CredentialVault state.
 * Contains metadata ONLY. Secret payloads are strictly excluded.
 */
export interface CredentialVaultSnapshot {
  readonly snapshotId: string;
  readonly createdAtMs: number;
  readonly credentialsCount: number;
  readonly isFrozen: boolean;
  readonly credentials: readonly Readonly<CredentialMetadata>[];
}

/**
 * Query criteria for searching credential references.
 */
export interface CredentialLookupQuery {
  readonly credentialId?: string;
  readonly providerId?: string;
  readonly credentialType?: CredentialType | string;
}
