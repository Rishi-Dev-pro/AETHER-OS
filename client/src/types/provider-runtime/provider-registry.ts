/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 2 Component: Provider Registry (`provider-registry.ts`)
 *
 * @file provider-registry.ts
 * @description Deterministic, immutable Provider Catalog Registry maintaining canonical entries,
 * enforcing unique provider IDs, freeze rules, alphabetical sorting, and snapshot creation.
 *
 * @module @aether/provider-runtime/provider-registry
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import {
  DuplicateProviderError,
  ProviderNotFoundError,
  ProviderRegistryFrozenError,
  InvalidProviderMetadataError,
  ProviderContractError,
} from "./errors";
import type { ProviderContract, ProviderValidationResult } from "./contracts";
import type {
  ProviderEntry,
  ProviderRegistrySnapshot,
  ProviderLookupQuery,
} from "./registry-types";
import { deepFreeze, createProviderValidationResult } from "./factories";

/**
 * Authoritative immutable catalog registry for provider adapters.
 */
export class ProviderRegistry {
  private readonly entries = new Map<string, ProviderEntry>();
  private frozen = false;

  /**
   * Registers a new provider contract into the catalog.
   *
   * @param contract Validated ProviderContract instance.
   * @returns Deeply frozen ProviderEntry.
   * @throws ProviderRegistryFrozenError if registry is frozen.
   * @throws DuplicateProviderError if providerId is already registered.
   * @throws ProviderContractError or InvalidProviderMetadataError if invalid.
   */
  public registerProvider(contract: Readonly<ProviderContract>): Readonly<ProviderEntry> {
    if (this.frozen) {
      throw new ProviderRegistryFrozenError("Cannot register provider: ProviderRegistry is frozen.");
    }
    if (!contract || !contract.metadata) {
      throw new ProviderContractError("Registration failed: ProviderContract and metadata must be defined.");
    }

    const { providerId } = contract.metadata;
    if (!providerId || typeof providerId !== "string" || providerId.trim() === "") {
      throw new InvalidProviderMetadataError("Registration failed: Invalid or empty providerId.");
    }

    if (this.entries.has(providerId)) {
      throw new DuplicateProviderError(`Provider '${providerId}' is already registered in ProviderRegistry.`, {
        providerId,
      });
    }

    const entry: ProviderEntry = {
      providerId,
      metadata: contract.metadata,
      contract,
      registeredAtMs: Date.now(),
    };

    this.entries.set(providerId, entry);
    return deepFreeze({ ...entry });
  }

  /**
   * Unregisters a provider from the catalog by providerId.
   *
   * @param providerId ID of provider to unregister.
   * @returns True if successfully removed.
   * @throws ProviderRegistryFrozenError if registry is frozen.
   * @throws ProviderNotFoundError if providerId is not found.
   */
  public unregisterProvider(providerId: string): boolean {
    if (this.frozen) {
      throw new ProviderRegistryFrozenError("Cannot unregister provider: ProviderRegistry is frozen.");
    }
    if (!this.entries.has(providerId)) {
      throw new ProviderNotFoundError(`Provider '${providerId}' not found in ProviderRegistry.`, { providerId });
    }

    return this.entries.delete(providerId);
  }

  /**
   * Locks the ProviderRegistry permanently. Rejects any further registrations or unregistrations.
   */
  public freezeRegistry(): void {
    this.frozen = true;
  }

  /**
   * Returns whether the registry is currently frozen.
   */
  public isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Checks whether a providerId exists in the catalog.
   */
  public hasProvider(providerId: string): boolean {
    return this.entries.has(providerId);
  }

  /**
   * Retrieves a specific provider entry by providerId.
   *
   * @throws ProviderNotFoundError if providerId does not exist.
   */
  public getProvider(providerId: string): Readonly<ProviderEntry> {
    const entry = this.entries.get(providerId);
    if (!entry) {
      throw new ProviderNotFoundError(`Provider '${providerId}' not found in ProviderRegistry.`, { providerId });
    }

    return deepFreeze({ ...entry });
  }

  /**
   * Queries provider entries matching search criteria.
   * Returns a deterministically sorted array (alphabetical by providerId).
   */
  public lookupProvider(query: Readonly<ProviderLookupQuery>): readonly Readonly<ProviderEntry>[] {
    const matched: ProviderEntry[] = [];

    for (const entry of this.entries.values()) {
      if (query.providerId && entry.providerId !== query.providerId) {
        continue;
      }
      if (query.providerType && entry.metadata.providerType !== query.providerType) {
        continue;
      }
      if (query.vendor && entry.metadata.vendor !== query.vendor) {
        continue;
      }
      if (query.capability) {
        const hasCap = entry.metadata.capabilities.some(
          (c) => c.capability === query.capability
        );
        if (!hasCap) {
          continue;
        }
      }

      matched.push(entry);
    }

    matched.sort((a, b) => a.providerId.localeCompare(b.providerId));
    return deepFreeze(matched);
  }

  /**
   * Returns all registered provider entries sorted alphabetically by providerId.
   */
  public listProviders(): readonly Readonly<ProviderEntry>[] {
    const all = Array.from(this.entries.values());
    all.sort((a, b) => a.providerId.localeCompare(b.providerId));
    return deepFreeze(all);
  }

  /**
   * Returns a deduplicated, deterministically sorted list of all capabilities across registered providers.
   */
  public listCapabilities(): readonly string[] {
    const capSet = new Set<string>();

    for (const entry of this.entries.values()) {
      for (const capDesc of entry.metadata.capabilities) {
        capSet.add(capDesc.capability);
      }
    }

    const sorted = Array.from(capSet).sort((a, b) => a.localeCompare(b));
    return deepFreeze(sorted);
  }

  /**
   * Creates a deeply frozen snapshot of the registry's current state.
   */
  public createSnapshot(): Readonly<ProviderRegistrySnapshot> {
    const snapshot: ProviderRegistrySnapshot = {
      snapshotId: `snap_${Date.now()}`,
      createdAtMs: Date.now(),
      providersCount: this.entries.size,
      isFrozen: this.frozen,
      providers: this.listProviders(),
    };

    return deepFreeze(snapshot);
  }

  /**
   * Validates whether a provider contract can be registered without mutating state.
   */
  public validateRegistration(contract: Readonly<ProviderContract>): Readonly<ProviderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.frozen) {
      errors.push("ProviderRegistry is frozen.");
    }
    if (!contract || !contract.metadata) {
      errors.push("ProviderContract and metadata must be defined.");
    } else {
      const { providerId } = contract.metadata;
      if (!providerId) {
        errors.push("Provider metadata providerId is empty.");
      } else if (this.entries.has(providerId)) {
        errors.push(`Provider '${providerId}' is already registered.`);
      }
    }

    return createProviderValidationResult({
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAtMs: Date.now(),
    });
  }

  /**
   * Clears all registered providers (only if not frozen).
   */
  public clear(): void {
    if (this.frozen) {
      throw new ProviderRegistryFrozenError("Cannot clear registry: ProviderRegistry is frozen.");
    }
    this.entries.clear();
  }
}
