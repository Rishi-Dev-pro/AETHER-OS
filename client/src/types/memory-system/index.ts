/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 2 Public API Barrel Update (`index.ts`)
 *
 * @file index.ts
 * @description Public API barrel exporting immutable contracts, factories, enums,
 * error taxonomies, validation rules, and mathematical ranking engines for Phase 9.6.
 *
 * @module @aether/memory-system
 * @version 1.1.0
 * @status APPROVED EDD COMPLIANT
 */

// Export Core Types and Constants (Milestone 1)
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

// Export Immutable Factory Functions & Inputs (Milestone 1)
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

// Export Typed Error Hierarchy & Utilities (Milestone 1)
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

// Export Memory Validator APIs (Milestone 2)
export {
  validateMemoryMetadata,
  validateMemoryEntry,
  validateMemoryQuery,
  validateMemoryScore,
  validateMemoryCollection,
  validateMemorySnapshot,
} from "./memory-validator";

// Export Memory Ranker APIs & Scoring Configuration (Milestone 2)
export {
  type MemoryScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_DECAY_LAMBDA,
  DEFAULT_MAX_ACCESS_COUNT,
  clampScore,
  calculateRecencyScore,
  calculateFrequencyScore,
  type CompositeScoreInput,
  calculateCompositeScore,
  rankMemoryResults,
} from "./memory-ranker";
