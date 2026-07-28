/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 4: Conversation Lifecycle Finite State Machine (`conversation-fsm.ts`)
 *
 * @file conversation-fsm.ts
 * @description Non-reentrant pure Finite State Machine governing official ConversationStatus
 * lifecycle state transitions (CREATED → ACTIVE → WAITING → IDLE → ARCHIVED → CLOSED).
 * Performs fail-fast validation, transition auditing, and state machine invariant enforcement.
 *
 * @module @aether/conversation-core/conversation-fsm
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 1
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { ConversationStatus } from "./types";
import { ConversationStateError } from "./errors";


// ============================================================================
// 1. TRANSITION CONTRACTS
// ============================================================================

/**
 * Immutable audit event capturing a conversation state machine transition.
 */
export interface ConversationTransitionEvent {
  /** Source state prior to transition */
  readonly fromStatus: ConversationStatus;
  /** Destination state after transition */
  readonly toStatus: ConversationStatus;
  /** Human-readable reason or trigger event for the state transition */
  readonly triggerReason: string;
  /** Transition event timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable result envelope returned by evaluateTransition().
 */
export interface ConversationFsmResult {
  /** True if transition is valid and executed successfully */
  readonly success: boolean;
  /** Resulting ConversationStatus after transition evaluation */
  readonly newStatus: ConversationStatus;
  /** Structured audit event payload */
  readonly transitionEvent: ConversationTransitionEvent;
}


// ============================================================================
// 2. STATE TRANSITION RULES MATRIX
// ============================================================================

/**
 * Allowed transition mapping table defining valid source → target status paths.
 */
const VALID_TRANSITION_MATRIX: Readonly<Record<ConversationStatus, readonly ConversationStatus[]>> = Object.freeze({
  [ConversationStatus.CREATED]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.ACTIVE]: [
    ConversationStatus.WAITING,
    ConversationStatus.IDLE,
    ConversationStatus.ARCHIVED,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.WAITING]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.WAITING, // Self-loop for multi-step tool execution sequences
    ConversationStatus.IDLE,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.IDLE]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.ARCHIVED,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.ARCHIVED]: [
    ConversationStatus.ACTIVE,
    ConversationStatus.CLOSED,
  ],
  [ConversationStatus.CLOSED]: [], // Terminal state — zero valid outgoing transitions
});


// ============================================================================
// 3. PURE FSM EVALUATION FUNCTIONS
// ============================================================================

/**
 * Pure evaluation function checking if a state transition from `fromStatus` to `toStatus` is permitted.
 *
 * @param fromStatus - Current ConversationStatus.
 * @param toStatus - Target ConversationStatus.
 * @returns True if transition is legal under FSM rules; false otherwise.
 */
export function canTransition(
  fromStatus: ConversationStatus,
  toStatus: ConversationStatus
): boolean {
  if (!fromStatus || !toStatus) {
    return false;
  }

  const allowedTargets = VALID_TRANSITION_MATRIX[fromStatus];
  if (!allowedTargets) {
    return false;
  }

  return allowedTargets.includes(toStatus);
}

/**
 * Validates a proposed state transition and throws ConversationStateError immediately if illegal.
 *
 * @param fromStatus - Current ConversationStatus.
 * @param toStatus - Target ConversationStatus.
 * @throws {ConversationStateError} If transition violates FSM matrix rules.
 */
export function validateTransition(
  fromStatus: ConversationStatus,
  toStatus: ConversationStatus
): void {
  if (!Object.values(ConversationStatus).includes(fromStatus)) {
    throw new ConversationStateError({
      subCode: "InvalidSourceStatus",
      message: `Invalid source ConversationStatus: ${String(fromStatus)}`,
    });
  }

  if (!Object.values(ConversationStatus).includes(toStatus)) {
    throw new ConversationStateError({
      subCode: "InvalidTargetStatus",
      message: `Invalid target ConversationStatus: ${String(toStatus)}`,
    });
  }

  if (!canTransition(fromStatus, toStatus)) {
    throw new ConversationStateError({
      subCode: "IllegalStateTransition",
      message: `Illegal conversation lifecycle transition from '${fromStatus}' to '${toStatus}'.`,
      details: { fromStatus, toStatus },
    });
  }
}

/**
 * Pure evaluation function executing a conversation state transition.
 * Validates invariants and returns an immutable ConversationFsmResult object.
 *
 * @param fromStatus - Current ConversationStatus.
 * @param toStatus - Target ConversationStatus.
 * @param triggerReason - Human-readable reason for the state transition.
 * @returns Immutable ConversationFsmResult payload.
 *
 * @throws {ConversationStateError} If transition is illegal.
 */
export function evaluateTransition(
  fromStatus: ConversationStatus,
  toStatus: ConversationStatus,
  triggerReason: string = "State transition evaluated"
): Readonly<ConversationFsmResult> {
  // Fail-fast validation
  validateTransition(fromStatus, toStatus);

  const transitionEvent: ConversationTransitionEvent = {
    fromStatus,
    toStatus,
    triggerReason: triggerReason.trim() || "State transition evaluated",
    timestamp: Date.now(),
  };

  const rawResult: ConversationFsmResult = {
    success: true,
    newStatus: toStatus,
    transitionEvent: deepFreeze(transitionEvent),
  };

  return deepFreeze(rawResult);
}
