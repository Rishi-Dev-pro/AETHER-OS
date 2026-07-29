/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 5: Memory Index (`memory-index.ts`)
 *
 * @file memory-index.ts
 * @description Provider-independent, deterministic in-memory indexing abstraction supporting multi-field memory lookup.
 *
 * @module @aether/memory-system/memory-index
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { type MemoryEntry, type MemoryType } from "./types";
import { validateMemoryEntry } from "./memory-validator";

/**
 * Filter criteria for querying the MemoryIndex.
 */
export interface MemoryIndexQueryFilter {
  readonly types?: readonly MemoryType[];
  readonly tags?: readonly string[];
  readonly minImportance?: number;
  readonly minConfidence?: number;
  readonly timeRange?: {
    readonly startMs: number;
    readonly endMs: number;
  };
}

/**
 * Interface contract for the MemoryIndex abstraction.
 */
export interface IMemoryIndex {
  buildMemoryIndex(entries: readonly MemoryEntry[]): void;
  updateMemoryIndex(entry: MemoryEntry): void;
  removeFromIndex(id: string): void;
  queryMemoryIndex(filter: MemoryIndexQueryFilter): readonly MemoryEntry[];
}

/**
 * Canonical in-memory indexing implementation.
 */
export class MemoryIndex implements IMemoryIndex {
  private readonly idMap: Map<string, MemoryEntry> = new Map();
  private readonly typeMap: Map<MemoryType, Set<string>> = new Map();
  private readonly tagMap: Map<string, Set<string>> = new Map();

  /**
   * Rebuilds the entire index from a list of memory entries.
   */
  public buildMemoryIndex(entries: readonly MemoryEntry[]): void {
    this.idMap.clear();
    this.typeMap.clear();
    this.tagMap.clear();

    for (const entry of entries) {
      this.updateMemoryIndex(entry);
    }
  }

  /**
   * Inserts or updates an individual MemoryEntry in the index.
   */
  public updateMemoryIndex(entry: MemoryEntry): void {
    validateMemoryEntry(entry);

    // Remove previous index pointers if existing
    if (this.idMap.has(entry.id)) {
      this.removeFromIndex(entry.id);
    }

    this.idMap.set(entry.id, entry);

    // Index by MemoryType
    let typeSet = this.typeMap.get(entry.type);
    if (!typeSet) {
      typeSet = new Set();
      this.typeMap.set(entry.type, typeSet);
    }
    typeSet.add(entry.id);

    // Index by Tags
    for (const tag of entry.metadata.tags) {
      let tagSet = this.tagMap.get(tag);
      if (!tagSet) {
        tagSet = new Set();
        this.tagMap.set(tag, tagSet);
      }
      tagSet.add(entry.id);
    }
  }

  /**
   * Removes a MemoryEntry from index structures by ID.
   */
  public removeFromIndex(id: string): void {
    const existing = this.idMap.get(id);
    if (!existing) return;

    this.idMap.delete(id);

    const typeSet = this.typeMap.get(existing.type);
    if (typeSet) {
      typeSet.delete(id);
    }

    for (const tag of existing.metadata.tags) {
      const tagSet = this.tagMap.get(tag);
      if (tagSet) {
        tagSet.delete(id);
      }
    }
  }

  /**
   * Queries indexed entries matching multi-field metadata filter criteria.
   */
  public queryMemoryIndex(filter: MemoryIndexQueryFilter): readonly MemoryEntry[] {
    let candidateIds: Set<string> | null = null;

    // Filter by target types
    if (filter.types && filter.types.length > 0) {
      candidateIds = new Set();
      for (const t of filter.types) {
        const set = this.typeMap.get(t);
        if (set) {
          for (const id of set) candidateIds.add(id);
        }
      }
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      const tagCandidateIds = new Set<string>();
      for (const tag of filter.tags) {
        const set = this.tagMap.get(tag);
        if (set) {
          for (const id of set) tagCandidateIds.add(id);
        }
      }

      if (candidateIds === null) {
        candidateIds = tagCandidateIds;
      } else {
        // Intersect candidate sets
        candidateIds = new Set([...candidateIds].filter((id) => tagCandidateIds.has(id)));
      }
    }

    // If no type/tag filters were provided, evaluate all entries
    const sourceEntries = candidateIds === null
      ? Array.from(this.idMap.values())
      : Array.from(candidateIds).map((id) => this.idMap.get(id)!).filter(Boolean);

    const filtered: MemoryEntry[] = [];

    for (const entry of sourceEntries) {
      if (filter.minImportance !== undefined && entry.metadata.importanceScore < filter.minImportance) {
        continue;
      }

      if (filter.minConfidence !== undefined && entry.metadata.confidenceScore < filter.minConfidence) {
        continue;
      }

      if (filter.timeRange) {
        const created = entry.metadata.createdAt;
        if (created < filter.timeRange.startMs || created > filter.timeRange.endMs) {
          continue;
        }
      }

      filtered.push(entry);
    }

    return deepFreeze(filtered);
  }
}
