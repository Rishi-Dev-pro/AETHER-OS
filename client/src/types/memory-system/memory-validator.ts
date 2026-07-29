/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 2: Memory Validator (`memory-validator.ts`)
 *
 * @file memory-validator.ts
 * @description Fail-fast validation engine enforcing runtime invariants for all
 * Memory System contracts, queries, metadata, entries, and scores.
 *
 * @module @aether/memory-system/memory-validator
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import {
  MEMORY_TYPES,
  type MemoryEntry,
  type MemoryMetadata,
  type MemoryQuery,
  type MemoryScore,
  type MemoryCollection,
  type MemorySnapshot,
} from "./types";
import { MemoryValidationError, InvalidMemoryQueryError } from "./errors";

// ============================================================================
// MEMORY VALIDATOR ENGINE
// ============================================================================

/**
 * Validates a MemoryMetadata object against invariant rules.
 * Throws MemoryValidationError if any validation fails.
 */
export function validateMemoryMetadata(metadata: unknown): asserts metadata is MemoryMetadata {
  if (!metadata || typeof metadata !== "object") {
    throw new MemoryValidationError("MemoryMetadata must be a non-null object.");
  }

  const meta = metadata as Record<string, unknown>;

  if (typeof meta["id"] !== "string" || meta["id"].trim() === "") {
    throw new MemoryValidationError("MemoryMetadata requires a non-empty string 'id'.");
  }

  const importanceScore = meta["importanceScore"];
  if (
    typeof importanceScore !== "number" ||
    isNaN(importanceScore) ||
    importanceScore < 0.0 ||
    importanceScore > 1.0
  ) {
    throw new MemoryValidationError(
      `importanceScore must be a valid number between 0.0 and 1.0. Received: ${importanceScore}`
    );
  }

  const confidenceScore = meta["confidenceScore"];
  if (
    typeof confidenceScore !== "number" ||
    isNaN(confidenceScore) ||
    confidenceScore < 0.0 ||
    confidenceScore > 1.0
  ) {
    throw new MemoryValidationError(
      `confidenceScore must be a valid number between 0.0 and 1.0. Received: ${confidenceScore}`
    );
  }

  const accessCount = meta["accessCount"];
  if (
    typeof accessCount !== "number" ||
    isNaN(accessCount) ||
    accessCount < 0 ||
    !Number.isInteger(accessCount)
  ) {
    throw new MemoryValidationError(
      `accessCount must be a non-negative integer. Received: ${accessCount}`
    );
  }

  const createdAt = meta["createdAt"];
  const updatedAt = meta["updatedAt"];
  const lastAccessedAt = meta["lastAccessedAt"];

  if (typeof createdAt !== "number" || isNaN(createdAt) || createdAt < 0) {
    throw new MemoryValidationError(`createdAt must be a non-negative timestamp. Received: ${createdAt}`);
  }
  if (typeof updatedAt !== "number" || isNaN(updatedAt) || updatedAt < 0) {
    throw new MemoryValidationError(`updatedAt must be a non-negative timestamp. Received: ${updatedAt}`);
  }
  if (typeof lastAccessedAt !== "number" || isNaN(lastAccessedAt) || lastAccessedAt < 0) {
    throw new MemoryValidationError(
      `lastAccessedAt must be a non-negative timestamp. Received: ${lastAccessedAt}`
    );
  }

  if (Array.isArray(meta["tags"])) {
    for (const tag of meta["tags"]) {
      if (typeof tag !== "string") {
        throw new MemoryValidationError("All tags in MemoryMetadata must be strings.");
      }
    }
  } else {
    throw new MemoryValidationError("MemoryMetadata tags must be an array.");
  }
}

/**
 * Validates a MemoryEntry contract against invariant rules.
 * Throws MemoryValidationError if any validation fails.
 */
export function validateMemoryEntry(entry: unknown): asserts entry is MemoryEntry {
  if (!entry || typeof entry !== "object") {
    throw new MemoryValidationError("MemoryEntry must be a non-null object.");
  }

  const ent = entry as Record<string, unknown>;

  if (typeof ent["id"] !== "string" || ent["id"].trim() === "") {
    throw new MemoryValidationError("MemoryEntry requires a non-empty string 'id'.");
  }

  const type = ent["type"];
  if (typeof type !== "string" || !MEMORY_TYPES.includes(type as any)) {
    throw new MemoryValidationError(
      `Invalid MemoryType: '${type}'. Must be one of: ${MEMORY_TYPES.join(", ")}`
    );
  }

  if (typeof ent["content"] !== "string" || ent["content"].trim() === "") {
    throw new MemoryValidationError("MemoryEntry content must be a non-empty string.");
  }

  if (ent["embedding"] !== undefined) {
    if (!Array.isArray(ent["embedding"])) {
      throw new MemoryValidationError("MemoryEntry embedding must be an array of numbers.");
    }
    for (const num of ent["embedding"]) {
      if (typeof num !== "number" || isNaN(num)) {
        throw new MemoryValidationError("MemoryEntry embedding array must contain valid numbers.");
      }
    }
  }

  validateMemoryMetadata(ent["metadata"]);
}

/**
 * Validates a MemoryQuery object.
 * Throws InvalidMemoryQueryError or MemoryValidationError if any validation fails.
 */
export function validateMemoryQuery(query: unknown): asserts query is MemoryQuery {
  if (!query || typeof query !== "object") {
    throw new InvalidMemoryQueryError("MemoryQuery must be a non-null object.");
  }

  const q = query as Record<string, unknown>;

  const limit = q["limit"];
  if (typeof limit !== "number" || isNaN(limit) || limit <= 0 || !Number.isInteger(limit)) {
    throw new InvalidMemoryQueryError(`MemoryQuery limit must be a positive integer. Received: ${limit}`);
  }

  if (q["minImportance"] !== undefined) {
    const minImp = q["minImportance"];
    if (typeof minImp !== "number" || isNaN(minImp) || minImp < 0.0 || minImp > 1.0) {
      throw new InvalidMemoryQueryError(`minImportance must be between 0.0 and 1.0. Received: ${minImp}`);
    }
  }

  if (q["minConfidence"] !== undefined) {
    const minConf = q["minConfidence"];
    if (typeof minConf !== "number" || isNaN(minConf) || minConf < 0.0 || minConf > 1.0) {
      throw new InvalidMemoryQueryError(`minConfidence must be between 0.0 and 1.0. Received: ${minConf}`);
    }
  }

  if (q["targetTypes"] !== undefined) {
    if (!Array.isArray(q["targetTypes"])) {
      throw new InvalidMemoryQueryError("targetTypes must be an array of MemoryType strings.");
    }
    for (const t of q["targetTypes"]) {
      if (typeof t !== "string" || !MEMORY_TYPES.includes(t as any)) {
        throw new InvalidMemoryQueryError(`Invalid target MemoryType in query: '${t}'`);
      }
    }
  }

  if (q["vectorQuery"] !== undefined) {
    if (!Array.isArray(q["vectorQuery"])) {
      throw new InvalidMemoryQueryError("vectorQuery must be an array of numbers.");
    }
    for (const v of q["vectorQuery"]) {
      if (typeof v !== "number" || isNaN(v)) {
        throw new InvalidMemoryQueryError("vectorQuery elements must be valid numbers.");
      }
    }
  }

  if (q["timeRange"] !== undefined) {
    if (typeof q["timeRange"] !== "object" || q["timeRange"] === null) {
      throw new InvalidMemoryQueryError("timeRange must be an object.");
    }
    const tr = q["timeRange"] as Record<string, unknown>;
    const startMs = tr["startMs"];
    const endMs = tr["endMs"];

    if (typeof startMs !== "number" || isNaN(startMs) || startMs < 0) {
      throw new InvalidMemoryQueryError("timeRange startMs must be a non-negative timestamp.");
    }
    if (typeof endMs !== "number" || isNaN(endMs) || endMs < 0) {
      throw new InvalidMemoryQueryError("timeRange endMs must be a non-negative timestamp.");
    }
    if (startMs > endMs) {
      throw new InvalidMemoryQueryError(`timeRange startMs (${startMs}) cannot exceed endMs (${endMs}).`);
    }
  }
}

/**
 * Validates a MemoryScore object.
 * Throws MemoryValidationError if any validation fails.
 */
export function validateMemoryScore(score: unknown): asserts score is MemoryScore {
  if (!score || typeof score !== "object") {
    throw new MemoryValidationError("MemoryScore must be a non-null object.");
  }

  const s = score as Record<string, unknown>;
  const fields: Array<keyof MemoryScore> = [
    "relevance",
    "recency",
    "frequency",
    "importance",
    "confidence",
    "finalScore",
  ];

  for (const f of fields) {
    const val = s[f];
    if (typeof val !== "number" || isNaN(val)) {
      throw new MemoryValidationError(`MemoryScore '${f}' must be a valid number.`);
    }
  }
}

/**
 * Validates a MemoryCollection contract.
 * Throws MemoryValidationError if any validation fails.
 */
export function validateMemoryCollection(collection: unknown): asserts collection is MemoryCollection {
  if (!collection || typeof collection !== "object") {
    throw new MemoryValidationError("MemoryCollection must be a non-null object.");
  }

  const c = collection as Record<string, unknown>;

  if (typeof c["name"] !== "string" || c["name"].trim() === "") {
    throw new MemoryValidationError("MemoryCollection requires a non-empty name.");
  }

  if (!Array.isArray(c["entries"])) {
    throw new MemoryValidationError("MemoryCollection entries must be an array.");
  }

  if (typeof c["totalCount"] !== "number" || c["totalCount"] < 0 || !Number.isInteger(c["totalCount"])) {
    throw new MemoryValidationError("MemoryCollection totalCount must be a non-negative integer.");
  }

  if (c["totalCount"] !== c["entries"].length) {
    throw new MemoryValidationError(
      `MemoryCollection totalCount (${c["totalCount"]}) does not match entries length (${c["entries"].length}).`
    );
  }

  for (const entry of c["entries"]) {
    validateMemoryEntry(entry);
  }
}

/**
 * Validates a MemorySnapshot contract.
 * Throws MemoryValidationError if any validation fails.
 */
export function validateMemorySnapshot(snapshot: unknown): asserts snapshot is MemorySnapshot {
  if (!snapshot || typeof snapshot !== "object") {
    throw new MemoryValidationError("MemorySnapshot must be a non-null object.");
  }

  const s = snapshot as Record<string, unknown>;

  if (typeof s["snapshotId"] !== "string" || s["snapshotId"].trim() === "") {
    throw new MemoryValidationError("MemorySnapshot requires a non-empty string snapshotId.");
  }

  if (typeof s["timestamp"] !== "number" || isNaN(s["timestamp"]) || s["timestamp"] < 0) {
    throw new MemoryValidationError("MemorySnapshot timestamp must be a non-negative number.");
  }

  if (!Array.isArray(s["collections"])) {
    throw new MemoryValidationError("MemorySnapshot collections must be an array.");
  }

  for (const col of s["collections"]) {
    validateMemoryCollection(col);
  }
}
