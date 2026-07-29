/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 1 Test Suite: Immutable Contracts & Factories (`types.test.ts`)
 *
 * @file __tests__/types.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  createMemoryMetadata,
  createMemoryEntry,
  createMemoryQuery,
  createMemoryScore,
  createMemorySearchResult,
  createMemoryCollection,
  createMemorySnapshot,
  MEMORY_TYPES,
  MemoryValidationError,
} from "../index";

describe("Phase 9.6 Milestone 1 — Memory Contracts & Factories", () => {
  describe("MemoryMetadata Factory", () => {
    it("creates a canonical, deep-frozen MemoryMetadata object", () => {
      const metadata = createMemoryMetadata({
        id: "meta-1",
        importanceScore: 0.8,
        confidenceScore: 0.95,
        tags: ["user", "preference"],
        customMetadata: { key: "val" },
      });

      expect(metadata.id).toBe("meta-1");
      expect(metadata.importanceScore).toBe(0.8);
      expect(metadata.confidenceScore).toBe(0.95);
      expect(metadata.tags).toEqual(["user", "preference"]);
      expect(metadata.customMetadata).toEqual({ key: "val" });
      expect(Object.isFrozen(metadata)).toBe(true);
      expect(Object.isFrozen(metadata.tags)).toBe(true);
      expect(Object.isFrozen(metadata.customMetadata)).toBe(true);
    });

    it("throws MemoryValidationError for empty ID", () => {
      expect(() => createMemoryMetadata({ id: "" })).toThrow(MemoryValidationError);
      expect(() => createMemoryMetadata({ id: "   " })).toThrow(MemoryValidationError);
    });

    it("throws MemoryValidationError for out-of-bounds importance or confidence score", () => {
      expect(() => createMemoryMetadata({ id: "m1", importanceScore: -0.1 })).toThrow(MemoryValidationError);
      expect(() => createMemoryMetadata({ id: "m1", importanceScore: 1.1 })).toThrow(MemoryValidationError);
      expect(() => createMemoryMetadata({ id: "m1", confidenceScore: 1.5 })).toThrow(MemoryValidationError);
    });

    it("throws MemoryValidationError for invalid access count or timestamp", () => {
      expect(() => createMemoryMetadata({ id: "m1", accessCount: -1 })).toThrow(MemoryValidationError);
      expect(() => createMemoryMetadata({ id: "m1", accessCount: 1.5 })).toThrow(MemoryValidationError);
      expect(() => createMemoryMetadata({ id: "m1", createdAt: -100 })).toThrow(MemoryValidationError);
    });

    it("prevents mutation at runtime", () => {
      const metadata = createMemoryMetadata({ id: "m1" });
      expect(() => {
        (metadata as any).importanceScore = 0.9;
      }).toThrow();
      expect(() => {
        (metadata.tags as any).push("new-tag");
      }).toThrow();
    });
  });

  describe("MemoryEntry Factory", () => {
    it("creates an immutable MemoryEntry across all memory types", () => {
      for (const memType of MEMORY_TYPES) {
        const entry = createMemoryEntry({
          id: `entry-${memType}`,
          type: memType,
          content: `Test content for ${memType}`,
          embedding: [0.1, 0.2, 0.3],
        });

        expect(entry.id).toBe(`entry-${memType}`);
        expect(entry.type).toBe(memType);
        expect(entry.content).toBe(`Test content for ${memType}`);
        expect(entry.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(Object.isFrozen(entry)).toBe(true);
        expect(Object.isFrozen(entry.embedding)).toBe(true);
        expect(Object.isFrozen(entry.metadata)).toBe(true);
      }
    });

    it("fails fast on invalid MemoryType or empty content", () => {
      expect(() =>
        createMemoryEntry({
          id: "e1",
          type: "invalid_type" as any,
          content: "Valid content",
        })
      ).toThrow(MemoryValidationError);

      expect(() =>
        createMemoryEntry({
          id: "e1",
          type: "working",
          content: "   ",
        })
      ).toThrow(MemoryValidationError);
    });

    it("fails fast on invalid embedding arrays", () => {
      expect(() =>
        createMemoryEntry({
          id: "e1",
          type: "episodic",
          content: "Valid content",
          embedding: [0.1, NaN, 0.3],
        })
      ).toThrow(MemoryValidationError);
    });
  });

  describe("MemoryQuery Factory", () => {
    it("constructs an immutable MemoryQuery with default limit", () => {
      const query = createMemoryQuery({
        textQuery: "Find user preferences",
        minImportance: 0.5,
      });

      expect(query.textQuery).toBe("Find user preferences");
      expect(query.limit).toBe(10);
      expect(query.minImportance).toBe(0.5);
      expect(Object.isFrozen(query)).toBe(true);
    });

    it("validates timeRange invariants", () => {
      expect(() =>
        createMemoryQuery({
          timeRange: { startMs: 1000, endMs: 500 },
        })
      ).toThrow(MemoryValidationError);
    });

    it("validates targetTypes", () => {
      expect(() =>
        createMemoryQuery({
          targetTypes: ["working", "unknown_type" as any],
        })
      ).toThrow(MemoryValidationError);
    });
  });

  describe("MemoryScore & MemorySearchResult Factories", () => {
    it("creates deep-frozen score and search result objects", () => {
      const score = createMemoryScore({
        relevance: 0.9,
        recency: 0.8,
        frequency: 0.7,
        importance: 0.85,
        confidence: 0.95,
        finalScore: 0.84,
      });

      const entry = createMemoryEntry({
        id: "entry-search",
        type: "long_term",
        content: "Search result content",
      });

      const result = createMemorySearchResult({ entry, score });

      expect(result.entry.id).toBe("entry-search");
      expect(result.score.finalScore).toBe(0.84);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.score)).toBe(true);
    });
  });

  describe("MemoryCollection & MemorySnapshot Factories", () => {
    it("creates valid immutable MemoryCollection and MemorySnapshot structures", () => {
      const collection = createMemoryCollection({
        name: "UserFacts",
        entries: [
          {
            id: "fact-1",
            type: "semantic",
            content: "User prefers dark mode",
          },
        ],
      });

      expect(collection.name).toBe("UserFacts");
      expect(collection.totalCount).toBe(1);
      expect(Object.isFrozen(collection)).toBe(true);

      const snapshot = createMemorySnapshot({
        snapshotId: "snap-100",
        collections: [collection],
      });

      expect(snapshot.snapshotId).toBe("snap-100");
      expect(snapshot.collections.length).toBe(1);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });
});
