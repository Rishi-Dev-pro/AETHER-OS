/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 3 Component: CredentialVault (`credential-vault.ts`)
 *
 * @file credential-vault.ts
 * @description Isolated, exclusive owner of secrets within Phase 9.9.
 * Manages credential registration, transient reference handle generation,
 * secret-free snapshot exports, vault freezing, and secure payload resolution.
 *
 * @module @aether/provider-runtime/credential-vault
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 3
 */

import { CredentialType } from "./enums";
import {
  CredentialNotFoundError,
  CredentialAccessDeniedError,
  DuplicateCredentialError,
  CredentialVaultFrozenError,
  InvalidCredentialMetadataError,
} from "./credential-errors";
import type {
  CredentialMetadata,
  CredentialEntry,
  CredentialReference,
  CredentialVaultSnapshot,
  CredentialLookupQuery,
} from "./credential-types";
import { deepFreeze } from "./factories";

/**
 * Authoritative guardian and owner of all secret bytes in Phase 9.9.
 */
export class CredentialVault {
  private readonly entries = new Map<string, CredentialEntry>();
  private readonly referenceMap = new Map<string, string>(); // referenceId -> credentialId
  private frozen = false;

  /**
   * Registers a credential with isolated secret payload in CredentialVault.
   *
   * @param credentialId Unique credential identifier.
   * @param providerId Target provider ID.
   * @param credentialType Type of credential (API_KEY, OAUTH2, JWT, etc.).
   * @param secretPayload Isolated dictionary of secret key-value pairs.
   * @param description Optional human-readable description.
   * @param expiresAtMs Optional expiration timestamp in milliseconds.
   * @returns Ephemeral, secret-free CredentialReference handle.
   * @throws CredentialVaultFrozenError if vault is frozen.
   * @throws DuplicateCredentialError if credentialId is already registered.
   * @throws InvalidCredentialMetadataError if inputs are invalid or secrets are empty.
   */
  public registerCredential(
    credentialId: string,
    providerId: string,
    credentialType: CredentialType | string,
    secretPayload: Record<string, string>,
    description?: string,
    expiresAtMs?: number
  ): Readonly<CredentialReference> {
    if (this.frozen) {
      throw new CredentialVaultFrozenError("Cannot register credential: CredentialVault is frozen.");
    }
    if (!credentialId || typeof credentialId !== "string" || credentialId.trim() === "") {
      throw new InvalidCredentialMetadataError("Credential registration failed: Invalid or empty credentialId.");
    }
    if (!providerId || typeof providerId !== "string" || providerId.trim() === "") {
      throw new InvalidCredentialMetadataError("Credential registration failed: Invalid or empty providerId.");
    }
    if (this.entries.has(credentialId)) {
      throw new DuplicateCredentialError(`Credential '${credentialId}' is already registered in CredentialVault.`, {
        credentialId,
      });
    }
    if (!secretPayload || typeof secretPayload !== "object" || Object.keys(secretPayload).length === 0) {
      throw new InvalidCredentialMetadataError(
        `Credential registration failed: Secret payload for '${credentialId}' cannot be empty.`
      );
    }

    const metadata: CredentialMetadata = {
      credentialId,
      providerId,
      credentialType: credentialType ?? CredentialType.API_KEY,
      createdAtMs: Date.now(),
      ...(expiresAtMs ? { expiresAtMs } : {}),
      ...(description ? { description } : {}),
    };

    const entry: CredentialEntry = {
      credentialId,
      metadata,
      secretPayload: deepFreeze({ ...secretPayload }),
    };

    const referenceId = `ref_${credentialId}_${Date.now()}`;
    const reference: CredentialReference = {
      referenceId,
      credentialId,
      providerId,
      credentialType: metadata.credentialType,
      issuedAtMs: Date.now(),
      ...(expiresAtMs ? { expiresAtMs } : {}),
    };

    this.entries.set(credentialId, entry);
    this.referenceMap.set(referenceId, credentialId);

    return deepFreeze(reference);
  }

  /**
   * Unregisters a credential from CredentialVault.
   *
   * @param credentialId ID of credential to unregister.
   * @returns True if removed successfully.
   * @throws CredentialVaultFrozenError if vault is frozen.
   * @throws CredentialNotFoundError if credentialId is missing.
   */
  public unregisterCredential(credentialId: string): boolean {
    if (this.frozen) {
      throw new CredentialVaultFrozenError("Cannot unregister credential: CredentialVault is frozen.");
    }
    if (!this.entries.has(credentialId)) {
      throw new CredentialNotFoundError(`Credential '${credentialId}' not found in CredentialVault.`, {
        credentialId,
      });
    }

    // Clean reference map entries pointing to this credentialId
    for (const [refId, targetId] of this.referenceMap.entries()) {
      if (targetId === credentialId) {
        this.referenceMap.delete(refId);
      }
    }

    return this.entries.delete(credentialId);
  }

  /**
   * Checks whether a credential ID is registered in the vault.
   */
  public hasCredential(credentialId: string): boolean {
    return this.entries.has(credentialId);
  }

  /**
   * Retrieves an ephemeral CredentialReference handle for a target credential.
   *
   * @throws CredentialNotFoundError if credential is missing.
   */
  public getCredentialReference(credentialId: string): Readonly<CredentialReference> {
    const entry = this.entries.get(credentialId);
    if (!entry) {
      throw new CredentialNotFoundError(`Credential '${credentialId}' not found in CredentialVault.`, {
        credentialId,
      });
    }

    const referenceId = `ref_${credentialId}_${Date.now()}`;
    this.referenceMap.set(referenceId, credentialId);

    const reference: CredentialReference = {
      referenceId,
      credentialId,
      providerId: entry.metadata.providerId,
      credentialType: entry.metadata.credentialType,
      issuedAtMs: Date.now(),
      ...(entry.metadata.expiresAtMs ? { expiresAtMs: entry.metadata.expiresAtMs } : {}),
    };

    return deepFreeze(reference);
  }

  /**
   * Searches credential reference handles matching query criteria.
   * Returns a deterministically sorted array (alphabetical by credentialId).
   */
  public lookupCredential(query: Readonly<CredentialLookupQuery>): readonly Readonly<CredentialReference>[] {
    const matched: CredentialReference[] = [];

    for (const entry of this.entries.values()) {
      if (query.credentialId && entry.credentialId !== query.credentialId) {
        continue;
      }
      if (query.providerId && entry.metadata.providerId !== query.providerId) {
        continue;
      }
      if (query.credentialType && entry.metadata.credentialType !== query.credentialType) {
        continue;
      }

      const ref: CredentialReference = {
        referenceId: `ref_${entry.credentialId}_${Date.now()}`,
        credentialId: entry.credentialId,
        providerId: entry.metadata.providerId,
        credentialType: entry.metadata.credentialType,
        issuedAtMs: Date.now(),
        ...(entry.metadata.expiresAtMs ? { expiresAtMs: entry.metadata.expiresAtMs } : {}),
      };

      matched.push(ref);
    }

    matched.sort((a, b) => a.credentialId.localeCompare(b.credentialId));
    return deepFreeze(matched);
  }

  /**
   * Locks CredentialVault permanently. Prevents any further registrations or unregistrations.
   */
  public freezeVault(): void {
    this.frozen = true;
  }

  /**
   * Returns whether CredentialVault is currently frozen.
   */
  public isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Creates a deeply frozen snapshot of vault metadata.
   * ABSOLUTELY ZERO SECRET PAYLOADS ARE INCLUDED IN SNAPSHOTS.
   */
  public createSnapshot(): Readonly<CredentialVaultSnapshot> {
    const metadataList: CredentialMetadata[] = [];

    for (const entry of this.entries.values()) {
      metadataList.push({ ...entry.metadata });
    }

    metadataList.sort((a, b) => a.credentialId.localeCompare(b.credentialId));

    const snapshot: CredentialVaultSnapshot = {
      snapshotId: `snap_vault_${Date.now()}`,
      createdAtMs: Date.now(),
      credentialsCount: this.entries.size,
      isFrozen: this.frozen,
      credentials: metadataList,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Validates whether a credential exists and is unexpired.
   */
  public validateCredential(credentialId: string): boolean {
    const entry = this.entries.get(credentialId);
    if (!entry) {
      return false;
    }
    if (entry.metadata.expiresAtMs && entry.metadata.expiresAtMs <= Date.now()) {
      return false;
    }
    return true;
  }

  /**
   * Resolves secret payload bytes inside execution boundaries using referenceId or credentialId.
   * Access restricted to valid, unexpired references.
   *
   * @throws CredentialNotFoundError if reference/credential is missing.
   * @throws CredentialAccessDeniedError if credential is expired.
   */
  public resolveSecretPayload(referenceIdOrId: string): Readonly<Record<string, string>> {
    let targetId = referenceIdOrId;

    if (this.referenceMap.has(referenceIdOrId)) {
      targetId = this.referenceMap.get(referenceIdOrId)!;
    }

    const entry = this.entries.get(targetId);
    if (!entry) {
      throw new CredentialNotFoundError(`Credential resolution failed: Reference '${referenceIdOrId}' not found.`, {
        referenceId: referenceIdOrId,
      });
    }

    if (entry.metadata.expiresAtMs && entry.metadata.expiresAtMs <= Date.now()) {
      throw new CredentialAccessDeniedError(`Credential resolution failed: Credential '${targetId}' has expired.`, {
        credentialId: targetId,
        expiresAtMs: entry.metadata.expiresAtMs,
      });
    }

    return deepFreeze({ ...entry.secretPayload });
  }

  /**
   * Clears all registered credentials (only if not frozen).
   */
  public clear(): void {
    if (this.frozen) {
      throw new CredentialVaultFrozenError("Cannot clear vault: CredentialVault is frozen.");
    }
    this.entries.clear();
    this.referenceMap.clear();
  }
}
