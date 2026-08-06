/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Adapter Registry (`adapter-registry.ts`)
 *
 * @file adapter-registry.ts
 * @description Centralized registry for discovering, registering, querying, and freezing concrete ProviderAdapter instances.
 *
 * @module @aether/provider-adapters/adapter-registry
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import type { ProviderAdapter } from "./contracts";
import { AdapterRegistrationError, InvalidAdapterError } from "./errors";
import { deepFreeze } from "./factories";

/**
 * Registry holding registered ProviderAdapter implementations.
 */
export class AdapterRegistry {
  private readonly adapters: Map<string, ProviderAdapter> = new Map();
  private frozen = false;

  /**
   * Registers a concrete ProviderAdapter instance.
   *
   * @param adapter Target adapter.
   * @throws AdapterRegistrationError or InvalidAdapterError if adapter is invalid or duplicate.
   */
  public registerAdapter(adapter: ProviderAdapter): void {
    if (this.frozen) {
      throw new AdapterRegistrationError("Cannot register adapter: AdapterRegistry is frozen.");
    }
    if (!adapter || !adapter.identity || !adapter.identity.adapterId || adapter.identity.adapterId.trim() === "") {
      throw new InvalidAdapterError("Adapter registration failed: Invalid or missing adapter identity.");
    }
    const adapterId = adapter.identity.adapterId.trim();
    if (this.adapters.has(adapterId)) {
      throw new AdapterRegistrationError(`Adapter '${adapterId}' is already registered in AdapterRegistry.`);
    }

    this.adapters.set(adapterId, adapter);
  }

  /**
   * Unregisters an adapter by ID.
   *
   * @param adapterId Target adapter ID.
   * @returns True if unregistered, false if not found.
   */
  public unregisterAdapter(adapterId: string): boolean {
    if (this.frozen) {
      throw new AdapterRegistrationError("Cannot unregister adapter: AdapterRegistry is frozen.");
    }
    return this.adapters.delete(adapterId);
  }

  /**
   * Fetches a registered adapter by ID.
   *
   * @param adapterId Target adapter ID.
   * @returns Matching ProviderAdapter or undefined.
   */
  public getAdapter(adapterId: string): ProviderAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  /**
   * Lists all registered adapters in deterministic sorted order by adapter ID.
   *
   * @returns Readonly array of ProviderAdapter instances.
   */
  public listAdapters(): ReadonlyArray<ProviderAdapter> {
    const list = Array.from(this.adapters.values()).sort((a, b) =>
      a.identity.adapterId.localeCompare(b.identity.adapterId)
    );
    return deepFreeze(list);
  }

  /**
   * Freezes the registry against further mutations.
   */
  public freezeRegistry(): void {
    this.frozen = true;
  }

  /**
   * Creates an immutable snapshot of all registered adapters.
   *
   * @returns Deeply frozen dictionary mapping adapter ID to ProviderAdapter.
   */
  public snapshot(): Readonly<Record<string, ProviderAdapter>> {
    const record: Record<string, ProviderAdapter> = {};
    for (const [id, adapter] of this.adapters.entries()) {
      record[id] = adapter;
    }
    return deepFreeze(record);
  }

  /**
   * Returns true if registry is frozen.
   */
  public isFrozen(): boolean {
    return this.frozen;
  }
}
