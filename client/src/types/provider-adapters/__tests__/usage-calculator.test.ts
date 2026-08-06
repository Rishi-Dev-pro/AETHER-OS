/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Usage Calculator (`usage-calculator.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { calculateUsage, aggregateUsage } from "../usage-calculator";
import { UsageCalculationError } from "../translation-errors";

describe("Phase 9.10 Usage Calculator Unit Tests", () => {
  it("should calculate token counts and estimated cost correctly", () => {
    const stats = calculateUsage(1000, 500, 0.0015, 0.002);

    expect(stats.promptTokens).toBe(1000);
    expect(stats.completionTokens).toBe(500);
    expect(stats.totalTokens).toBe(1500);
    expect(stats.estimatedCostUsd).toBe(0.0025); // (1*0.0015) + (0.5*0.002) = 0.0025
    expect(Object.isFrozen(stats)).toBe(true);
  });

  it("should aggregate multiple usage statistics objects deterministically", () => {
    const usage1 = calculateUsage(500, 200, 0.001, 0.002);
    const usage2 = calculateUsage(300, 100, 0.001, 0.002);

    const agg = aggregateUsage([usage1, usage2]);

    expect(agg.promptTokens).toBe(800);
    expect(agg.completionTokens).toBe(300);
    expect(agg.totalTokens).toBe(1100);
    expect(Object.isFrozen(agg)).toBe(true);
  });

  it("should throw UsageCalculationError on negative prompt or completion tokens", () => {
    expect(() => calculateUsage(-10, 100)).toThrow(UsageCalculationError);
    expect(() => calculateUsage(100, -5)).toThrow(UsageCalculationError);
  });
});
