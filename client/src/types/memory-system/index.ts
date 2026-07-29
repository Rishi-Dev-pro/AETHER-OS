/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 1 Barrel Export (`index.ts`)
 *
 * @file index.ts
 * @description Public API barrel exporting immutable contracts, factories, enums,
 * and error taxonomies for Phase 9.6 Milestone 1.
 *
 * @module @aether/memory-system
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

// Export Core Types and Constants
export {
  type MemoryType,
  MEMORY_TYPES,
  type MemoryMetadata,
  type MemoryEntry,
  type MemoryQuery,
  type MemoryScore,
  type MemorySearchResult,
  type MemoryCollection,
  type MemorySnapshot,
} from "./types";

// Export Immutable Factory Functions & Inputs
export {
  type CreateMemoryMetadataInput,
  createMemoryMetadata,
  type CreateMemoryEntryInput,
  createMemoryEntry,
  type CreateMemoryQueryInput,
  createMemoryQuery,
  type CreateMemoryScoreInput,
  createMemoryScore,
  type CreateMemorySearchResultInput,
  createMemorySearchResult,
  type CreateMemoryCollectionInput,
  createMemoryCollection,
  type CreateMemorySnapshotInput,
  createMemorySnapshot,
} from "./types";

// Export Typed Error Hierarchy & Utilities
export {
  type AetherMemoryErrorContract,
  AetherMemoryError,
  MemoryNotFoundError,
  InvalidMemoryQueryError,
  MemoryStorageError,
  MemoryIndexError,
  ImmutableMutationError,
  MemoryValidationError,
  isAetherMemoryError,
} from "./errors";
