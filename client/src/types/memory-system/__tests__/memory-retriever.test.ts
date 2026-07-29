/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 3 Test Suite: Memory Retriever Pipeline (`memory-retriever.test.ts`)
 *
 * @file __tests__/memory-retriever.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryStore,
  MemoryIndex,
  MemoryRetriever,
  createMemoryQuery,
  MemoryNotFoundError,
} from "../index";

describe("Phase 9.6 Milestone 3 — Memory Retriever Pipeline", () => {
  let store: MemoryStore;
  let index: MemoryIndex;
  let retriever: MemoryRetriever;

  beforeEach(() => {
    store = new MemoryStore();
    index = new MemoryIndex();
    retriever = new MemoryRetriever(store, index);
  });

  it("executes complete candidate retrieval, composite scoring, and limit slicing pipeline", () => {
    const e1 = store.createMemory({
      id: "ret-1",
      type: "long_term",
      content: "User prefers dark mode UI interface",
      metadata: { id: "ret-1", importanceScore: 0.9, tags: ["preference", "ui"] },
    });

    const e2 = store.createMemory({
      id: "ret-2",
      type: "short_term",
      content: "User asked for weather report",
      metadata: { id: "ret-2", importanceScore: 0.4, tags: ["weather"] },
    });

    index.buildMemoryIndex([e1, e2]);

    const query = createMemoryQuery({
      textQuery: "dark mode interface",
      limit: 1,
    });

    const results = retriever.retrieveMemories(query);

    expect(results.length).toBe(1);
    expect(results[0].entry.id).toBe("ret-1");
    expect(results[0].score.finalScore).toBeGreaterThan(0.0);
    expect(Object.isFrozen(results)).toBe(true);
    expect(Object.isFrozen(results[0])).toBe(true);
  });

  it("retrieves memories by ID, tags, and types with convenience methods", () => {
    const e1 = store.createMemory({
      id: "ret-tag",
      type: "episodic",
      content: "Turn completed successfully",
      metadata: { id: "ret-tag", tags: ["turn", "system"] },
    });
    index.buildMemoryIndex([e1]);

    const byTag = retriever.retrieveByTags(["turn"]);
    expect(byTag.length).toBe(1);
    expect(byTag[0].entry.id).toBe("ret-tag");

    const byType = retriever.retrieveByType("episodic");
    expect(byType.length).toBe(1);
    expect(byType[0].entry.id).toBe("ret-tag");

    const byId = retriever.retrieveMemoryById("ret-tag");
    expect(byId.entry.id).toBe("ret-tag");
  });

  it("returns empty frozen array when no candidates match filters", () => {
    const query = createMemoryQuery({
      tags: ["non_existent_tag"],
      limit: 5,
    });

    const results = retriever.retrieveMemories(query);
    expect(results.length).toBe(0);
    expect(Object.isFrozen(results)).toBe(true);
  });

  it("throws MemoryNotFoundError when retrieving non-existent memory by ID", () => {
    expect(() => retriever.retrieveMemoryById("ghost-id")).toThrow(MemoryNotFoundError);
  });
});
