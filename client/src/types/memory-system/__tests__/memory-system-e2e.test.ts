/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 6 End-to-End Validation & Performance Benchmark Suite (`memory-system-e2e.test.ts`)
 *
 * @file memory-system-e2e.test.ts
 * @description Complete end-to-end workflow validation and latency benchmarking verifying
 * memory creation, indexing, search retrieval, composite ranking, prompt context injection,
 * reinforcement, snapshot export/import, and post-restore state integrity.
 *
 * @module @aether/memory-system/__tests__/memory-system-e2e.test
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT — MILESTONE 6 FREEZE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryManager } from "../memory-manager";
import { MemoryStore } from "../memory-store";
import { MemoryIndex } from "../memory-index";
import { MemoryRetriever } from "../memory-retriever";
import { rankMemoryResults } from "../memory-ranker";
import { createMemoryQuery, createMemoryEntry } from "../types";
import {
  createOrGetConversation,
  beginTurn,
  appendAssistantMessage,
  completeTurn,
  prepareContext,
  resetConversationStore,
  bindMemoryManager,
} from "../../conversation-core";

describe("Phase 9.6 Memory System — End-to-End Validation & Performance Benchmarks", () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    resetConversationStore();
    memoryManager = new MemoryManager();
    bindMemoryManager(memoryManager);
  });

  describe("1. Complete End-to-End Workflow Verification", () => {
    it("should execute the full 10-step memory lifecycle deterministically", () => {
      const convId = "e2e-conv-100";
      createOrGetConversation(convId, "e2e-session");

      // Step 1: Conversation Turn Execution & Completion
      const { turn: t1 } = beginTurn(convId, "User prefers dark mode and high contrast accessibility theme.");
      appendAssistantMessage(convId, t1.turnId, "Preference saved for dark mode and high contrast.");
      completeTurn(convId, t1.turnId, { memoryManager });

      // Step 2: Automatic Memory Creation Verification
      const autoMemoryId = `mem_conv_${convId}`;
      const createdMemory = memoryManager.getMemory(autoMemoryId);
      expect(createdMemory).toBeDefined();
      expect(createdMemory.type).toBe("episodic");
      expect(createdMemory.content).toContain("dark mode");

      // Step 3: Storage & Index Verification
      const storeMemories = memoryManager.listMemories();
      expect(storeMemories.some((m) => m.id === autoMemoryId)).toBe(true);

      // Step 4 & 5: Retrieval & Composite Ranking Verification
      const query = createMemoryQuery({ textQuery: "dark mode theme", limit: 5 });
      const searchResults = memoryManager.retrieveMemory(query);
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].entry.id).toBe(autoMemoryId);
      expect(searchResults[0].score.finalScore).toBeGreaterThan(0);

      // Step 6: Prompt Context Injection Verification
      const contextSnapshot = prepareContext(convId, 2048, {
        memoryManager,
        textQuery: "dark mode theme",
      });
      const enhancedContext = contextSnapshot as any;
      expect(enhancedContext.retrievedMemories).toBeDefined();
      expect(enhancedContext.memoryContextBlock).toContain("dark mode");

      // Step 7: Memory Reinforcement Verification
      const reinforcedMemory = memoryManager.getMemory(autoMemoryId);
      expect(reinforcedMemory.metadata.accessCount).toBeGreaterThan(1);

      // Step 8: Snapshot Export Verification
      const snapshot = memoryManager.exportSnapshot("e2e-snapshot-001", { reason: "validation" });
      expect(snapshot.snapshotId).toBe("e2e-snapshot-001");
      expect(snapshot.collections[0].entries.length).toBeGreaterThan(0);
      expect(Object.isFrozen(snapshot)).toBe(true);

      // Step 9: Snapshot Import Verification into New Instance
      const newMemoryManager = new MemoryManager();
      const importedEntries = newMemoryManager.importSnapshot(snapshot, { clearExisting: true });
      expect(importedEntries.length).toBe(snapshot.collections[0].entries.length);

      // Step 10: Retrieval After Restore Verification
      const postRestoreResults = newMemoryManager.retrieveMemory(query);
      expect(postRestoreResults.length).toBeGreaterThan(0);
      expect(postRestoreResults[0].entry.id).toBe(autoMemoryId);
    });
  });

  describe("2. Subsystem Performance Latency Benchmarks", () => {
    it("should meet high-performance latency benchmarks for core memory operations", () => {
      // Benchmark 1: Memory Creation Latency
      const startCreate = performance.now();
      for (let i = 0; i < 50; i++) {
        memoryManager.createMemory({
          id: `bench-mem-${i}`,
          type: "semantic",
          content: `Benchmark memory content text block item ${i}`,
          metadata: { id: `bench-mem-${i}`, tags: [`tag_${i % 5}`] },
        });
      }
      const durationCreateMs = performance.now() - startCreate;
      const avgCreateMs = durationCreateMs / 50;
      expect(avgCreateMs).toBeLessThan(5.0); // < 5ms per creation

      // Benchmark 2: Retrieval & Composite Ranking Latency
      const startRetrieve = performance.now();
      const query = createMemoryQuery({ textQuery: "Benchmark memory content", limit: 10 });
      for (let i = 0; i < 20; i++) {
        memoryManager.retrieveMemory(query);
      }
      const durationRetrieveMs = performance.now() - startRetrieve;
      const avgRetrieveMs = durationRetrieveMs / 20;
      expect(avgRetrieveMs).toBeLessThan(10.0); // < 10ms per retrieval

      // Benchmark 3: Snapshot Export Latency
      const startExport = performance.now();
      const snapshot = memoryManager.exportSnapshot("bench-snap");
      const exportMs = performance.now() - startExport;
      expect(exportMs).toBeLessThan(20.0); // < 20ms export time

      // Benchmark 4: Snapshot Import & Index Rebuild Latency
      const freshManager = new MemoryManager();
      const startImport = performance.now();
      freshManager.importSnapshot(snapshot);
      const importMs = performance.now() - startImport;
      expect(importMs).toBeLessThan(30.0); // < 30ms import & rebuild time
    });
  });

  describe("3. Immutability & Safety Invariant Audits", () => {
    it("should guarantee complete deep immutability across all exported records", () => {
      const entry = memoryManager.createMemory({
        id: "audit-1",
        type: "long_term",
        content: "Audit memory test",
      });

      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.metadata)).toBe(true);
      expect(Object.isFrozen(entry.metadata.tags)).toBe(true);

      const results = memoryManager.retrieveMemory(createMemoryQuery({ limit: 5 }));
      expect(Object.isFrozen(results)).toBe(true);
      if (results.length > 0) {
        expect(Object.isFrozen(results[0])).toBe(true);
        expect(Object.isFrozen(results[0].score)).toBe(true);
      }
    });
  });
});
