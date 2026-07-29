/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 3 Test Suite: Memory Store (`memory-store.test.ts`)
 *
 * @file __tests__/memory-store.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryStore,
  createMemoryEntry,
  MemoryNotFoundError,
  MemoryValidationError,
} from "../index";

describe("Phase 9.6 Milestone 3 — Memory Store Engine", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it("creates, stores, and retrieves memory entries immutably", () => {
    const entry = store.createMemory({
      id: "store-1",
      type: "short_term",
      content: "Recent conversation detail",
    });

    expect(entry.id).toBe("store-1");
    expect(entry.content).toBe("Recent conversation detail");
    expect(Object.isFrozen(entry)).toBe(true);

    const retrieved = store.getMemory("store-1");
    expect(retrieved.id).toBe("store-1");
    expect(retrieved.metadata.accessCount).toBe(1); // Increment access count
    expect(Object.isFrozen(retrieved)).toBe(true);
  });

  it("updates an existing memory entry immutably", () => {
    store.createMemory({
      id: "store-update",
      type: "long_term",
      content: "Initial factual statement",
      metadata: { id: "store-update", importanceScore: 0.5 },
    });

    const updated = store.updateMemory("store-update", {
      content: "Updated factual statement",
      importanceScore: 0.95,
      tags: ["verified", "fact"],
    });

    expect(updated.content).toBe("Updated factual statement");
    expect(updated.metadata.importanceScore).toBe(0.95);
    expect(updated.metadata.tags).toEqual(["verified", "fact"]);
    expect(Object.isFrozen(updated)).toBe(true);
  });

  it("deletes entries and throws MemoryNotFoundError for non-existent IDs", () => {
    store.createMemory({
      id: "store-del",
      type: "working",
      content: "Temporary turn state",
    });

    expect(store.deleteMemory("store-del")).toBe(true);
    expect(() => store.getMemory("store-del")).toThrow(MemoryNotFoundError);
    expect(() => store.updateMemory("store-del", { content: "new" })).toThrow(MemoryNotFoundError);
  });

  it("lists memories with optional type filter and returns frozen snapshots", () => {
    store.createMemory({ id: "m-work", type: "working", content: "Working memory 1" });
    store.createMemory({ id: "m-sem", type: "semantic", content: "Semantic memory 1" });

    const all = store.listMemories();
    expect(all.length).toBe(2);
    expect(Object.isFrozen(all)).toBe(true);

    const semOnly = store.listMemories({ type: "semantic" });
    expect(semOnly.length).toBe(1);
    expect(semOnly[0].id).toBe("m-sem");

    const snapshot = store.getMemorySnapshot("snap-100");
    expect(snapshot.snapshotId).toBe("snap-100");
    expect(snapshot.collections[0].entries.length).toBe(2);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("fails fast when creating duplicate entry IDs", () => {
    const entry = createMemoryEntry({ id: "dup-1", type: "episodic", content: "Event 1" });
    store.createMemory(entry);
    expect(() => store.createMemory(entry)).toThrow(MemoryValidationError);
  });
});
