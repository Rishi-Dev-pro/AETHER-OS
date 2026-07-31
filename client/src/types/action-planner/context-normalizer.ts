/**
 * AETHER OS — Phase 9.7 Action Planning Layer
 * Component: Context Normalizer & Input Pipeline (`context-normalizer.ts`)
 *
 * @file context-normalizer.ts
 * @description Validates, cleanses, normalizes, and deeply freezes all inputs from previous
 * cognitive phases (Phase 9.1–9.6) into a canonical, deterministic `PlanningContext`.
 *
 * @module @aether/action-planner/context-normalizer
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT — MILESTONE 2
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import type { PlanningContext, PlanningPolicy } from "./contracts";
import { createPlanningContext, createPlanningPolicy } from "./factories";
import { InvalidPlanningContextError, PlanningPolicyError } from "./errors";
import type { StructuredContext } from "../cognitive";
import type { IntentResult } from "../intent";
import type { ConversationTurn } from "../conversation-core/types";
import type { MemoryEntry } from "../memory-system/types";

/**
 * Raw input payload provided to the Context Normalizer.
 */
export interface RawPlanningContextInput {
  contextId?: string;
  timestampMs?: number;
  structuredContext?: StructuredContext;
  intentResult?: IntentResult;
  conversationTurn?: ConversationTurn;
  retrievedMemories?: readonly MemoryEntry[];
  policy?: Partial<PlanningPolicy>;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function assertValidString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidPlanningContextError(`Field '${fieldName}' must be a non-empty string.`);
  }
  return value.trim();
}

function assertValidTimestamp(timestamp: unknown, fieldName: string): number {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp) || timestamp <= 0) {
    throw new InvalidPlanningContextError(`Field '${fieldName}' must be a positive unix timestamp.`);
  }
  return timestamp;
}

function validateStructuredContext(ctx: StructuredContext): void {
  assertValidString(ctx.snapshotId, "structuredContext.snapshotId");
  assertValidTimestamp(ctx.timestamp, "structuredContext.timestamp");
}

function validateIntentResult(intent: IntentResult): void {
  assertValidString(intent.intentId, "intentResult.intentId");
  assertValidString(intent.intent, "intentResult.intent");
  if (typeof intent.confidence !== "number" || Number.isNaN(intent.confidence) || intent.confidence < 0 || intent.confidence > 1) {
    throw new InvalidPlanningContextError("Field 'intentResult.confidence' must be a valid number between 0.0 and 1.0.");
  }
}

function validateConversationTurn(turn: ConversationTurn): void {
  assertValidString(turn.turnId, "conversationTurn.turnId");
  if (typeof turn.turnIndex !== "number" || Number.isNaN(turn.turnIndex) || turn.turnIndex < 0) {
    throw new InvalidPlanningContextError("Field 'conversationTurn.turnIndex' must be a non-negative integer.");
  }
}

function validateAndNormalizeMemories(memories?: readonly MemoryEntry[]): readonly MemoryEntry[] {
  if (!memories || memories.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const validMemories: MemoryEntry[] = [];

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    if (!memory || typeof memory !== "object") {
      throw new InvalidPlanningContextError(`Retrieved memory at index ${i} is malformed or null.`);
    }
    assertValidString(memory.id, `retrievedMemories[${i}].id`);
    if (typeof memory.content !== "string") {
      throw new InvalidPlanningContextError(`retrievedMemories[${i}].content must be a string.`);
    }

    if (!seenIds.has(memory.id)) {
      seenIds.add(memory.id);
      validMemories.push(memory);
    }
  }

  // Sort deterministically by Memory ID for bit-for-bit replay consistency
  validMemories.sort((a, b) => a.id.localeCompare(b.id));

  return validMemories;
}

function validatePlanningPolicy(policy: PlanningPolicy): void {
  if (policy.minConfidenceThreshold < 0 || policy.minConfidenceThreshold > 1) {
    throw new PlanningPolicyError("minConfidenceThreshold must be between 0.0 and 1.0.");
  }
  if (policy.defaultStepTimeoutMs <= 0) {
    throw new PlanningPolicyError("defaultStepTimeoutMs must be positive.");
  }
  if (policy.maxStepsPerPlan <= 0) {
    throw new PlanningPolicyError("maxStepsPerPlan must be positive.");
  }
}

// ============================================================================
// PUBLIC NORMALIZER PIPELINE
// ============================================================================

/**
 * Normalizes, validates, and deeply freezes raw input into a canonical PlanningContext.
 *
 * @param input Raw input payload containing cognitive snapshot, intent, turn, memories, policy.
 * @returns Fully validated and deeply frozen Readonly<PlanningContext>.
 * @throws InvalidPlanningContextError if input structures are malformed or fail assertions.
 * @throws PlanningPolicyError if policy configuration is invalid.
 */
export function normalizePlanningContext(input?: RawPlanningContextInput): Readonly<PlanningContext> {
  if (!input) {
    return createPlanningContext();
  }

  const contextId = input.contextId ? assertValidString(input.contextId, "contextId") : undefined;
  const timestampMs = input.timestampMs ? assertValidTimestamp(input.timestampMs, "timestampMs") : Date.now();

  if (input.structuredContext) {
    validateStructuredContext(input.structuredContext);
  }

  if (input.intentResult) {
    validateIntentResult(input.intentResult);
  }

  if (input.conversationTurn) {
    validateConversationTurn(input.conversationTurn);
  }

  const normalizedMemories = validateAndNormalizeMemories(input.retrievedMemories);

  let policy: PlanningPolicy;
  try {
    policy = createPlanningPolicy(input.policy);
    validatePlanningPolicy(policy);
  } catch (err: unknown) {
    if (err instanceof PlanningPolicyError) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : "Invalid planning policy configuration.";
    throw new PlanningPolicyError(msg);
  }

  const context = createPlanningContext({
    contextId,
    timestampMs,
    structuredContext: input.structuredContext,
    intentResult: input.intentResult,
    conversationTurn: input.conversationTurn,
    retrievedMemories: normalizedMemories,
    policy,
  });

  return deepFreeze(context);
}

/**
 * Asserts structural and semantic invariants on an existing PlanningContext.
 * Throws InvalidPlanningContextError if any invariant is violated.
 */
export function validatePlanningContext(context: PlanningContext): void {
  if (!context || typeof context !== "object") {
    throw new InvalidPlanningContextError("PlanningContext must be a non-null object.");
  }

  assertValidString(context.contextId, "contextId");
  assertValidTimestamp(context.timestampMs, "timestampMs");

  if (context.structuredContext) {
    validateStructuredContext(context.structuredContext);
  }

  if (context.intentResult) {
    validateIntentResult(context.intentResult);
  }

  if (context.conversationTurn) {
    validateConversationTurn(context.conversationTurn);
  }

  if (context.retrievedMemories) {
    validateAndNormalizeMemories(context.retrievedMemories);
  }

  if (context.policy) {
    validatePlanningPolicy(context.policy);
  }
}
