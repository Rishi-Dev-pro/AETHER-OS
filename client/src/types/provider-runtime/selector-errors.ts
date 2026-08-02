/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Selector Exceptions (`selector-errors.ts`)
 *
 * @file selector-errors.ts
 * @description Strongly-typed exception classes for ProviderSelector failures.
 *
 * @module @aether/provider-runtime/selector-errors
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { ProviderSelectionError } from "./errors";

export {
  ProviderSelectionError,
  NoEligibleProviderError,
} from "./errors";

/**
 * Thrown when ranking or evaluating candidate providers fails.
 */
export class ProviderRankingError extends ProviderSelectionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_RANKING", metadata);
  }
}

/**
 * Thrown when calculating candidate provider scores fails.
 */
export class ProviderScoreError extends ProviderSelectionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_PROVIDER_SCORE", metadata);
  }
}

/**
 * Thrown when an unsupported or invalid SelectionPolicy is specified.
 */
export class InvalidSelectionPolicyError extends ProviderSelectionError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_INVALID_SELECTION_POLICY", metadata);
  }
}
