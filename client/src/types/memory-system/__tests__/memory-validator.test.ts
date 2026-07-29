/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 2 Test Suite: Memory Validator (`memory-validator.test.ts`)
 *
 * @file __tests__/memory-validator.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  validateMemoryMetadata,
  validateMemoryEntry,
  validateMemoryQuery,
  validateMemoryScore,
  validateMemoryCollection,
  validateMemorySnapshot,
  createMemoryMetadata,
  createMemoryEntry,
  createMemoryQuery,
  createMemoryScore,
  createMemoryCollection,
  createMemorySnapshot,
  MemoryValidationError,
  InvalidMemoryQueryError,
} from "../index";

describe("Phase 9.6 Milestone 2 — Memory Validator Engine", () => {
  describe("validateMemoryMetadata", () => {
    it("passes valid MemoryMetadata", () => {
      const meta = createMemoryMetadata({ id: "meta-1", importanceScore: 0.9 });
      expect(() => validateMemoryMetadata(meta)).not.toThrow();
    });

    it("throws MemoryValidationError for missing or invalid metadata fields", () => {
      expect(() => validateMemoryMetadata(null)).toThrow(MemoryValidationError);
      expect(() => validateMemoryMetadata({ id: "" })).toThrow(MemoryValidationError);
      expect(() => validateMemoryMetadata({ id: "m1", importanceScore: 1.5 })).toThrow(MemoryValidationError);
      expect(() => validateMemoryMetadata({ id: "m1", confidenceScore: -0.1 })).toThrow(MemoryValidationError);
      expect(() => validateMemoryMetadata({ id: "m1", accessCount: -5 })).toThrow(MemoryValidationError);
    });
  });

  describe("validateMemoryEntry", () => {
    it("passes valid MemoryEntry across memory types", () => {
      const entry = createMemoryEntry({
        id: "entry-val",
        type: "semantic",
        content: "Core entity factual relation",
      });
      expect(() => validateMemoryEntry(entry)).not.toThrow();
    });

    it("fails on empty content or invalid MemoryType", () => {
      expect(() =>
        validateMemoryEntry({
          id: "e1",
          type: "invalid_type",
          content: "Some content",
          metadata: createMemoryMetadata({ id: "m1" }),
        })
      ).toThrow(MemoryValidationError);

      expect(() =>
        validateMemoryEntry({
          id: "e1",
          type: "working",
          content: "",
          metadata: createMemoryMetadata({ id: "m1" }),
        })
      ).toThrow(MemoryValidationError);
    });
  });

  describe("validateMemoryQuery", () => {
    it("passes valid MemoryQuery objects", () => {
      const query = createMemoryQuery({
        textQuery: "find facts",
        limit: 5,
        targetTypes: ["semantic", "long_term"],
      });
      expect(() => validateMemoryQuery(query)).not.toThrow();
    });

    it("throws InvalidMemoryQueryError on invalid query parameters", () => {
      expect(() => validateMemoryQuery({ limit: -1 })).toThrow(InvalidMemoryQueryError);
      expect(() => validateMemoryQuery({ limit: 10, minImportance: 2.0 })).toThrow(InvalidMemoryQueryError);
      expect(() =>
        validateMemoryQuery({
          limit: 10,
          timeRange: { startMs: 5000, endMs: 1000 },
        })
      ).toThrow(InvalidMemoryQueryError);
    });
  });

  describe("validateMemoryScore", () => {
    it("passes valid MemoryScore objects", () => {
      const score = createMemoryScore({
        relevance: 0.9,
        recency: 0.8,
        frequency: 0.7,
        importance: 0.85,
        confidence: 1.0,
        finalScore: 0.86,
      });
      expect(() => validateMemoryScore(score)).not.toThrow();
    });

    it("throws MemoryValidationError for missing score properties or NaN values", () => {
      expect(() => validateMemoryScore({ relevance: 0.9, recency: NaN })).toThrow(MemoryValidationError);
    });
  });

  describe("validateMemoryCollection & validateMemorySnapshot", () => {
    it("validates collections and snapshots with strict length invariants", () => {
      const collection = createMemoryCollection({
        name: "TestCollection",
        entries: [
          {
            id: "e1",
            type: "episodic",
            content: "Turn snapshot event",
          },
        ],
      });
      expect(() => validateMemoryCollection(collection)).not.toThrow();

      const snapshot = createMemorySnapshot({
        snapshotId: "snap-v1",
        collections: [collection],
      });
      expect(() => validateMemorySnapshot(snapshot)).not.toThrow();
    });

    it("throws when collection totalCount mismatches entries length", () => {
      const invalidCol = {
        name: "Mismatched",
        entries: [],
        totalCount: 5,
      };
      expect(() => validateMemoryCollection(invalidCol)).toThrow(MemoryValidationError);
    });
  });
});
