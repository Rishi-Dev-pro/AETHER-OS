/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 4: Memory Store (`memory-store.ts`)
 *
 * @file memory-store.ts
 * @description Provider-independent in-memory storage abstraction managing immutable MemoryEntry records.
 *
 * @module @aether/memory-system/memory-store
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import {
  createMemoryEntry,
  createMemorySnapshot,
  createMemoryMetadata,
  type MemoryEntry,
  type MemorySnapshot,
  type CreateMemoryEntryInput,
  type MemoryType,
} from "./types";
import { validateMemoryEntry } from "./memory-validator";
import { MemoryNotFoundError, MemoryValidationError } from "./errors";

/**
 * Interface contract for the MemoryStore abstraction.
 */
export interface IMemoryStore {
  createMemory(input: CreateMemoryEntryInput | MemoryEntry): Readonly<MemoryEntry>;
  updateMemory(id: string, updates: { content?: string; embedding?: readonly number[]; importanceScore?: number; confidenceScore?: number; tags?: readonly string[]; customMetadata?: Record<string, unknown> }): Readonly<MemoryEntry>;
  getMemory(id: string): Readonly<MemoryEntry>;
  deleteMemory(id: string): boolean;
  listMemories(filter?: { type?: MemoryType }): readonly MemoryEntry[];
  getMemorySnapshot(snapshotId: string): Readonly<MemorySnapshot>;
}

/**
 * Canonical implementation of provider-independent MemoryStore.
 */
export class MemoryStore implements IMemoryStore {
  private readonly entries: Map<string, MemoryEntry> = new Map();

  /**
   * Creates and stores an immutable MemoryEntry.
   */
  public createMemory(input: CreateMemoryEntryInput | MemoryEntry): Readonly<MemoryEntry> {
    let entry: MemoryEntry;

    if ("metadata" in input && input.metadata && "createdAt" in input.metadata) {
      entry = input as MemoryEntry;
    } else {
      entry = createMemoryEntry(input as CreateMemoryEntryInput);
    }

    validateMemoryEntry(entry);

    if (this.entries.has(entry.id)) {
      throw new MemoryValidationError(`Memory entry with ID '${entry.id}' already exists in store.`);
    }

    this.entries.set(entry.id, entry);
    return entry;
  }

  /**
   * Updates an existing MemoryEntry immutably by producing a new deep-frozen entry.
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

    const existing = this.entries.get(id.trim());
    if (!existing) {
      throw new MemoryNotFoundError(`Cannot update: Memory entry '${id}' not found.`);
    }

    const now = Date.now();
    const updatedMetadata = createMemoryMetadata({
      id: existing.metadata.id,
      createdAt: existing.metadata.createdAt,
      updatedAt: now,
      lastAccessedAt: existing.metadata.lastAccessedAt,
      accessCount: existing.metadata.accessCount,
      importanceScore: updates.importanceScore ?? existing.metadata.importanceScore,
      confidenceScore: updates.confidenceScore ?? existing.metadata.confidenceScore,
      sourceSessionId: existing.metadata.sourceSessionId,
      tags: updates.tags ?? existing.metadata.tags,
      customMetadata: updates.customMetadata
        ? { ...existing.metadata.customMetadata, ...updates.customMetadata }
        : existing.metadata.customMetadata,
    });

    const updatedEntry = createMemoryEntry({
      id: existing.id,
      type: existing.type,
      content: updates.content ?? existing.content,
      embedding: updates.embedding ?? existing.embedding,
      metadata: updatedMetadata,
    });

    validateMemoryEntry(updatedEntry);
    this.entries.set(id.trim(), updatedEntry);
    return updatedEntry;
  }

  /**
   * Retrieves a MemoryEntry by ID. Updates `lastAccessedAt` and `accessCount` immutably.
   */
  public getMemory(id: string): Readonly<MemoryEntry> {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("getMemory requires a non-empty string ID.");
    }

    const existing = this.entries.get(id.trim());
    if (!existing) {
      throw new MemoryNotFoundError(`Memory entry with ID '${id}' not found.`);
    }

    const now = Date.now();
    const updatedMetadata = createMemoryMetadata({
      id: existing.metadata.id,
      createdAt: existing.metadata.createdAt,
      updatedAt: existing.metadata.updatedAt,
      lastAccessedAt: now,
      accessCount: existing.metadata.accessCount + 1,
      importanceScore: existing.metadata.importanceScore,
      confidenceScore: existing.metadata.confidenceScore,
      sourceSessionId: existing.metadata.sourceSessionId,
      tags: existing.metadata.tags,
      customMetadata: existing.metadata.customMetadata,
    });

    const accessedEntry = createMemoryEntry({
      id: existing.id,
      type: existing.type,
      content: existing.content,
      embedding: existing.embedding,
      metadata: updatedMetadata,
    });

    this.entries.set(id.trim(), accessedEntry);
    return accessedEntry;
  }

  /**
   * Deletes a MemoryEntry by ID.
   */
  public deleteMemory(id: string): boolean {
    if (!id || id.trim() === "") {
      throw new MemoryValidationError("deleteMemory requires a non-empty string ID.");
    }
    return this.entries.delete(id.trim());
  }

  /**
   * Lists all stored memory entries matching an optional filter.
   */
  public listMemories(filter?: { type?: MemoryType }): readonly MemoryEntry[] {
    const results: MemoryEntry[] = [];
    for (const entry of this.entries.values()) {
      if (!filter || !filter.type || entry.type === filter.type) {
        results.push(entry);
      }
    }
    return deepFreeze(results);
  }

  /**
   * Generates a deep-frozen MemorySnapshot of current store contents.
   */
  public getMemorySnapshot(snapshotId: string): Readonly<MemorySnapshot> {
    const list = this.listMemories();
    const snapshot = createMemorySnapshot({
      snapshotId,
      collections: [
        {
          name: "AllMemories",
          entries: list,
        },
      ],
    });

    return snapshot;
  }
}
