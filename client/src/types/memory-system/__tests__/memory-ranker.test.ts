/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Milestone 2 Test Suite: Memory Ranker (`memory-ranker.test.ts`)
 *
 * @file __tests__/memory-ranker.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  clampScore,
  calculateRecencyScore,
  calculateFrequencyScore,
  calculateCompositeScore,
  rankMemoryResults,
  createMemoryEntry,
  DEFAULT_DECAY_LAMBDA,
  MemoryValidationError,
} from "../index";

describe("Phase 9.6 Milestone 2 — Memory Ranker Engine", () => {
  describe("clampScore", () => {
    it("clamps numbers cleanly to bounds [0.0, 1.0]", () => {
      expect(clampScore(-0.5)).toBe(0.0);
      expect(clampScore(1.5)).toBe(1.0);
      expect(clampScore(0.75)).toBe(0.75);
      expect(clampScore(NaN)).toBe(0.0);
    });
  });

  describe("calculateRecencyScore", () => {
    it("evaluates deterministic exponential recency decay", () => {
      const now = 1_000_000_000;
      const recentScore = calculateRecencyScore(now, now, DEFAULT_DECAY_LAMBDA);
      expect(recentScore).toBe(1.0); // Delta 0 => e^0 = 1.0

      const oneDayMs = 86_400_000;
      const olderScore = calculateRecencyScore(now - oneDayMs, now, DEFAULT_DECAY_LAMBDA);
      expect(olderScore).toBeLessThan(1.0);
      expect(olderScore).toBeGreaterThan(0.0);
    });

    it("throws MemoryValidationError for negative lambda or NaN inputs", () => {
      expect(() => calculateRecencyScore(100, 200, -0.01)).toThrow(MemoryValidationError);
    });
  });

  describe("calculateFrequencyScore", () => {
    it("evaluates logarithmic access frequency score normalized to [0, 1]", () => {
      expect(calculateFrequencyScore(0, 100)).toBe(0.0);
      const lowAccess = calculateFrequencyScore(5, 100);
      const highAccess = calculateFrequencyScore(50, 100);

      expect(lowAccess).toBeGreaterThan(0.0);
      expect(highAccess).toBeGreaterThan(lowAccess);
      expect(calculateFrequencyScore(100, 100)).toBe(1.0);
      expect(calculateFrequencyScore(200, 100)).toBe(1.0); // Clamped at 1.0
    });
  });

  describe("calculateCompositeScore", () => {
    it("computes deterministic weighted composite score", () => {
      const now = 1_700_000_000_000;
      const score = calculateCompositeScore({
        relevanceScore: 0.8,
        lastAccessedAtMs: now,
        accessCount: 10,
        importanceScore: 0.7,
        confidenceScore: 0.9,
        currentMs: now,
      });

      expect(score.relevance).toBe(0.8);
      expect(score.recency).toBe(1.0);
      expect(score.importance).toBe(0.7);
      expect(score.confidence).toBe(0.9);
      expect(score.finalScore).toBeGreaterThan(0.0);
      expect(score.finalScore).toBeLessThanOrEqual(1.0);
      expect(Object.isFrozen(score)).toBe(true);
    });

    it("throws when custom weights do not sum to 1.0", () => {
      expect(() =>
        calculateCompositeScore({
          relevanceScore: 0.5,
          lastAccessedAtMs: Date.now(),
          accessCount: 1,
          importanceScore: 0.5,
          confidenceScore: 1.0,
          weights: { relevance: 0.5, recency: 0.5, frequency: 0.5, importance: 0.5 },
        })
      ).toThrow(MemoryValidationError);
    });
  });

  describe("rankMemoryResults", () => {
    it("ranks candidates in descending order of finalScore", () => {
      const now = 1_700_000_000_000;
      const entry1 = createMemoryEntry({
        id: "e-high",
        type: "long_term",
        content: "High relevance entry",
        metadata: { id: "e-high", lastAccessedAt: now, importanceScore: 0.9 },
      });

      const entry2 = createMemoryEntry({
        id: "e-low",
        type: "short_term",
        content: "Low relevance entry",
        metadata: { id: "e-low", lastAccessedAt: now - 100_000_000, importanceScore: 0.2 },
      });

      const ranked = rankMemoryResults(
        [
          { entry: entry2, relevanceScore: 0.2 },
          { entry: entry1, relevanceScore: 0.95 },
        ],
        { currentMs: now }
      );

      expect(ranked.length).toBe(2);
      expect(ranked[0].entry.id).toBe("e-high");
      expect(ranked[1].entry.id).toBe("e-low");
      expect(ranked[0].score.finalScore).toBeGreaterThan(ranked[1].score.finalScore);
      expect(Object.isFrozen(ranked)).toBe(true);
    });

    it("filters out results below minScoreThreshold", () => {
      const now = Date.now();
      const entry = createMemoryEntry({
        id: "e-threshold",
        type: "episodic",
        content: "Threshold test content",
      });

      const ranked = rankMemoryResults([{ entry, relevanceScore: 0.1 }], {
        currentMs: now,
        minScoreThreshold: 0.8,
      });

      expect(ranked.length).toBe(0);
    });
  });
});
