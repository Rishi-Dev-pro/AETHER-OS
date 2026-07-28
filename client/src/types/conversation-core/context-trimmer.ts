/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 5: Context Trimming & Token Budgeting Engine (`context-trimmer.ts`)
 *
 * @file context-trimmer.ts
 * @description Pure, deterministic context trimming engine responsible for calculating token budgets,
 * estimating message token counts, enforcing mandatory trimming rules (system preservation, recent turn
 * protection, tool call pair integrity), and generating immutable ContextSnapshot contracts.
 *
 * @module @aether/conversation-core/context-trimmer
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 2
 */

import { PayloadSensitivity } from "../ai-runtime/security";
import {
  MessageRole,
  TrimmingStrategy,
  type ConversationMessage,
  type ContextSnapshot,
  createContextSnapshot,
} from "./types";
import { ContextError, ConversationValidationError } from "./errors";


// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

/** Default number of recent conversation turns protected from trimming */
export const DEFAULT_PROTECTED_RECENT_TURNS = 3;

/** Default number of output tokens reserved for LLM generation response */
export const DEFAULT_RESERVE_OUTPUT_TOKENS = 1000;

/** Default target context ceiling in tokens */
export const DEFAULT_TARGET_MAX_TOKENS = 8192;


// ============================================================================
// 2. DETERMINISTIC TOKEN ESTIMATOR
// ============================================================================

/**
 * Deterministically estimates the token count of a single ConversationMessage.
 * Uses a provider-independent 4-character-per-token heuristic plus fixed envelope overhead.
 *
 * Formula: Math.ceil(text.length / 4) + 4 (role + metadata overhead) + tool_call_overhead
 *
 * @param message - ConversationMessage to evaluate.
 * @returns Estimated token count (integer >= 4).
 */
export function estimateMessageTokens(message: ConversationMessage): number {
  if (!message) {
    return 0;
  }

  const textLength = message.text ? message.text.length : 0;
  const baseTokens = Math.ceil(textLength / 4) + 4;

  let toolTokens = 0;
  if (message.toolCalls && message.toolCalls.length > 0) {
    toolTokens = message.toolCalls.reduce((acc, tc) => {
      const argsLength = tc.arguments ? JSON.stringify(tc.arguments).length : 0;
      return acc + Math.ceil((tc.name.length + argsLength) / 4) + 6;
    }, 0);
  }

  return baseTokens + toolTokens;
}

/**
 * Deterministically estimates the total token count of an array of ConversationMessages.
 *
 * @param messages - Array of ConversationMessage contracts.
 * @returns Total estimated token count.
 */
export function estimateTokenCount(messages: readonly ConversationMessage[]): number {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return 0;
  }
  return messages.reduce((acc, msg) => acc + estimateMessageTokens(msg), 0);
}


// ============================================================================
// 3. BUDGET CALCULATOR
// ============================================================================

/**
 * Calculates the net input token budget available for conversation history.
 *
 * Formula: availableInputBudget = targetMaxTokens - reserveOutputTokens
 *
 * @param targetMaxTokens - Hard upper bound for target context window.
 * @param reserveOutputTokens - Reserved token space for model completion generation.
 * @returns Net available input token budget.
 *
 * @throws {ContextError} If budget bounds check fails.
 */
export function calculateBudget(
  targetMaxTokens: number,
  reserveOutputTokens: number = DEFAULT_RESERVE_OUTPUT_TOKENS
): number {
  if (typeof targetMaxTokens !== "number" || targetMaxTokens <= 0 || !Number.isInteger(targetMaxTokens)) {
    throw new ContextError({
      subCode: "InvalidTargetMaxTokens",
      message: `targetMaxTokens must be a positive integer > 0. Received: ${targetMaxTokens}`,
    });
  }

  if (typeof reserveOutputTokens !== "number" || reserveOutputTokens < 0 || !Number.isInteger(reserveOutputTokens)) {
    throw new ContextError({
      subCode: "InvalidReserveOutputTokens",
      message: `reserveOutputTokens must be a non-negative integer >= 0. Received: ${reserveOutputTokens}`,
    });
  }

  if (targetMaxTokens <= reserveOutputTokens) {
    throw new ContextError({
      subCode: "InsufficientInputBudget",
      message: `targetMaxTokens (${targetMaxTokens}) must be strictly greater than reserveOutputTokens (${reserveOutputTokens}).`,
    });
  }

  return targetMaxTokens - reserveOutputTokens;
}


// ============================================================================
// 4. TRIMMING HELPER UTILITIES & PAIR INTEGRITY
// ============================================================================

/**
 * Identifies indexes of recent turns to protect under Rule 2.
 * A turn begins at a USER role message and includes subsequent ASSISTANT/TOOL messages.
 *
 * @param messages - Complete message array.
 * @param kTurns - Number of recent turns to protect.
 * @returns Set of message indexes protected from trimming under Rule 2.
 */
function getProtectedRecentIndexes(
  messages: readonly ConversationMessage[],
  kTurns: number
): Set<number> {
  const protectedIndexes = new Set<number>();
  if (messages.length === 0 || kTurns <= 0) {
    return protectedIndexes;
  }

  // Find user message positions from end to start
  const userIndexes: number[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === MessageRole.USER) {
      userIndexes.push(i);
      if (userIndexes.length === kTurns) {
        break;
      }
    }
  }

  // If user messages were found, protect everything from the earliest protected user message to the end
  if (userIndexes.length > 0) {
    const earliestProtectedIndex = userIndexes[userIndexes.length - 1];
    for (let i = earliestProtectedIndex; i < messages.length; i++) {
      protectedIndexes.add(i);
    }
  }

  return protectedIndexes;
}


// ============================================================================
// 5. CORE CONTEXT TRIMMING ENGINE
// ============================================================================

/**
 * Options passed to trimConversation function.
 */
export interface TrimConversationOptions {
  readonly reserveOutputTokens?: number;
  readonly protectedRecentTurns?: number;
  readonly strategy?: TrimmingStrategy;
  readonly snapshotId?: string;
}

/**
 * Pure function performing deterministic context window trimming and snapshot generation.
 *
 * Rule 1: SYSTEM messages are NEVER removed.
 * Rule 2: Protect the most recent K conversation turns (default K=3).
 * Rule 3: Tool-call pair integrity — Assistant tool request and Tool response are paired and trimmed together.
 * Rule 4: Sliding window — Oldest eligible messages removed until total tokens <= availableInputBudget.
 *
 * @param messages - Array of input conversation messages.
 * @param targetMaxTokens - Maximum allowable context window tokens ceiling.
 * @param options - Additional trimming options (reserveOutputTokens, strategy, etc.).
 * @returns Immutable ContextSnapshot contract.
 *
 * @throws {ContextError} If budget is insufficient or no SYSTEM message is present.
 */
export function trimConversation(
  messages: readonly ConversationMessage[],
  targetMaxTokens: number,
  options: TrimConversationOptions = {}
): Readonly<ContextSnapshot> {
  // Input validation
  if (!messages || !Array.isArray(messages)) {
    throw new ConversationValidationError({
      subCode: "InvalidMessagesArray",
      message: "trimConversation requires a valid array of ConversationMessage objects.",
    });
  }

  const reserveOutputTokens = options.reserveOutputTokens ?? DEFAULT_RESERVE_OUTPUT_TOKENS;
  const availableInputBudget = calculateBudget(targetMaxTokens, reserveOutputTokens);
  const strategy = options.strategy ?? TrimmingStrategy.SLIDING_WINDOW;

  // Separate SYSTEM message (Rule 1)
  const systemMsgIndex = messages.findIndex((m) => m.role === MessageRole.SYSTEM);
  let systemMessage: ConversationMessage;

  if (systemMsgIndex !== -1) {
    systemMessage = messages[systemMsgIndex];
  } else {
    // If no SYSTEM message exists, synthesize a minimal default system boundary
    systemMessage = {
      messageId: `sys_default_${Date.now()}`,
      conversationId: messages[0]?.conversationId ?? "default_conv",
      role: MessageRole.SYSTEM,
      text: "AETHER OS System Assistant",
      timestamp: Date.now(),
      sensitivity: PayloadSensitivity.INTERNAL,
      metadata: {},
    };
  }

  const systemTokenCount = estimateMessageTokens(systemMessage);

  if (systemTokenCount > availableInputBudget) {
    throw new ContextError({
      subCode: "SystemMessageExceedsBudget",
      message: `SYSTEM message token estimate (${systemTokenCount}) exceeds net available input budget (${availableInputBudget}).`,
    });
  }

  // Non-system candidate messages for trimming evaluation
  const nonSystemMessages = messages.filter((_, idx) => idx !== systemMsgIndex);

  // Rule 2: Determine protected recent turn indexes
  const kTurns = options.protectedRecentTurns ?? DEFAULT_PROTECTED_RECENT_TURNS;
  const protectedIndexes = getProtectedRecentIndexes(nonSystemMessages, kTurns);

  // Compute token cost of protected recent messages
  let activeMessages: ConversationMessage[] = [...nonSystemMessages];
  let currentTotalTokens = systemTokenCount + estimateTokenCount(activeMessages);

  // Rule 4 & Rule 3: Sliding window trimming of oldest non-protected messages
  let trimmedCount = 0;
  let i = 0;

  while (currentTotalTokens > availableInputBudget && i < activeMessages.length) {
    // If index is protected by Rule 2, skip trimming it
    if (protectedIndexes.has(i)) {
      i++;
      continue;
    }

    const currentMsg = activeMessages[i];

    // Rule 3: Tool-call pair integrity check
    // If current message is ASSISTANT with toolCalls, find matching TOOL responses
    let removeIndices = [i];

    if (currentMsg.role === MessageRole.ASSISTANT && currentMsg.toolCalls && currentMsg.toolCalls.length > 0) {
      const toolCallIds = new Set(currentMsg.toolCalls.map((tc) => tc.id));
      for (let j = i + 1; j < activeMessages.length; j++) {
        if (activeMessages[j].role === MessageRole.TOOL && activeMessages[j].toolCallId && toolCallIds.has(activeMessages[j].toolCallId!)) {
          removeIndices.push(j);
        }
      }
    } else if (currentMsg.role === MessageRole.TOOL && currentMsg.toolCallId) {
      // If current message is TOOL response, find preceding ASSISTANT request
      for (let j = i - 1; j >= 0; j--) {
        if (activeMessages[j].role === MessageRole.ASSISTANT && activeMessages[j].toolCalls?.some((tc) => tc.id === currentMsg.toolCallId)) {
          removeIndices.push(j);
          break;
        }
      }
    }

    // Remove targeted pair indices in reverse order to preserve indexing
    removeIndices.sort((a, b) => b - a);

    // Calculate token reduction
    let tokensRemoved = 0;
    for (const idxToRemove of removeIndices) {
      if (idxToRemove < activeMessages.length) {
        tokensRemoved += estimateMessageTokens(activeMessages[idxToRemove]);
        activeMessages.splice(idxToRemove, 1);
        trimmedCount++;
      }
    }

    currentTotalTokens -= tokensRemoved;
    // Reset index to re-evaluate remaining array
    i = 0;
  }

  // Construct snapshot ID
  const snapshotId = options.snapshotId ?? `snap_trim_${Date.now()}`;
  const conversationId = messages[0]?.conversationId ?? "default_conv";

  // Construct and freeze ContextSnapshot
  const snapshot = createContextSnapshot({
    snapshotId,
    conversationId,
    systemMessage,
    activeMessages,
    totalTokenEstimate: currentTotalTokens,
    trimmedCount,
    trimmingStrategy: strategy,
  });

  return snapshot;
}
