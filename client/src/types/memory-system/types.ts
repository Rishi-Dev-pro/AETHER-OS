/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 1: Memory Contracts & Data Models (`types.ts`)
 *
 * @file types.ts
 * @description Immutable data models, readonly contracts, and deterministic factory functions
 * for all Memory System components across AETHER OS.
 *
 * @module @aether/memory-system/types
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { MemoryValidationError } from "./errors";

// ============================================================================
// 1. CORE ENUMS & LITERAL TYPES
// ============================================================================

/**
 * Supported Memory Subsystem Classifications.
 */
export type MemoryType =
  | "working"
  | "short_term"
  | "long_term"
  | "semantic"
  | "episodic";

/**
 * Array of canonical MemoryType values for runtime validation.
 */
export const MEMORY_TYPES: readonly MemoryType[] = Object.freeze([
  "working",
  "short_term",
  "long_term",
  "semantic",
  "episodic",
]);

// ============================================================================
// 2. READONLY DATA MODEL CONTRACTS
// ============================================================================

/**
 * Immutable metadata envelope accompanying every MemoryEntry.
 */
export interface MemoryMetadata {
  readonly id: string;
  readonly createdAt: number; // Unix timestamp in ms
  readonly updatedAt: number; // Unix timestamp in ms
  readonly lastAccessedAt: number; // Unix timestamp in ms
  readonly accessCount: number;
  readonly importanceScore: number; // Normalized range [0.0 - 1.0]
  readonly confidenceScore: number; // Normalized range [0.0 - 1.0]
  readonly sourceSessionId?: string;
  readonly tags: readonly string[];
  readonly customMetadata: Readonly<Record<string, unknown>>;
}

/**
 * Canonical immutable Memory Entry contract.
 */
export interface MemoryEntry {
  readonly id: string;
  readonly type: MemoryType;
  readonly content: string;
  readonly embedding?: readonly number[];
  readonly metadata: MemoryMetadata;
}

/**
 * Readonly Memory Query Parameters.
 */
export interface MemoryQuery {
  readonly textQuery?: string;
  readonly vectorQuery?: readonly number[];
  readonly targetTypes?: readonly MemoryType[];
  readonly minImportance?: number;
  readonly minConfidence?: number;
  readonly tags?: readonly string[];
  readonly limit: number;
  readonly timeRange?: {
    readonly startMs: number;
    readonly endMs: number;
  };
}

/**
 * Composited Memory Ranking Score metrics.
 */
export interface MemoryScore {
  readonly relevance: number; // Vector / Keyword similarity score [0 - 1]
  readonly recency: number; // Exponential decay factor [0 - 1]
  readonly frequency: number; // Logarithmic access score [0 - 1]
  readonly importance: number; // Static weight score [0 - 1]
  readonly confidence: number; // Source reliability score [0 - 1]
  readonly finalScore: number; // Composited final ranking weight
}

/**
 * Single Memory Retrieval Search Result.
 */
export interface MemorySearchResult {
  readonly entry: MemoryEntry;
  readonly score: MemoryScore;
}

/**
 * Memory Collection Container contract.
 */
export interface MemoryCollection {
  readonly name: string;
  readonly entries: readonly MemoryEntry[];
  readonly totalCount: number;
}

/**
 * Memory Snapshot contract representing state at a point in time.
 */
export interface MemorySnapshot {
  readonly snapshotId: string;
  readonly timestamp: number;
  readonly collections: readonly MemoryCollection[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ============================================================================
// 3. DETERMINISTIC IMMUTABLE FACTORIES
// ============================================================================

/**
 * Input parameters for creating MemoryMetadata.
 */
export interface CreateMemoryMetadataInput {
  readonly id: string;
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly lastAccessedAt?: number;
  readonly accessCount?: number;
  readonly importanceScore?: number;
  readonly confidenceScore?: number;
  readonly sourceSessionId?: string;
  readonly tags?: readonly string[];
  readonly customMetadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable, deep-frozen MemoryMetadata object.
 */
export function createMemoryMetadata(
  input: CreateMemoryMetadataInput
): Readonly<MemoryMetadata> {
  if (!input.id || input.id.trim() === "") {
    throw new MemoryValidationError("MemoryMetadata requires a non-empty id.");
  }

  const importanceScore = input.importanceScore ?? 0.5;
  if (
    typeof importanceScore !== "number" ||
    isNaN(importanceScore) ||
    importanceScore < 0.0 ||
    importanceScore > 1.0
  ) {
    throw new MemoryValidationError(
      `importanceScore must be a number between 0.0 and 1.0. Received: ${importanceScore}`
    );
  }

  const confidenceScore = input.confidenceScore ?? 1.0;
  if (
    typeof confidenceScore !== "number" ||
    isNaN(confidenceScore) ||
    confidenceScore < 0.0 ||
    confidenceScore > 1.0
  ) {
    throw new MemoryValidationError(
      `confidenceScore must be a number between 0.0 and 1.0. Received: ${confidenceScore}`
    );
  }

  const accessCount = input.accessCount ?? 0;
  if (typeof accessCount !== "number" || accessCount < 0 || !Number.isInteger(accessCount)) {
    throw new MemoryValidationError(
      `accessCount must be a non-negative integer. Received: ${accessCount}`
    );
  }

  const now = Date.now();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? createdAt;
  const lastAccessedAt = input.lastAccessedAt ?? updatedAt;

  if (createdAt < 0 || updatedAt < 0 || lastAccessedAt < 0) {
    throw new MemoryValidationError("Timestamps must be non-negative numbers.");
  }

  const rawTags = input.tags ? [...input.tags] : [];
  const rawCustom = input.customMetadata ? { ...input.customMetadata } : {};

  const metadata: MemoryMetadata = {
    id: input.id.trim(),
    createdAt,
    updatedAt,
    lastAccessedAt,
    accessCount,
    importanceScore,
    confidenceScore,
    sourceSessionId: input.sourceSessionId?.trim(),
    tags: rawTags,
    customMetadata: rawCustom,
  };

  return deepFreeze(metadata);
}

/**
 * Input parameters for creating a MemoryEntry.
 */
export interface CreateMemoryEntryInput {
  readonly id: string;
  readonly type: MemoryType;
  readonly content: string;
  readonly embedding?: readonly number[];
  readonly metadata?: CreateMemoryMetadataInput | MemoryMetadata;
}

/**
 * Factory function creating an immutable, deep-frozen MemoryEntry object.
 */
export function createMemoryEntry(
  input: CreateMemoryEntryInput
): Readonly<MemoryEntry> {
  if (!input.id || input.id.trim() === "") {
    throw new MemoryValidationError("MemoryEntry requires a non-empty id.");
  }

  if (!MEMORY_TYPES.includes(input.type)) {
    throw new MemoryValidationError(
      `Invalid MemoryType: '${input.type}'. Must be one of: ${MEMORY_TYPES.join(", ")}`
    );
  }

  if (typeof input.content !== "string" || input.content.trim() === "") {
    throw new MemoryValidationError("MemoryEntry requires non-empty text content.");
  }

  if (input.embedding) {
    if (!Array.isArray(input.embedding) || input.embedding.some((n) => typeof n !== "number" || isNaN(n))) {
      throw new MemoryValidationError("MemoryEntry embedding must be an array of valid numbers.");
    }
  }

  let metadataObj: MemoryMetadata;
  if (!input.metadata) {
    metadataObj = createMemoryMetadata({ id: input.id.trim() });
  } else if ("createdAt" in input.metadata) {
    metadataObj = input.metadata as MemoryMetadata;
  } else {
    metadataObj = createMemoryMetadata(input.metadata);
  }

  const entry: MemoryEntry = {
    id: input.id.trim(),
    type: input.type,
    content: input.content,
    embedding: input.embedding ? [...input.embedding] : undefined,
    metadata: metadataObj,
  };

  return deepFreeze(entry);
}

/**
 * Input parameters for creating a MemoryQuery.
 */
export interface CreateMemoryQueryInput {
  readonly textQuery?: string;
  readonly vectorQuery?: readonly number[];
  readonly targetTypes?: readonly MemoryType[];
  readonly minImportance?: number;
  readonly minConfidence?: number;
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly timeRange?: {
    readonly startMs: number;
    readonly endMs: number;
  };
}

/**
 * Factory function creating an immutable, deep-frozen MemoryQuery object.
 */
export function createMemoryQuery(
  input: CreateMemoryQueryInput
): Readonly<MemoryQuery> {
  const limit = input.limit ?? 10;
  if (typeof limit !== "number" || limit <= 0 || !Number.isInteger(limit)) {
    throw new MemoryValidationError(`Query limit must be a positive integer. Received: ${limit}`);
  }

  if (input.minImportance !== undefined) {
    if (
      typeof input.minImportance !== "number" ||
      isNaN(input.minImportance) ||
      input.minImportance < 0.0 ||
      input.minImportance > 1.0
    ) {
      throw new MemoryValidationError(
        `minImportance must be between 0.0 and 1.0. Received: ${input.minImportance}`
      );
    }
  }

  if (input.minConfidence !== undefined) {
    if (
      typeof input.minConfidence !== "number" ||
      isNaN(input.minConfidence) ||
      input.minConfidence < 0.0 ||
      input.minConfidence > 1.0
    ) {
      throw new MemoryValidationError(
        `minConfidence must be between 0.0 and 1.0. Received: ${input.minConfidence}`
      );
    }
  }

  if (input.targetTypes) {
    for (const t of input.targetTypes) {
      if (!MEMORY_TYPES.includes(t)) {
        throw new MemoryValidationError(`Invalid target MemoryType in query: '${t}'`);
      }
    }
  }

  if (input.vectorQuery) {
    if (!Array.isArray(input.vectorQuery) || input.vectorQuery.some((n) => typeof n !== "number" || isNaN(n))) {
      throw new MemoryValidationError("vectorQuery must be an array of valid numbers.");
    }
  }

  if (input.timeRange) {
    if (input.timeRange.startMs < 0 || input.timeRange.endMs < 0) {
      throw new MemoryValidationError("timeRange timestamps must be non-negative.");
    }
    if (input.timeRange.startMs > input.timeRange.endMs) {
      throw new MemoryValidationError("timeRange startMs cannot be greater than endMs.");
    }
  }

  const query: MemoryQuery = {
    textQuery: input.textQuery?.trim(),
    vectorQuery: input.vectorQuery ? [...input.vectorQuery] : undefined,
    targetTypes: input.targetTypes ? [...input.targetTypes] : undefined,
    minImportance: input.minImportance,
    minConfidence: input.minConfidence,
    tags: input.tags ? [...input.tags] : undefined,
    limit,
    timeRange: input.timeRange ? { ...input.timeRange } : undefined,
  };

  return deepFreeze(query);
}

/**
 * Input parameters for creating a MemoryScore.
 */
export interface CreateMemoryScoreInput {
  readonly relevance: number;
  readonly recency: number;
  readonly frequency: number;
  readonly importance: number;
  readonly confidence: number;
  readonly finalScore: number;
}

/**
 * Factory function creating an immutable, deep-frozen MemoryScore object.
 */
export function createMemoryScore(
  input: CreateMemoryScoreInput
): Readonly<MemoryScore> {
  const fields: Array<keyof CreateMemoryScoreInput> = [
    "relevance",
    "recency",
    "frequency",
    "importance",
    "confidence",
    "finalScore",
  ];

  for (const field of fields) {
    const val = input[field];
    if (typeof val !== "number" || isNaN(val)) {
      throw new MemoryValidationError(`MemoryScore field '${field}' must be a valid number.`);
    }
  }

  const score: MemoryScore = {
    relevance: input.relevance,
    recency: input.recency,
    frequency: input.frequency,
    importance: input.importance,
    confidence: input.confidence,
    finalScore: input.finalScore,
  };

  return deepFreeze(score);
}

/**
 * Input parameters for creating a MemorySearchResult.
 */
export interface CreateMemorySearchResultInput {
  readonly entry: MemoryEntry | CreateMemoryEntryInput;
  readonly score: MemoryScore | CreateMemoryScoreInput;
}

/**
 * Factory function creating an immutable, deep-frozen MemorySearchResult object.
 */
export function createMemorySearchResult(
  input: CreateMemorySearchResultInput
): Readonly<MemorySearchResult> {
  const entryObj = "content" in input.entry && "metadata" in input.entry
    ? (input.entry as MemoryEntry)
    : createMemoryEntry(input.entry as CreateMemoryEntryInput);

  const scoreObj = "finalScore" in input.score
    ? (input.score as MemoryScore)
    : createMemoryScore(input.score as CreateMemoryScoreInput);

  const searchResult: MemorySearchResult = {
    entry: entryObj,
    score: scoreObj,
  };

  return deepFreeze(searchResult);
}

/**
 * Input parameters for creating a MemoryCollection.
 */
export interface CreateMemoryCollectionInput {
  readonly name: string;
  readonly entries: readonly (MemoryEntry | CreateMemoryEntryInput)[];
}

/**
 * Factory function creating an immutable, deep-frozen MemoryCollection object.
 */
export function createMemoryCollection(
  input: CreateMemoryCollectionInput
): Readonly<MemoryCollection> {
  if (!input.name || input.name.trim() === "") {
    throw new MemoryValidationError("MemoryCollection requires a non-empty name.");
  }

  if (!Array.isArray(input.entries)) {
    throw new MemoryValidationError("MemoryCollection entries must be an array.");
  }

  const processedEntries = input.entries.map((e) =>
    "content" in e && "metadata" in e ? (e as MemoryEntry) : createMemoryEntry(e as CreateMemoryEntryInput)
  );

  const collection: MemoryCollection = {
    name: input.name.trim(),
    entries: processedEntries,
    totalCount: processedEntries.length,
  };

  return deepFreeze(collection);
}

/**
 * Input parameters for creating a MemorySnapshot.
 */
export interface CreateMemorySnapshotInput {
  readonly snapshotId: string;
  readonly timestamp?: number;
  readonly collections: readonly (MemoryCollection | CreateMemoryCollectionInput)[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable, deep-frozen MemorySnapshot object.
 */
export function createMemorySnapshot(
  input: CreateMemorySnapshotInput
): Readonly<MemorySnapshot> {
  if (!input.snapshotId || input.snapshotId.trim() === "") {
    throw new MemoryValidationError("MemorySnapshot requires a non-empty snapshotId.");
  }

  if (!Array.isArray(input.collections)) {
    throw new MemoryValidationError("MemorySnapshot collections must be an array.");
  }

  const timestamp = input.timestamp ?? Date.now();
  if (timestamp < 0) {
    throw new MemoryValidationError("MemorySnapshot timestamp must be non-negative.");
  }

  const processedCollections = input.collections.map((c) =>
    "totalCount" in c ? (c as MemoryCollection) : createMemoryCollection(c as CreateMemoryCollectionInput)
  );

  const snapshot: MemorySnapshot = {
    snapshotId: input.snapshotId.trim(),
    timestamp,
    collections: processedCollections,
    metadata: input.metadata ? { ...input.metadata } : {},
  };

  return deepFreeze(snapshot);
}
