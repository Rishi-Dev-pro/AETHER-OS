/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Milestone 2 Unit Tests: Context Normalizer (`context-normalizer.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { normalizePlanningContext, validatePlanningContext } from "../context-normalizer";
import { InvalidPlanningContextError, PlanningPolicyError } from "../errors";
import { createMemoryEntry } from "../../memory-system/types";

describe("Phase 9.7 — Context Normalizer (Milestone 2)", () => {
  it("should normalize empty raw input into a default deeply frozen PlanningContext", () => {
    const context = normalizePlanningContext();
    expect(context.contextId).toBeDefined();
    expect(context.timestampMs).toBeGreaterThan(0);
    expect(context.policy.minConfidenceThreshold).toBe(0.7);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.policy)).toBe(true);
  });

  it("should normalize valid raw input attributes", () => {
    const raw = {
      contextId: "  ctx_test_123  ",
      timestampMs: 1700000000000,
      policy: {
        minConfidenceThreshold: 0.85,
        defaultStepTimeoutMs: 15000,
      },
    };

    const context = normalizePlanningContext(raw);
    expect(context.contextId).toBe("ctx_test_123");
    expect(context.timestampMs).toBe(1700000000000);
    expect(context.policy.minConfidenceThreshold).toBe(0.85);
    expect(context.policy.defaultStepTimeoutMs).toBe(15000);
  });

  it("should deduplicate and sort retrieved memories deterministically by memory ID", () => {
    const mem1 = createMemoryEntry({ id: "mem_b", type: "working", content: "Second memory content" });
    const mem2 = createMemoryEntry({ id: "mem_a", type: "working", content: "First memory content" });
    const mem3 = createMemoryEntry({ id: "mem_b", type: "working", content: "Duplicate mem_b" });

    const context = normalizePlanningContext({
      retrievedMemories: [mem1, mem2, mem3],
    });

    expect(context.retrievedMemories).toHaveLength(2);
    expect(context.retrievedMemories?.[0].id).toBe("mem_a");
    expect(context.retrievedMemories?.[1].id).toBe("mem_b");
    expect(Object.isFrozen(context.retrievedMemories)).toBe(true);
  });

  it("should throw InvalidPlanningContextError for empty contextId or negative timestamp", () => {
    expect(() => normalizePlanningContext({ contextId: "   " })).toThrow(
      InvalidPlanningContextError
    );
    expect(() => normalizePlanningContext({ timestampMs: -500 })).toThrow(
      InvalidPlanningContextError
    );
  });

  it("should throw InvalidPlanningContextError for malformed intentResult confidence", () => {
    const invalidIntent = {
      intentId: "int_1",
      timestamp: Date.now(),
      category: "sys",
      domain: "os",
      intent: "open_app",
      confidence: 1.5, // > 1.0 invalid
      entities: [],
      parameters: {},
      needsClarification: false,
    };

    expect(() => normalizePlanningContext({ intentResult: invalidIntent })).toThrow(
      InvalidPlanningContextError
    );
  });

  it("should throw PlanningPolicyError for invalid policy limits", () => {
    expect(() =>
      normalizePlanningContext({
        policy: { minConfidenceThreshold: -0.1 },
      })
    ).toThrow(PlanningPolicyError);

    expect(() =>
      normalizePlanningContext({
        policy: { defaultStepTimeoutMs: 0 },
      })
    ).toThrow(PlanningPolicyError);
  });

  it("should pass validatePlanningContext on a valid normalized context", () => {
    const context = normalizePlanningContext({ contextId: "ctx_valid_999" });
    expect(() => validatePlanningContext(context)).not.toThrow();
  });
});
