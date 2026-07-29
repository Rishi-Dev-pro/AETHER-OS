/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 6: Memory Retriever (`memory-retriever.ts`)
 *
 * @file memory-retriever.ts
 * @description Deterministic retrieval pipeline coordinating query validation, candidate selection,
 * metadata filtering, composite scoring, and limit slicing.
 *
 * @module @aether/memory-system/memory-retriever
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import {
  type MemoryEntry,
  type MemoryQuery,
  type MemorySearchResult,
  type MemoryType,
  createMemoryQuery,
} from "./types";
import { validateMemoryQuery } from "./memory-validator";
import { rankMemoryResults, type MemoryScoringWeights } from "./memory-ranker";
import { type IMemoryStore } from "./memory-store";
import { type IMemoryIndex } from "./memory-index";
import { MemoryNotFoundError } from "./errors";

/**
 * Interface contract for the MemoryRetriever pipeline.
 */
export interface IMemoryRetriever {
  retrieveMemories(query: MemoryQuery): readonly MemorySearchResult[];
  retrieveMemoryById(id: string): Readonly<MemorySearchResult>;
  retrieveByTags(tags: readonly string[], limit?: number): readonly MemorySearchResult[];
  retrieveByType(type: MemoryType, limit?: number): readonly MemorySearchResult[];
}

/**
 * Canonical retrieval pipeline implementation.
 */
export class MemoryRetriever implements IMemoryRetriever {
  constructor(
    private readonly store: IMemoryStore,
    private readonly index: IMemoryIndex
  ) {}

  /**
   * Complete deterministic retrieval pipeline.
   * Steps:
   * 1. Validate Query
   * 2. Candidate Selection (Index lookup)
   * 3. Metadata & Threshold Filtering
   * 4. Composite Scoring & Ranking (MemoryRanker)
   * 5. Apply Limit & Deep Freeze
   */
  public retrieveMemories(
    queryInput: MemoryQuery,
    options?: {
      readonly currentMs?: number;
      readonly weights?: MemoryScoringWeights;
    }
  ): readonly MemorySearchResult[] {
    validateMemoryQuery(queryInput);

    // Candidate Selection via Index
    const candidates = this.index.queryMemoryIndex({
      types: queryInput.targetTypes,
      tags: queryInput.tags,
      minImportance: queryInput.minImportance,
      minConfidence: queryInput.minConfidence,
      timeRange: queryInput.timeRange,
    });

    if (candidates.length === 0) {
      return deepFreeze([]);
    }

    // Evaluate relevance score per candidate (exact text query match simulation or baseline score)
    const scoredCandidates = candidates.map((entry) => {
      let relevanceScore = 1.0; // Baseline relevance

      if (queryInput.textQuery && queryInput.textQuery.trim() !== "") {
        const queryLower = queryInput.textQuery.toLowerCase();
        const contentLower = entry.content.toLowerCase();

        if (contentLower.includes(queryLower)) {
          relevanceScore = 1.0;
        } else {
          // Token overlap score
          const queryTokens = queryLower.split(/\s+/).filter(Boolean);
          const matchCount = queryTokens.filter((token) => contentLower.includes(token)).length;
          relevanceScore = queryTokens.length > 0 ? matchCount / queryTokens.length : 0.5;
        }
      }

      return {
        entry,
        relevanceScore,
      };
    });

    // Rank candidates using MemoryRanker composite engine
    const rankedResults = rankMemoryResults(scoredCandidates, {
      currentMs: options?.currentMs,
      weights: options?.weights,
    });

    // Apply limit constraint
    const sliced = rankedResults.slice(0, queryInput.limit);

    return deepFreeze(sliced);
  }

  /**
   * Retrieves a single MemoryEntry by ID with full composite score structure.
   */
  public retrieveMemoryById(id: string): Readonly<MemorySearchResult> {
    const entry = this.store.getMemory(id);
    if (!entry) {
      throw new MemoryNotFoundError(`Memory entry '${id}' not found during retrieval.`);
    }

    const query = createMemoryQuery({ limit: 1 });
    const results = this.retrieveMemories(query);
    const target = results.find((r) => r.entry.id === id);

    if (target) {
      return target;
    }

    // Fallback ranking for single item
    const ranked = rankMemoryResults([{ entry, relevanceScore: 1.0 }]);
    return ranked[0];
  }

  /**
   * Convenience helper retrieving memory entries by tags.
   */
  public retrieveByTags(tags: readonly string[], limit: number = 10): readonly MemorySearchResult[] {
    const query = createMemoryQuery({ tags, limit });
    return this.retrieveMemories(query);
  }

  /**
   * Convenience helper retrieving memory entries by MemoryType.
   */
  public retrieveByType(type: MemoryType, limit: number = 10): readonly MemorySearchResult[] {
    const query = createMemoryQuery({ targetTypes: [type], limit });
    return this.retrieveMemories(query);
  }
}
