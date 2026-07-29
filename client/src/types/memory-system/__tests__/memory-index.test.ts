/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 3 Test Suite: Memory Index (`memory-index.test.ts`)
 *
 * @file __tests__/memory-index.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryIndex, createMemoryEntry } from "../index";

describe("Phase 9.6 Milestone 3 — Memory Index Engine", () => {
  let index: MemoryIndex;

  beforeEach(() => {
    index = new MemoryIndex();
  });

  it("indexes entries and queries by MemoryType, tags, and score thresholds", () => {
    const entry1 = createMemoryEntry({
      id: "idx-1",
      type: "semantic",
      content: "Semantic entry about physics",
      metadata: { id: "idx-1", importanceScore: 0.9, tags: ["science", "physics"] },
    });

    const entry2 = createMemoryEntry({
      id: "idx-2",
      type: "short_term",
      content: "Short term context",
      metadata: { id: "idx-2", importanceScore: 0.3, tags: ["context"] },
    });

    index.buildMemoryIndex([entry1, entry2]);

    const semResults = index.queryMemoryIndex({ types: ["semantic"] });
    expect(semResults.length).toBe(1);
    expect(semResults[0].id).toBe("idx-1");

    const tagResults = index.queryMemoryIndex({ tags: ["science"] });
    expect(tagResults.length).toBe(1);
    expect(tagResults[0].id).toBe("idx-1");

    const highImpResults = index.queryMemoryIndex({ minImportance: 0.8 });
    expect(highImpResults.length).toBe(1);
    expect(highImpResults[0].id).toBe("idx-1");
  });

  it("updates and removes entries from the index cleanly", () => {
    const entry = createMemoryEntry({
      id: "idx-upd",
      type: "working",
      content: "Working state",
      metadata: { id: "idx-upd", tags: ["temp"] },
    });

    index.updateMemoryIndex(entry);
    expect(index.queryMemoryIndex({ tags: ["temp"] }).length).toBe(1);

    index.removeFromIndex("idx-upd");
    expect(index.queryMemoryIndex({ tags: ["temp"] }).length).toBe(0);
  });
});
