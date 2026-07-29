/**
 * AETHER OS — Phase 9.6 Persistent Cognitive Layer (Memory System)
 * Component 3: Memory Ranker (`memory-ranker.ts`)
 *
 * @file memory-ranker.ts
 * @description Provider-independent mathematical scoring and ranking engine evaluating
 * relevance, recency decay, frequency curve, static importance, and confidence scores.
 *
 * @module @aether/memory-system/memory-ranker
 * @version 1.0.0
 * @status APPROVED EDD COMPLIANT
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import {
  createMemoryScore,
  createMemorySearchResult,
  type MemoryEntry,
  type MemoryScore,
  type MemorySearchResult,
} from "./types";
import { validateMemoryEntry, validateMemoryScore } from "./memory-validator";
import { MemoryValidationError } from "./errors";

// ============================================================================
// CONFIGURATION CONTRACTS & DEFAULT CONSTANTS
// ============================================================================

/**
 * Weights configuring composite memory score calculation.
 * Sum of weights must equal 1.0.
 */
export interface MemoryScoringWeights {
  readonly relevance: number;
  readonly recency: number;
  readonly frequency: number;
  readonly importance: number;
}

/**
 * Default provider-independent scoring weights matching approved EDD pipeline.
 */
export const DEFAULT_SCORING_WEIGHTS: Readonly<MemoryScoringWeights> = Object.freeze({
  relevance: 0.4,
  recency: 0.3,
  frequency: 0.15,
  importance: 0.15,
});

/**
 * Exponential decay constant lambda (default 1 / (7 days in ms)).
 */
export const DEFAULT_DECAY_LAMBDA = 1.65e-9; // Approx half-life ~4.8 days

/**
 * Maximum reference access count used for logarithmic frequency normalization.
 */
export const DEFAULT_MAX_ACCESS_COUNT = 100;

// ============================================================================
// MATHEMATICAL SCORING FUNCTIONS
// ============================================================================

/**
 * Clamps a numeric score strictly within the normalized bounds [0.0, 1.0].
 */
export function clampScore(value: number): number {
  if (typeof value !== "number" || isNaN(value)) {
    return 0.0;
  }
  return Math.max(0.0, Math.min(1.0, value));
}

/**
 * Calculates exponential recency decay score.
 * Formula: S_recency = e^(-lambda * deltaMs)
 */
export function calculateRecencyScore(
  lastAccessedAtMs: number,
  currentMs: number = Date.now(),
  lambda: number = DEFAULT_DECAY_LAMBDA
): number {
  if (
    typeof lastAccessedAtMs !== "number" ||
    isNaN(lastAccessedAtMs) ||
    typeof currentMs !== "number" ||
    isNaN(currentMs) ||
    typeof lambda !== "number" ||
    isNaN(lambda) ||
    lambda < 0
  ) {
    throw new MemoryValidationError("Invalid inputs provided for recency score calculation.");
  }

  const deltaMs = Math.max(0, currentMs - lastAccessedAtMs);
  const decayScore = Math.exp(-lambda * deltaMs);
  return clampScore(decayScore);
}

/**
 * Calculates normalized frequency score using logarithmic scaling.
 * Formula: S_frequency = min(1.0, log(1 + accessCount) / log(1 + maxAccessCount))
 */
export function calculateFrequencyScore(
  accessCount: number,
  maxAccessCount: number = DEFAULT_MAX_ACCESS_COUNT
): number {
  if (
    typeof accessCount !== "number" ||
    isNaN(accessCount) ||
    accessCount < 0 ||
    typeof maxAccessCount !== "number" ||
    isNaN(maxAccessCount) ||
    maxAccessCount <= 0
  ) {
    throw new MemoryValidationError("Invalid access count parameters provided for frequency score.");
  }

  const score = Math.log(1 + accessCount) / Math.log(1 + maxAccessCount);
  return clampScore(score);
}

/**
 * Input parameters for calculating composite memory score.
 */
export interface CompositeScoreInput {
  readonly relevanceScore: number;
  readonly lastAccessedAtMs: number;
  readonly accessCount: number;
  readonly importanceScore: number;
  readonly confidenceScore: number;
  readonly currentMs?: number;
  readonly weights?: MemoryScoringWeights;
  readonly lambda?: number;
  readonly maxAccessCount?: number;
}

/**
 * Calculates complete composited MemoryScore structure.
 * Equation: Score = ((w_r * S_rel) + (w_t * S_rec) + (w_f * S_freq) + (w_i * S_imp)) * S_conf
 */
export function calculateCompositeScore(input: CompositeScoreInput): Readonly<MemoryScore> {
  const relevance = clampScore(input.relevanceScore);
  const importance = clampScore(input.importanceScore);
  const confidence = clampScore(input.confidenceScore);

  const currentMs = input.currentMs ?? Date.now();
  const recency = calculateRecencyScore(input.lastAccessedAtMs, currentMs, input.lambda);
  const frequency = calculateFrequencyScore(input.accessCount, input.maxAccessCount);

  const weights = input.weights ?? DEFAULT_SCORING_WEIGHTS;

  // Validate weights sum approximately to 1.0
  const weightSum = weights.relevance + weights.recency + weights.frequency + weights.importance;
  if (Math.abs(weightSum - 1.0) > 1e-4) {
    throw new MemoryValidationError(`Scoring weights must sum to 1.0. Received sum: ${weightSum}`);
  }

  const rawWeightedScore =
    weights.relevance * relevance +
    weights.recency * recency +
    weights.frequency * frequency +
    weights.importance * importance;

  const finalScore = clampScore(rawWeightedScore * confidence);

  const score = createMemoryScore({
    relevance,
    recency,
    frequency,
    importance,
    confidence,
    finalScore,
  });

  validateMemoryScore(score);
  return score;
}

/**
 * Ranks an array of MemoryEntry objects against relevance scores and query parameters.
 * Sorts search results descending by finalScore.
 */
export function rankMemoryResults(
  candidates: readonly { readonly entry: MemoryEntry; readonly relevanceScore: number }[],
  options?: {
    readonly currentMs?: number;
    readonly weights?: MemoryScoringWeights;
    readonly minScoreThreshold?: number;
  }
): readonly MemorySearchResult[] {
  if (!Array.isArray(candidates)) {
    throw new MemoryValidationError("rankMemoryResults candidate list must be an array.");
  }

  const currentMs = options?.currentMs ?? Date.now();
  const results: MemorySearchResult[] = [];

  for (const cand of candidates) {
    validateMemoryEntry(cand.entry);

    const score = calculateCompositeScore({
      relevanceScore: cand.relevanceScore,
      lastAccessedAtMs: cand.entry.metadata.lastAccessedAt,
      accessCount: cand.entry.metadata.accessCount,
      importanceScore: cand.entry.metadata.importanceScore,
      confidenceScore: cand.entry.metadata.confidenceScore,
      currentMs,
      weights: options?.weights,
    });

    if (options?.minScoreThreshold !== undefined && score.finalScore < options.minScoreThreshold) {
      continue;
    }

    results.push(
      createMemorySearchResult({
        entry: cand.entry,
        score,
      })
    );
  }

  // Sort descending by finalScore
  results.sort((a, b) => b.score.finalScore - a.score.finalScore);

  return deepFreeze(results);
}
