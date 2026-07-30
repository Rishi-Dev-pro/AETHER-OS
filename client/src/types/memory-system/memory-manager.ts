/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 7: Memory Manager & Lifecycle (`memory-manager.ts`)
 *
 * @file memory-manager.ts
 * @description Orchestration layer managing the complete lifecycle of memories, coordinating
 * MemoryStore, MemoryIndex, MemoryRetriever, MemoryValidator, and MemoryRanker.
 *
 * @module @aether/memory-system/memory-manager
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import {
  createMemoryEntry,
  createMemorySnapshot,
  type MemoryEntry,
  type MemoryQuery,
  type MemorySearchResult,
  type MemorySnapshot,
  type CreateMemoryEntryInput,
  type CreateMemoryQueryInput,
  type CreateMemorySnapshotInput,
  type MemoryType,
} from "./types";
import { validateMemoryEntry, validateMemoryQuery, validateMemorySnapshot } from "./memory-validator";
import { clampScore, type MemoryScoringWeights } from "./memory-ranker";
import { type IMemoryStore, MemoryStore } from "./memory-store";
import { type IMemoryIndex, MemoryIndex } from "./memory-index";
import { type IMemoryRetriever, MemoryRetriever } from "./memory-retriever";
import { MemoryValidationError, MemoryNotFoundError } from "./errors";

/**
 * Interface contract for the MemoryManager orchestration layer.
 */
export interface IMemoryManager {
  createMemory(input: CreateMemoryEntryInput | MemoryEntry): Readonly<MemoryEntry>;
  getMemory(id: string): Readonly<MemoryEntry>;
  retrieveMemoryById(id: string): Readonly<MemorySearchResult>;
  retrieveMemory(
    queryInput: MemoryQuery | CreateMemoryQueryInput,
    options?: {
      readonly includeArchived?: boolean;
      readonly includeExpired?: boolean;
      readonly currentMs?: number;
      readonly weights?: MemoryScoringWeights;
    }
  ): readonly MemorySearchResult[];
  updateMemory(
    id: string,
    updates: {
      content?: string;
      embedding?: readonly number[];
      importanceScore?: number;
      confidenceScore?: number;
      tags?: readonly string[];
      customMetadata?: Record<string, unknown>;
    }
  ): Readonly<MemoryEntry>;
  reinforceMemory(
    id: string,
    options?: {
      readonly importanceDelta?: number;
      readonly importanceBoost?: number;
    }
  ): Readonly<MemoryEntry>;
  archiveMemory(id: string): Readonly<MemoryEntry>;
  restoreMemory(id: string): Readonly<MemoryEntry>;
  expireMemory(id: string): Readonly<MemoryEntry>;
  deleteMemory(id: string): boolean;
  exportSnapshot(snapshotId: string, metadata?: Record<string, unknown>): Readonly<MemorySnapshot>;
  generateSnapshot(snapshotId: string, metadata?: Record<string, unknown>): Readonly<MemorySnapshot>;
  importSnapshot(
    snapshot: MemorySnapshot | CreateMemorySnapshotInput,
    options?: { readonly clearExisting?: boolean }
  ): readonly MemoryEntry[];
  loadSnapshot(
    snapshot: MemorySnapshot | CreateMemorySnapshotInput,
    options?: { readonly clearExisting?: boolean }
  ): readonly MemoryEntry[];
  listMemories(filter?: { type?: MemoryType }): readonly MemoryEntry[];
}

/**
 * Canonical implementation of MemoryManager orchestration layer.
 */
export class MemoryManager implements IMemoryManager {
  private readonly store: IMemoryStore;
  private readonly index: IMemoryIndex;
  private readonly retriever: IMemoryRetriever;

  constructor(options?: {
    store?: IMemoryStore;
    index?: IMemoryIndex;
    retriever?: IMemoryRetriever;
  }) {
    this.store = options?.store ?? new MemoryStore();
    this.index = options?.index ?? new MemoryIndex();
    this.retriever = options?.retriever ?? new MemoryRetriever(this.store, this.index);

    // Sync index with pre-existing store entries if any exist
    const existingMemories = this.store.listMemories();
    if (existingMemories.length > 0) {
      this.index.buildMemoryIndex(existingMemories);
    }
  }

  /**
   * Creates a new memory entry via MemoryStore and updates MemoryIndex.
   */
  public createMemory(input: CreateMemoryEntryInput | MemoryEntry): Readonly<MemoryEntry> {
    const entry = this.store.createMemory(input);
    this.index.updateMemoryIndex(entry);
    return entry;
  }

  /**
   * Retrieves a single MemoryEntry by ID, updating access metadata and syncing index.
   */
  public getMemory(id: string): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("getMemory requires a non-empty string ID.");
    }
    const entry = this.store.getMemory(id);
    this.index.updateMemoryIndex(entry);
    return entry;
  }

  /**
   * Retrieves a single MemorySearchResult by ID via MemoryRetriever.
   */
  public retrieveMemoryById(id: string): Readonly<MemorySearchResult> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("retrieveMemoryById requires a non-empty string ID.");
    }
    const searchResult = this.retriever.retrieveMemoryById(id);
    this.index.updateMemoryIndex(searchResult.entry);
    return searchResult;
  }

  /**
   * Deterministic retrieval pipeline execution with status-aware candidate filtering (Archived/Expired).
   */
  public retrieveMemory(
    queryInput: MemoryQuery | CreateMemoryQueryInput,
    options?: {
      readonly includeArchived?: boolean;
      readonly includeExpired?: boolean;
      readonly currentMs?: number;
      readonly weights?: MemoryScoringWeights;
    }
  ): readonly MemorySearchResult[] {
    validateMemoryQuery(queryInput);

    const rawResults = this.retriever.retrieveMemories(queryInput, {
      currentMs: options?.currentMs,
      weights: options?.weights,
    });

    const includeArchived = options?.includeArchived ?? (queryInput.tags?.includes("archived") ?? false);
    const includeExpired = options?.includeExpired ?? (queryInput.tags?.includes("expired") ?? false);

    const filtered = rawResults.filter((res) => {
      const isArchived =
        res.entry.metadata.tags.includes("archived") ||
        res.entry.metadata.customMetadata.isArchived === true;
      if (isArchived && !includeArchived) {
        return false;
      }

      const isExpired =
        res.entry.metadata.tags.includes("expired") ||
        res.entry.metadata.customMetadata.isExpired === true;
      if (isExpired && !includeExpired) {
        return false;
      }

      return true;
    });

    return deepFreeze(filtered);
  }

  /**
   * Updates an existing memory entry immutably and synchronizes MemoryIndex.
   */
  public updateMemory(
    id: string,
    updates: {
      content?: string;
      embedding?: readonly number[];
      importanceScore?: number;
      confidenceScore?: number;
      tags?: readonly string[];
      customMetadata?: Record<string, unknown>;
    }
  ): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("updateMemory requires a non-empty string ID.");
    }

    const updated = this.store.updateMemory(id, updates);
    this.index.updateMemoryIndex(updated);
    return updated;
  }

  /**
   * Deterministically reinforces a memory entry by updating access metadata and boosting importance score.
   */
  public reinforceMemory(
    id: string,
    options?: {
      readonly importanceDelta?: number;
      readonly importanceBoost?: number;
    }
  ): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("reinforceMemory requires a non-empty string ID.");
    }

    // Access memory to trigger lastAccessedAt and accessCount update in store
    const accessed = this.getMemory(id);

    const delta = options?.importanceDelta ?? options?.importanceBoost ?? 0.05;
    const newImportance = clampScore(accessed.metadata.importanceScore + delta);

    const reinforced = this.store.updateMemory(id, {
      importanceScore: newImportance,
    });

    this.index.updateMemoryIndex(reinforced);
    return reinforced;
  }

  /**
   * Transitions memory to archived state. Archived memories remain retrievable only when explicitly requested.
   */
  public archiveMemory(id: string): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("archiveMemory requires a non-empty string ID.");
    }

    const existing = this.store.getMemory(id);
    const tags = existing.metadata.tags.includes("archived")
      ? existing.metadata.tags
      : [...existing.metadata.tags, "archived"];

    const customMetadata = {
      ...existing.metadata.customMetadata,
      isArchived: true,
    };

    const archived = this.store.updateMemory(id, {
      tags,
      customMetadata,
    });

    this.index.updateMemoryIndex(archived);
    return archived;
  }

  /**
   * Restores an archived memory entry to active state.
   */
  public restoreMemory(id: string): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("restoreMemory requires a non-empty string ID.");
    }

    const existing = this.store.getMemory(id);
    const tags = existing.metadata.tags.filter((t) => t !== "archived");
    const customMetadata = {
      ...existing.metadata.customMetadata,
      isArchived: false,
    };

    const restored = this.store.updateMemory(id, {
      tags,
      customMetadata,
    });

    this.index.updateMemoryIndex(restored);
    return restored;
  }

  /**
   * Marks a memory entry as expired, preventing normal retrieval while preserving historical record.
   */
  public expireMemory(id: string): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("expireMemory requires a non-empty string ID.");
    }

    const existing = this.store.getMemory(id);
    const tags = existing.metadata.tags.includes("expired")
      ? existing.metadata.tags
      : [...existing.metadata.tags, "expired"];

    const customMetadata = {
      ...existing.metadata.customMetadata,
      isExpired: true,
    };

    const expired = this.store.updateMemory(id, {
      tags,
      customMetadata,
    });

    this.index.updateMemoryIndex(expired);
    return expired;
  }

  /**
   * Deletes a memory entry permanently from both MemoryStore and MemoryIndex.
   */
  public deleteMemory(id: string): boolean {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("deleteMemory requires a non-empty string ID.");
    }

    const deletedFromStore = this.store.deleteMemory(id);
    this.index.removeFromIndex(id);
    return deletedFromStore;
  }

  /**
   * Exports a validated, deep-frozen snapshot of current memory store state.
   */
  public exportSnapshot(snapshotId: string, metadata?: Record<string, unknown>): Readonly<MemorySnapshot> {
    if (!snapshotId || snapshotId.trim() === "") {
      throw new MemoryValidationError("exportSnapshot requires a non-empty snapshotId.");
    }

    const baseSnapshot = this.store.getMemorySnapshot(snapshotId);
    let finalSnapshot = baseSnapshot;

    if (metadata && Object.keys(metadata).length > 0) {
      finalSnapshot = createMemorySnapshot({
        snapshotId: baseSnapshot.snapshotId,
        timestamp: baseSnapshot.timestamp,
        collections: baseSnapshot.collections,
        metadata: { ...baseSnapshot.metadata, ...metadata },
      });
    }

    validateMemorySnapshot(finalSnapshot);
    return deepFreeze(finalSnapshot);
  }

  /**
   * Alias for exportSnapshot.
   */
  public generateSnapshot(snapshotId: string, metadata?: Record<string, unknown>): Readonly<MemorySnapshot> {
    return this.exportSnapshot(snapshotId, metadata);
  }

  /**
   * Validates snapshot, imports entries into MemoryStore, and rebuilds MemoryIndex.
   */
  public importSnapshot(
    snapshotInput: MemorySnapshot | CreateMemorySnapshotInput,
    options?: { readonly clearExisting?: boolean }
  ): readonly MemoryEntry[] {
    const snapshot = "snapshotId" in snapshotInput && "collections" in snapshotInput && "timestamp" in snapshotInput
      ? (snapshotInput as MemorySnapshot)
      : createMemorySnapshot(snapshotInput as CreateMemorySnapshotInput);

    validateMemorySnapshot(snapshot);

    const shouldClear = options?.clearExisting ?? true;
    if (shouldClear) {
      const currentMemories = this.store.listMemories();
      for (const mem of currentMemories) {
        this.store.deleteMemory(mem.id);
      }
    }

    const importedEntries: MemoryEntry[] = [];

    for (const collection of snapshot.collections) {
      for (const entry of collection.entries) {
        validateMemoryEntry(entry);
        // Remove existing entry if clearing is false and ID exists
        if (!shouldClear && this.store.listMemories().some((m) => m.id === entry.id)) {
          this.store.deleteMemory(entry.id);
        }
        const created = this.store.createMemory(entry);
        importedEntries.push(created);
      }
    }

    this.index.buildMemoryIndex(this.store.listMemories());
    return deepFreeze(importedEntries);
  }

  /**
   * Alias for importSnapshot.
   */
  public loadSnapshot(
    snapshotInput: MemorySnapshot | CreateMemorySnapshotInput,
    options?: { readonly clearExisting?: boolean }
  ): readonly MemoryEntry[] {
    return this.importSnapshot(snapshotInput, options);
  }

  /**
   * Lists stored memories with optional MemoryType filter.
   */
  public listMemories(filter?: { type?: MemoryType }): readonly MemoryEntry[] {
    return this.store.listMemories(filter);
  }
}
