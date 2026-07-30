/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 7 Test Suite: Memory Manager & Lifecycle (`memory-manager.test.ts`)
 *
 * @file memory-manager.test.ts
 * @description Comprehensive unit tests for MemoryManager lifecycle orchestration, reinforcement,
 * archival/restoration, expiration, deletion, snapshot export/import, immutability, and validation.
 *
 * @module @aether/memory-system/__tests__/memory-manager.test
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryManager } from "../memory-manager";
import { MemoryStore } from "../memory-store";
import { MemoryIndex } from "../memory-index";
import { MemoryRetriever } from "../memory-retriever";
import { createMemoryEntry, createMemoryQuery } from "../types";
import { MemoryValidationError, MemoryNotFoundError } from "../errors";

describe("MemoryManager Lifecycle Orchestration", () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  describe("1. Create & Basic Retrieval Lifecycle", () => {
    it("should successfully create and retrieve a memory entry", () => {
      const entry = manager.createMemory({
        id: "mem-1",
        type: "long_term",
        content: "User prefers dark mode UI and high contrast.",
        metadata: {
          id: "mem-1",
          importanceScore: 0.8,
          confidenceScore: 0.9,
          tags: ["ui", "preference"],
        },
      });

      expect(entry.id).toBe("mem-1");
      expect(entry.type).toBe("long_term");
      expect(entry.content).toBe("User prefers dark mode UI and high contrast.");
      expect(entry.metadata.importanceScore).toBe(0.8);
      expect(Object.isFrozen(entry)).toBe(true);

      const retrieved = manager.getMemory("mem-1");
      expect(retrieved.id).toBe("mem-1");
      expect(retrieved.metadata.accessCount).toBe(1);
    });

    it("should retrieve memory by ID via retrieveMemoryById", () => {
      manager.createMemory({
        id: "mem-2",
        type: "semantic",
        content: "Quantum computing operates on qubits.",
      });

      const searchResult = manager.retrieveMemoryById("mem-2");
      expect(searchResult.entry.id).toBe("mem-2");
      expect(searchResult.score.finalScore).toBeGreaterThan(0);
      expect(Object.isFrozen(searchResult)).toBe(true);
    });

    it("should query memories using retrieveMemory pipeline", () => {
      manager.createMemory({
        id: "mem-3a",
        type: "working",
        content: "Temporary session state data.",
        metadata: { id: "mem-3a", tags: ["session"] },
      });
      manager.createMemory({
        id: "mem-3b",
        type: "episodic",
        content: "User clicked export button at 10:00 AM.",
        metadata: { id: "mem-3b", tags: ["event"] },
      });

      const query = createMemoryQuery({ textQuery: "session", limit: 5 });
      const results = manager.retrieveMemory(query);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.id).toBe("mem-3a");
      expect(Object.isFrozen(results)).toBe(true);
    });
  });

  describe("2. Memory Reinforcement", () => {
    it("should deterministically reinforce memory access count and importance score", () => {
      manager.createMemory({
        id: "mem-reinforce",
        type: "long_term",
        content: "Critical user architectural preference.",
        metadata: {
          id: "mem-reinforce",
          importanceScore: 0.5,
          accessCount: 0,
        },
      });

      const reinforced = manager.reinforceMemory("mem-reinforce", { importanceDelta: 0.1 });

      expect(reinforced.metadata.accessCount).toBe(1);
      expect(reinforced.metadata.importanceScore).toBe(0.6);
      expect(Object.isFrozen(reinforced)).toBe(true);

      const retrieved = manager.getMemory("mem-reinforce");
      expect(retrieved.metadata.importanceScore).toBe(0.6);
    });

    it("should clamp importance score reinforcement to upper limit 1.0", () => {
      manager.createMemory({
        id: "mem-clamp",
        type: "semantic",
        content: "High importance fact.",
        metadata: { id: "mem-clamp", importanceScore: 0.95 },
      });

      const reinforced = manager.reinforceMemory("mem-clamp", { importanceDelta: 0.2 });
      expect(reinforced.metadata.importanceScore).toBe(1.0);
    });
  });

  describe("3. Archive & Restore State Transitions", () => {
    it("should archive memory entry and exclude it from standard retrieval", () => {
      manager.createMemory({
        id: "mem-arch",
        type: "episodic",
        content: "Old conversation logs from previous session.",
        metadata: { id: "mem-arch", tags: ["logs"] },
      });

      const archived = manager.archiveMemory("mem-arch");
      expect(archived.metadata.tags).toContain("archived");
      expect(archived.metadata.customMetadata.isArchived).toBe(true);

      // Standard retrieval should exclude archived memory
      const query = createMemoryQuery({ limit: 10 });
      const standardResults = manager.retrieveMemory(query);
      expect(standardResults.some((r) => r.entry.id === "mem-arch")).toBe(false);

      // Retrieval with includeArchived should return it
      const archivedResults = manager.retrieveMemory(query, { includeArchived: true });
      expect(archivedResults.some((r) => r.entry.id === "mem-arch")).toBe(true);
    });

    it("should restore archived memory entry to active state", () => {
      manager.createMemory({
        id: "mem-restore",
        type: "long_term",
        content: "Temporarily archived setting.",
      });

      manager.archiveMemory("mem-restore");
      const restored = manager.restoreMemory("mem-restore");

      expect(restored.metadata.tags).not.toContain("archived");
      expect(restored.metadata.customMetadata.isArchived).toBe(false);

      const query = createMemoryQuery({ limit: 10 });
      const standardResults = manager.retrieveMemory(query);
      expect(standardResults.some((r) => r.entry.id === "mem-restore")).toBe(true);
    });
  });

  describe("4. Expiration Lifecycle", () => {
    it("should mark memory as expired and prevent standard retrieval while preserving record in store", () => {
      manager.createMemory({
        id: "mem-exp",
        type: "short_term",
        content: "Temporary OTP code or auth cache.",
      });

      const expired = manager.expireMemory("mem-exp");
      expect(expired.metadata.tags).toContain("expired");
      expect(expired.metadata.customMetadata.isExpired).toBe(true);

      // Memory is still accessible by direct getMemory lookup
      const storedDirect = manager.getMemory("mem-exp");
      expect(storedDirect.id).toBe("mem-exp");

      // Standard retrieval excludes expired entries
      const query = createMemoryQuery({ limit: 10 });
      const standardResults = manager.retrieveMemory(query);
      expect(standardResults.some((r) => r.entry.id === "mem-exp")).toBe(false);

      // Explicit query with includeExpired returns it
      const expiredResults = manager.retrieveMemory(query, { includeExpired: true });
      expect(expiredResults.some((r) => r.entry.id === "mem-exp")).toBe(true);
    });
  });

  describe("5. Deletion Lifecycle", () => {
    it("should permanently delete memory from store and index", () => {
      manager.createMemory({
        id: "mem-del",
        type: "working",
        content: "Scratchpad note.",
      });

      const deleted = manager.deleteMemory("mem-del");
      expect(deleted).toBe(true);

      expect(() => manager.getMemory("mem-del")).toThrow(MemoryNotFoundError);

      const query = createMemoryQuery({ limit: 10 });
      const results = manager.retrieveMemory(query, { includeArchived: true, includeExpired: true });
      expect(results.some((r) => r.entry.id === "mem-del")).toBe(false);
    });
  });

  describe("6. Snapshot Management (Export & Import)", () => {
    it("should export a deep-frozen snapshot of current memory manager state", () => {
      manager.createMemory({
        id: "mem-snap-1",
        type: "long_term",
        content: "Snapshot item 1",
      });
      manager.createMemory({
        id: "mem-snap-2",
        type: "semantic",
        content: "Snapshot item 2",
      });

      const snapshot = manager.exportSnapshot("snap-100", { exportedBy: "test-suite" });
      expect(snapshot.snapshotId).toBe("snap-100");
      expect(snapshot.metadata.exportedBy).toBe("test-suite");
      expect(snapshot.collections.length).toBe(1);
      expect(snapshot.collections[0].totalCount).toBe(2);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("should import snapshot, populate store, and rebuild index", () => {
      manager.createMemory({
        id: "old-mem",
        type: "working",
        content: "Pre-import memory",
      });

      const snapshotToImport = manager.exportSnapshot("snap-source");

      const newManager = new MemoryManager();
      const imported = newManager.importSnapshot(snapshotToImport, { clearExisting: true });

      expect(imported.length).toBe(1);
      expect(imported[0].id).toBe("old-mem");

      const query = createMemoryQuery({ limit: 10 });
      const results = newManager.retrieveMemory(query);
      expect(results.some((r) => r.entry.id === "old-mem")).toBe(true);
    });
  });

  describe("7. Validation & Error Handling", () => {
    it("should throw MemoryValidationError on empty string IDs", () => {
      expect(() => manager.getMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.updateMemory("   ", { content: "abc" })).toThrow(MemoryValidationError);
      expect(() => manager.reinforceMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.archiveMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.restoreMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.expireMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.deleteMemory("")).toThrow(MemoryValidationError);
      expect(() => manager.exportSnapshot("")).toThrow(MemoryValidationError);
    });

    it("should throw MemoryNotFoundError when operating on non-existent memory ID", () => {
      expect(() => manager.getMemory("non-existent")).toThrow(MemoryNotFoundError);
      expect(() => manager.updateMemory("non-existent", { content: "new" })).toThrow(MemoryNotFoundError);
      expect(() => manager.reinforceMemory("non-existent")).toThrow(MemoryNotFoundError);
      expect(() => manager.archiveMemory("non-existent")).toThrow(MemoryNotFoundError);
      expect(() => manager.restoreMemory("non-existent")).toThrow(MemoryNotFoundError);
      expect(() => manager.expireMemory("non-existent")).toThrow(MemoryNotFoundError);
    });
  });

  describe("8. Dependency Injection & Orchestration Sync", () => {
    it("should sync index automatically when initialized with pre-populated store", () => {
      const store = new MemoryStore();
      store.createMemory({
        id: "pre-stored-1",
        type: "long_term",
        content: "Pre-stored memory item",
      });

      const index = new MemoryIndex();
      const retriever = new MemoryRetriever(store, index);

      const injectedManager = new MemoryManager({ store, index, retriever });
      const results = injectedManager.retrieveMemory(createMemoryQuery({ limit: 5 }));

      expect(results.length).toBe(1);
      expect(results[0].entry.id).toBe("pre-stored-1");
    });
  });
});
