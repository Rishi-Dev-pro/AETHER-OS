/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: Usage Calculator (`usage-calculator.ts`)
 *
 * @file usage-calculator.ts
 * @description Deterministic token accounting and cost calculation engine for provider adapter executions.
 * Provides usage computation and aggregation across multi-turn interactions.
 *
 * @module @aether/provider-adapters/usage-calculator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type { ProviderUsageStatistics } from "./adapter-types";
import { UsageCalculationError } from "./translation-errors";
import { createUsageStatistics } from "./factories";

/**
 * Calculates a single usage statistics object from prompt and completion token counts.
 *
 * @param promptTokens Number of input prompt tokens.
 * @param completionTokens Number of generated completion tokens.
 * @param costPer1kPromptUsd Optional USD cost per 1,000 prompt tokens.
 * @param costPer1kCompletionUsd Optional USD cost per 1,000 completion tokens.
 * @returns Deeply frozen ProviderUsageStatistics instance.
 * @throws UsageCalculationError on negative or invalid token values.
 */
export function calculateUsage(
  promptTokens: number,
  completionTokens: number,
  costPer1kPromptUsd?: number,
  costPer1kCompletionUsd?: number
): Readonly<ProviderUsageStatistics> {
  if (typeof promptTokens !== "number" || isNaN(promptTokens) || promptTokens < 0) {
    throw new UsageCalculationError("promptTokens must be a non-negative number.");
  }
  if (typeof completionTokens !== "number" || isNaN(completionTokens) || completionTokens < 0) {
    throw new UsageCalculationError("completionTokens must be a non-negative number.");
  }

  const prompt = Math.floor(promptTokens);
  const completion = Math.floor(completionTokens);
  const total = prompt + completion;

  let estimatedCostUsd: number | undefined;

  if (costPer1kPromptUsd !== undefined || costPer1kCompletionUsd !== undefined) {
    const promptRate = costPer1kPromptUsd ?? 0;
    const completionRate = costPer1kCompletionUsd ?? 0;

    if (promptRate < 0 || completionRate < 0) {
      throw new UsageCalculationError("Cost per 1k token rates cannot be negative.");
    }

    const promptCost = (prompt / 1000) * promptRate;
    const completionCost = (completion / 1000) * completionRate;
    estimatedCostUsd = Number((promptCost + completionCost).toFixed(6));
  }

  return createUsageStatistics({
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total,
    estimatedCostUsd,
  });
}

/**
 * Aggregates a list of ProviderUsageStatistics instances into a single summary usage object.
 *
 * @param statsList Array of usage statistics objects to sum.
 * @returns Deeply frozen aggregated ProviderUsageStatistics.
 * @throws UsageCalculationError if input array is invalid.
 */
export function aggregateUsage(
  statsList: ReadonlyArray<ProviderUsageStatistics>
): Readonly<ProviderUsageStatistics> {
  if (!Array.isArray(statsList)) {
    throw new UsageCalculationError("statsList must be an array of ProviderUsageStatistics.");
  }

  let totalPrompt = 0;
  let totalCompletion = 0;
  let totalCost: number | undefined;

  for (const item of statsList) {
    if (!item) continue;
    totalPrompt += item.promptTokens ?? 0;
    totalCompletion += item.completionTokens ?? 0;

    if (item.estimatedCostUsd !== undefined) {
      totalCost = (totalCost ?? 0) + item.estimatedCostUsd;
    }
  }

  return createUsageStatistics({
    promptTokens: totalPrompt,
    completionTokens: totalCompletion,
    totalTokens: totalPrompt + totalCompletion,
    estimatedCostUsd: totalCost !== undefined ? Number(totalCost.toFixed(6)) : undefined,
  });
}
