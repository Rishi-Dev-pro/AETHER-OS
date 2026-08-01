/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Deterministic Execution Registry (`execution-registry.ts`)
 *
 * @file execution-registry.ts
 * @description Canonical, thread-safe catalog for discovering, registering, validating,
 * and resolving available Execution Units. Enforces deterministic ordering, duplicate prevention,
 * deep immutability, and the read-only Registry Freeze Rule during execution sessions.
 *
 * @module @aether/action-execution/execution-registry
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import type { ExecutionUnitMetadata, ExecutionUnitContract } from "./contracts";
import type {
  ExecutionRegistryEntry,
  ExecutionRegistrySnapshot,
  RegistryStatistics,
  RegistryValidationResult,
  RegistryLookupResult,
  RegistryRegistrationOptions,
} from "./registry-types";
import {
  DuplicateExecutionUnitError,
  ExecutionUnitNotFoundError,
  RegistryAlreadyFrozenError,
  RegistryRegistrationError,
} from "./registry-errors";
import { deepFreeze } from "./factories";

/**
 * Deterministic Execution Registry implementation.
 */
export class ExecutionRegistry {
  private readonly units: Map<string, Readonly<ExecutionRegistryEntry>> = new Map();
  private frozen: boolean = false;
  private lastRegisteredAtMs?: number;

  /**
   * Registers a new execution unit adapter in the registry.
   *
   * @param metadata - Immutable metadata describing the execution unit.
   * @param contract - Optional structural contract for the unit adapter.
   * @param options - Registration options (e.g. allowOverwrite).
   * @returns Deep-frozen ExecutionRegistryEntry.
   * @throws RegistryAlreadyFrozenError if registry is frozen.
   * @throws DuplicateExecutionUnitError if unitId is already registered and allowOverwrite is false.
   * @throws RegistryRegistrationError if metadata validation fails.
   */
  public registerExecutionUnit(
    metadata: Readonly<ExecutionUnitMetadata>,
    contract?: Readonly<ExecutionUnitContract>,
    options?: Readonly<RegistryRegistrationOptions>
  ): Readonly<ExecutionRegistryEntry> {
    if (this.frozen) {
      throw new RegistryAlreadyFrozenError("register an execution unit");
    }

    const validation = this.validateRegistration(metadata);
    if (!validation.isValid) {
      throw new RegistryRegistrationError(
        `Failed to register execution unit '${metadata?.unitId}': ${validation.errors.join("; ")}`,
        { unitId: metadata?.unitId, errors: validation.errors }
      );
    }

    const unitId = metadata.unitId;
    if (this.units.has(unitId) && !options?.allowOverwrite) {
      throw new DuplicateExecutionUnitError(unitId);
    }

    const nowMs = Date.now();
    const entry: ExecutionRegistryEntry = {
      unitId,
      metadata: deepFreeze({ ...metadata }),
      contract: contract ? deepFreeze({ ...contract }) : undefined,
      registeredAtMs: nowMs,
    };

    const frozenEntry = deepFreeze(entry);
    this.units.set(unitId, frozenEntry);
    this.lastRegisteredAtMs = nowMs;

    return frozenEntry;
  }

  /**
   * Unregisters an execution unit adapter by unitId.
   *
   * @param unitId - Identifier of the unit to remove.
   * @returns True if unit was removed, false if not found.
   * @throws RegistryAlreadyFrozenError if registry is frozen.
   */
  public unregisterExecutionUnit(unitId: string): boolean {
    if (this.frozen) {
      throw new RegistryAlreadyFrozenError("unregister an execution unit");
    }
    if (!unitId || !this.units.has(unitId)) {
      return false;
    }
    return this.units.delete(unitId);
  }

  /**
   * Checks if an execution unit with the specified unitId exists in the registry.
   */
  public hasExecutionUnit(unitId: string): boolean {
    if (!unitId) return false;
    return this.units.has(unitId);
  }

  /**
   * Fetches an execution unit entry by unitId.
   *
   * @param unitId - Identifier of the target unit.
   * @returns Readonly ExecutionRegistryEntry.
   * @throws ExecutionUnitNotFoundError if unit is not registered.
   */
  public getExecutionUnit(unitId: string): Readonly<ExecutionRegistryEntry> {
    const entry = this.units.get(unitId);
    if (!entry) {
      throw new ExecutionUnitNotFoundError(unitId);
    }
    return entry;
  }

  /**
   * Performs a safe lookup query returning a RegistryLookupResult payload without throwing.
   */
  public lookupExecutionUnit(unitId: string): Readonly<RegistryLookupResult> {
    const nowMs = Date.now();
    const entry = this.units.get(unitId);
    const result: RegistryLookupResult = {
      found: !!entry,
      entry,
      unitId,
      searchedAtMs: nowMs,
    };
    return deepFreeze(result);
  }

  /**
   * Returns a deterministically ordered list of all registered execution units (alphabetically by unitId).
   */
  public listExecutionUnits(): readonly Readonly<ExecutionRegistryEntry>[] {
    const entries = Array.from(this.units.values()).sort((a, b) =>
      a.unitId.localeCompare(b.unitId)
    );
    return deepFreeze(entries);
  }

  /**
   * Locks the Execution Registry read-only for the duration of execution.
   * Once frozen, no units can be registered, unregistered, or modified.
   */
  public freezeRegistry(): void {
    this.frozen = true;
  }

  /**
   * Returns true if the registry is currently frozen.
   */
  public isRegistryFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Unfreezes the registry (utility for test cleanup).
   */
  public resetRegistryForTest(): void {
    this.units.clear();
    this.frozen = false;
    this.lastRegisteredAtMs = undefined;
  }

  /**
   * Validates metadata eligibility for registration.
   */
  public validateRegistration(metadata: Readonly<ExecutionUnitMetadata>): Readonly<RegistryValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metadata || typeof metadata !== "object") {
      errors.push("Metadata must be a non-null object.");
    } else {
      if (!metadata.unitId || typeof metadata.unitId !== "string" || metadata.unitId.trim() === "") {
        errors.push("Metadata unitId must be a non-empty string.");
      }
      if (!metadata.unitType) {
        errors.push("Metadata unitType is required.");
      }
      if (!metadata.version || typeof metadata.version !== "string") {
        errors.push("Metadata version is required.");
      }
      if (!Array.isArray(metadata.namespacedTools) || metadata.namespacedTools.length === 0) {
        errors.push("Metadata namespacedTools must be a non-empty array of tool strings.");
      }
      if (!Array.isArray(metadata.requiredPermissions)) {
        errors.push("Metadata requiredPermissions must be an array.");
      }
      if (!Array.isArray(metadata.requiredCapabilities)) {
        errors.push("Metadata requiredCapabilities must be an array.");
      }
    }

    const res: RegistryValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    return deepFreeze(res);
  }

  /**
   * Generates a point-in-time, deep-frozen snapshot of the registry state.
   */
  public createSnapshot(): Readonly<ExecutionRegistrySnapshot> {
    const nowMs = Date.now();
    const sortedEntries = this.listExecutionUnits();

    const snapshot: ExecutionRegistrySnapshot = {
      snapshotId: `snapshot_${nowMs}_${Math.random().toString(36).substring(2, 7)}`,
      capturedAtMs: nowMs,
      totalUnitsCount: sortedEntries.length,
      entries: sortedEntries,
      isFrozen: this.frozen,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Computes diagnostic statistics for the registry.
   */
  public getStatistics(): Readonly<RegistryStatistics> {
    const unitTypesCount: Record<string, number> = {};

    this.units.forEach((entry) => {
      const type = entry.metadata.unitType;
      unitTypesCount[type] = (unitTypesCount[type] ?? 0) + 1;
    });

    const stats: RegistryStatistics = {
      totalRegisteredUnits: this.units.size,
      unitTypesCount: deepFreeze(unitTypesCount),
      isFrozen: this.frozen,
      lastRegisteredAtMs: this.lastRegisteredAtMs,
    };

    return deepFreeze(stats);
  }

  /**
   * Clears all registered execution units.
   * @throws RegistryAlreadyFrozenError if registry is frozen.
   */
  public clear(): void {
    if (this.frozen) {
      throw new RegistryAlreadyFrozenError("clear");
    }
    this.units.clear();
    this.lastRegisteredAtMs = undefined;
  }
}
