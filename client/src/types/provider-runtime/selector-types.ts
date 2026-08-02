/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Selector Types (`selector-types.ts`)
 *
 * @file selector-types.ts
 * @description Strongly-typed domain interfaces for provider selection parameters,
 * evaluation scores, candidate rankings, and selection reports.
 *
 * @module @aether/provider-runtime/selector-types
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderSelectionPolicy } from "./enums";
import type { ProviderEntry } from "./registry-types";

/**
 * Rejection audit detail for candidate provider evaluation.
 */
export interface ProviderRejectionDetail {
  readonly providerId: string;
  readonly reason: string;
}

/**
 * Calculated scoring components for a provider candidate.
 */
export interface ProviderCandidateScore {
  readonly providerId: string;
  readonly healthScore: number;
  readonly capabilityScore: number;
  readonly latencyScore: number;
  readonly costScore: number;
  readonly priorityScore: number;
  readonly finalWeightedScore: number;
}

/**
 * Comprehensive, deeply immutable audit report for a provider selection operation.
 */
export interface ProviderSelectionReport {
  readonly selectionId: string;
  readonly timestampMs: number;
  readonly appliedPolicy: ProviderSelectionPolicy;
  readonly selectedProviderId?: string;
  readonly candidateCount: number;
  readonly rejectedCount: number;
  readonly candidateScores: readonly Readonly<ProviderCandidateScore>[];
  readonly rejectedProviders: readonly Readonly<ProviderRejectionDetail>[];
}

/**
 * Final output payload of a provider selection query.
 */
export interface ProviderSelectionResult {
  readonly selectedProvider: Readonly<ProviderEntry>;
  readonly candidateProviders: readonly Readonly<ProviderEntry>[];
  readonly rejectedProviders: readonly Readonly<ProviderRejectionDetail>[];
  readonly appliedPolicy: ProviderSelectionPolicy;
  readonly calculatedScores: Readonly<Record<string, number>>;
  readonly selectionReport: Readonly<ProviderSelectionReport>;
}

/**
 * Policy weights configuration for WEIGHTED_SCORE selection policy.
 */
export interface SelectionPolicyWeights {
  readonly healthWeight: number;
  readonly capabilityWeight: number;
  readonly latencyWeight: number;
  readonly costWeight: number;
  readonly priorityWeight: number;
}
