/**
 * AETHER OS — Phase 9.8 Action Execution Framework
 * Component: Execution Registry Domain Contracts (`registry-types.ts`)
 *
 * @file registry-types.ts
 * @description Immutable data contracts and readonly interfaces for Execution Registry
 * entries, snapshots, statistics, lookup results, and registration options.
 *
 * @module @aether/action-execution/registry-types
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import type { ExecutionUnitMetadata, ExecutionUnitContract } from "./contracts";

/**
 * Immutable catalog entry representing a registered execution unit adapter.
 */
export interface ExecutionRegistryEntry {
  readonly unitId: string;
  readonly metadata: Readonly<ExecutionUnitMetadata>;
  readonly contract?: Readonly<ExecutionUnitContract>;
  readonly registeredAtMs: number;
}

/**
 * Point-in-time immutable snapshot of the Execution Registry state.
 */
export interface ExecutionRegistrySnapshot {
  readonly snapshotId: string;
  readonly capturedAtMs: number;
  readonly totalUnitsCount: number;
  readonly entries: readonly Readonly<ExecutionRegistryEntry>[];
  readonly isFrozen: boolean;
}

/**
 * Diagnostic metrics and unit category statistics for the registry.
 */
export interface RegistryStatistics {
  readonly totalRegisteredUnits: number;
  readonly unitTypesCount: Readonly<Record<string, number>>;
  readonly isFrozen: boolean;
  readonly lastRegisteredAtMs?: number;
}

/**
 * Validation result payload for execution unit registration eligibility.
 */
export interface RegistryValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Result payload returned by execution unit lookup queries.
 */
export interface RegistryLookupResult {
  readonly found: boolean;
  readonly entry?: Readonly<ExecutionRegistryEntry>;
  readonly unitId: string;
  readonly searchedAtMs: number;
}

/**
 * Options configuring registration rules.
 */
export interface RegistryRegistrationOptions {
  readonly allowOverwrite?: boolean;
  readonly overrideNamespaceCheck?: boolean;
}
