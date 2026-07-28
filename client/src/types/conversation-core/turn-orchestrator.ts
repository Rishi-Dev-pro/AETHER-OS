/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 7: Turn Orchestrator (`turn-orchestrator.ts`)
 *
 * @file turn-orchestrator.ts
 * @description Pure turn orchestration component coordinating conversation turns, canonical message
 * append operations, FSM status transitions, and Context Trimmer snapshot preparation. Does NOT invoke
 * Prompt Builder or AI Runtime transport layers.
 *
 * @module @aether/conversation-core/turn-orchestrator
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 3
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import type { ToolCallDescriptor } from "../ai-runtime/types";
import {
  ConversationStatus,
  TurnStatus,
  type Conversation,
  type ConversationTurn,
  type ConversationMessage,
  type ContextSnapshot,
  createConversation,
  createConversationTurn,
} from "./types";
import {
  ConversationValidationError,
  ConversationStateError,
} from "./errors";
import {
  createSystemMessage,
  createUserMessage,
  createAssistantMessage,
  createToolResponseMessage,
} from "./message-canonicalizer";
import { evaluateTransition } from "./conversation-fsm";
import { trimConversation, type TrimConversationOptions } from "./context-trimmer";


// ============================================================================
// 1. IN-MEMORY IMMUTABLE CONVERSATION STORE
// ============================================================================

/** In-memory map of conversationId -> Readonly<Conversation> */
const conversationStore = new Map<string, Readonly<Conversation>>();


// ============================================================================
// 2. HELPER UTILITIES
// ============================================================================

/**
 * Retrieves an existing Conversation from store or throws ConversationValidationError.
 */
export function getConversation(conversationId: string): Readonly<Conversation> {
  if (!conversationId || typeof conversationId !== "string" || conversationId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidConversationId",
      message: "getConversation requires a non-empty conversationId string.",
    });
  }

  const cleanId = conversationId.trim();
  const conv = conversationStore.get(cleanId);

  if (!conv) {
    throw new ConversationValidationError({
      subCode: "ConversationNotFound",
      message: `Conversation '${cleanId}' was not found in store.`,
    });
  }

  return conv;
}

/**
 * Creates a new Conversation or retrieves an existing one.
 */
export function createOrGetConversation(
  conversationId: string,
  sessionId: string,
  systemInstructions: string = "AETHER OS System Assistant"
): Readonly<Conversation> {
  const cleanConvId = conversationId.trim();

  if (conversationStore.has(cleanConvId)) {
    return conversationStore.get(cleanConvId)!;
  }

  // Create initial System instruction turn (Turn 1)
  const sysMsg = createSystemMessage(cleanConvId, systemInstructions);
  const initialTurn = createConversationTurn({
    turnId: `turn_sys_${Date.now()}`,
    conversationId: cleanConvId,
    turnIndex: 1,
    userMessage: sysMsg,
    status: TurnStatus.COMPLETED,
  });

  const conv = createConversation({
    conversationId: cleanConvId,
    sessionId: sessionId.trim(),
    status: ConversationStatus.CREATED,
    turns: [initialTurn],
  });

  conversationStore.set(cleanConvId, conv);
  return conv;
}


// ============================================================================
// 3. TURN ORCHESTRATION APIS
// ============================================================================

/**
 * Options passed to beginTurn function.
 */
export interface BeginTurnOptions {
  readonly snapshotId?: string;
  readonly intentId?: string;
  readonly durationMs?: number;
}

/**
 * Initiates a new user dialogue turn in a conversation.
 * Appends canonical User message, transitions Conversation FSM state (CREATED/IDLE -> ACTIVE -> WAITING),
 * and returns the updated turn and conversation objects.
 *
 * @param conversationId - Target conversation identifier.
 * @param userText - User prompt input text.
 * @param options - Optional correlation metadata (snapshotId, intentId).
 * @returns Object containing the new Readonly<ConversationTurn> and updated Readonly<Conversation>.
 *
 * @throws {ConversationStateError} If conversation is CLOSED or ARCHIVED.
 * @throws {ConversationValidationError} If userText is empty.
 */
export function beginTurn(
  conversationId: string,
  userText: string,
  options: BeginTurnOptions = {}
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);

  if (conv.status === ConversationStatus.CLOSED || conv.status === ConversationStatus.ARCHIVED) {
    throw new ConversationStateError({
      subCode: "ClosedConversationTurnError",
      message: `Cannot begin a new turn on a conversation in '${conv.status}' status.`,
    });
  }

  // Transition FSM state -> ACTIVE -> WAITING
  let currentStatus: ConversationStatus = conv.status;
  if (currentStatus === ConversationStatus.CREATED || currentStatus === ConversationStatus.IDLE) {
    const fsmResult = evaluateTransition(currentStatus, ConversationStatus.ACTIVE, "User initiated turn");
    currentStatus = fsmResult.newStatus;
  }

  const fsmWaitingResult = evaluateTransition(currentStatus, ConversationStatus.WAITING, "Turn processing started");
  const finalStatus = fsmWaitingResult.newStatus;

  // Create Canonical User message
  const userMsg = createUserMessage(conv.conversationId, userText);

  // Instantiates new Turn
  const newTurnIndex = conv.turns.length + 1;
  const turnId = `turn_${Date.now()}_${newTurnIndex}`;

  const newTurn = createConversationTurn({
    turnId,
    conversationId: conv.conversationId,
    turnIndex: newTurnIndex,
    userMessage: userMsg,
    status: TurnStatus.PROCESSING,
    snapshotId: options.snapshotId,
    intentId: options.intentId,
    durationMs: options.durationMs,
  });

  const updatedTurns = [...conv.turns, newTurn];
  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: finalStatus,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: newTurn,
    conversation: updatedConv,
  });
}

/**
 * Appends an Assistant completion message or tool invocation request to an active turn.
 *
 * @param conversationId - Target conversation identifier.
 * @param turnId - Active turn identifier.
 * @param assistantText - Assistant completion response text.
 * @param toolCalls - Optional tool call descriptors requested by model.
 * @returns Object containing the updated turn and conversation.
 *
 * @throws {ConversationValidationError} If turn or conversation is not found.
 */
export function appendAssistantMessage(
  conversationId: string,
  turnId: string,
  assistantText: string,
  toolCalls?: readonly ToolCallDescriptor[]
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);
  const turnIndex = conv.turns.findIndex((t) => t.turnId === turnId);

  if (turnIndex === -1) {
    throw new ConversationValidationError({
      subCode: "TurnNotFound",
      message: `Turn with id '${turnId}' was not found in conversation '${conversationId}'.`,
    });
  }

  const existingTurn = conv.turns[turnIndex];
  const assistantMsg = createAssistantMessage(conversationId, assistantText, toolCalls);

  const isAwaitingTool = toolCalls && toolCalls.length > 0;
  const newTurnStatus = isAwaitingTool ? TurnStatus.AWAITING_TOOL : TurnStatus.COMPLETED;

  const updatedTurn = createConversationTurn({
    turnId: existingTurn.turnId,
    conversationId: existingTurn.conversationId,
    turnIndex: existingTurn.turnIndex,
    userMessage: existingTurn.userMessage,
    assistantMessage: assistantMsg,
    toolMessages: existingTurn.toolMessages,
    status: newTurnStatus,
    snapshotId: existingTurn.snapshotId,
    intentId: existingTurn.intentId,
    durationMs: existingTurn.durationMs,
  });

  const updatedTurns = [...conv.turns];
  updatedTurns[turnIndex] = updatedTurn;

  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: isAwaitingTool ? ConversationStatus.WAITING : ConversationStatus.ACTIVE,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: updatedTurn,
    conversation: updatedConv,
  });
}

/**
 * Appends a Tool output response message to an active turn.
 *
 * @param conversationId - Target conversation identifier.
 * @param turnId - Active turn identifier.
 * @param toolCallId - Tool call ID matching the assistant's request.
 * @param toolResultText - Tool execution output text payload.
 * @returns Object containing the updated turn and conversation.
 */
export function appendToolMessage(
  conversationId: string,
  turnId: string,
  toolCallId: string,
  toolResultText: string
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);
  const turnIndex = conv.turns.findIndex((t) => t.turnId === turnId);

  if (turnIndex === -1) {
    throw new ConversationValidationError({
      subCode: "TurnNotFound",
      message: `Turn with id '${turnId}' was not found in conversation '${conversationId}'.`,
    });
  }

  const existingTurn = conv.turns[turnIndex];
  const toolMsg = createToolResponseMessage(conversationId, toolCallId, toolResultText);

  const updatedToolMessages = [...(existingTurn.toolMessages ?? []), toolMsg];

  const updatedTurn = createConversationTurn({
    turnId: existingTurn.turnId,
    conversationId: existingTurn.conversationId,
    turnIndex: existingTurn.turnIndex,
    userMessage: existingTurn.userMessage,
    assistantMessage: existingTurn.assistantMessage,
    toolMessages: updatedToolMessages,
    status: TurnStatus.PROCESSING,
    snapshotId: existingTurn.snapshotId,
    intentId: existingTurn.intentId,
    durationMs: existingTurn.durationMs,
  });

  const updatedTurns = [...conv.turns];
  updatedTurns[turnIndex] = updatedTurn;

  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: ConversationStatus.WAITING,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: updatedTurn,
    conversation: updatedConv,
  });
}

/**
 * Prepares an immutable ContextSnapshot for a conversation using Milestone 2 ContextTrimmer.
 *
 * @param conversationId - Target conversation identifier.
 * @param targetMaxTokens - Maximum allowable context window ceiling.
 * @param options - Additional trimming options.
 * @returns Readonly<ContextSnapshot>.
 */
export function prepareContext(
  conversationId: string,
  targetMaxTokens: number,
  options: TrimConversationOptions = {}
): Readonly<ContextSnapshot> {
  const conv = getConversation(conversationId);

  // Extract all messages across turns in chronological order
  const allMessages: ConversationMessage[] = [];
  for (const turn of conv.turns) {
    if (turn.userMessage) allMessages.push(turn.userMessage);
    if (turn.assistantMessage) allMessages.push(turn.assistantMessage);
    if (turn.toolMessages) allMessages.push(...turn.toolMessages);
  }

  // Invoke Milestone 2 Context Trimmer engine
  return trimConversation(allMessages, targetMaxTokens, options);
}

/**
 * Completes an active turn, transitions FSM state (WAITING -> ACTIVE -> IDLE), and seals the turn.
 *
 * @param conversationId - Target conversation identifier.
 * @param turnId - Active turn identifier.
 * @returns Object containing the completed turn and conversation.
 */
export function completeTurn(
  conversationId: string,
  turnId: string
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);
  const turnIndex = conv.turns.findIndex((t) => t.turnId === turnId);

  if (turnIndex === -1) {
    throw new ConversationValidationError({
      subCode: "TurnNotFound",
      message: `Turn with id '${turnId}' was not found in conversation '${conversationId}'.`,
    });
  }

  const existingTurn = conv.turns[turnIndex];
  const completedTurn = createConversationTurn({
    turnId: existingTurn.turnId,
    conversationId: existingTurn.conversationId,
    turnIndex: existingTurn.turnIndex,
    userMessage: existingTurn.userMessage,
    assistantMessage: existingTurn.assistantMessage,
    toolMessages: existingTurn.toolMessages,
    status: TurnStatus.COMPLETED,
    snapshotId: existingTurn.snapshotId,
    intentId: existingTurn.intentId,
    durationMs: existingTurn.durationMs,
  });

  const updatedTurns = [...conv.turns];
  updatedTurns[turnIndex] = completedTurn;

  // Transition FSM -> IDLE
  let currentStatus = conv.status;
  if (currentStatus === ConversationStatus.WAITING) {
    const fsmActive = evaluateTransition(currentStatus, ConversationStatus.ACTIVE, "Turn completed");
    currentStatus = fsmActive.newStatus;
  }

  const fsmIdle = evaluateTransition(currentStatus, ConversationStatus.IDLE, "Conversation resting");

  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: fsmIdle.newStatus,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: completedTurn,
    conversation: updatedConv,
  });
}

/**
 * Fails an active turn and marks its status as FAILED.
 */
export function failTurn(
  conversationId: string,
  turnId: string,
  errorMessage: string
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);
  const turnIndex = conv.turns.findIndex((t) => t.turnId === turnId);

  if (turnIndex === -1) {
    throw new ConversationValidationError({
      subCode: "TurnNotFound",
      message: `Turn with id '${turnId}' was not found in conversation '${conversationId}'.`,
    });
  }

  const existingTurn = conv.turns[turnIndex];
  const failedTurn = createConversationTurn({
    turnId: existingTurn.turnId,
    conversationId: existingTurn.conversationId,
    turnIndex: existingTurn.turnIndex,
    userMessage: existingTurn.userMessage,
    assistantMessage: existingTurn.assistantMessage,
    toolMessages: existingTurn.toolMessages,
    status: TurnStatus.FAILED,
    snapshotId: existingTurn.snapshotId,
    intentId: existingTurn.intentId,
    durationMs: existingTurn.durationMs,
  });

  const updatedTurns = [...conv.turns];
  updatedTurns[turnIndex] = failedTurn;

  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: ConversationStatus.IDLE,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata, lastError: errorMessage },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: failedTurn,
    conversation: updatedConv,
  });
}

/**
 * Cancels an active turn.
 */
export function cancelTurn(
  conversationId: string,
  turnId: string,
  reason: string = "Turn execution cancelled"
): {
  readonly turn: Readonly<ConversationTurn>;
  readonly conversation: Readonly<Conversation>;
} {
  const conv = getConversation(conversationId);
  const turnIndex = conv.turns.findIndex((t) => t.turnId === turnId);

  if (turnIndex === -1) {
    throw new ConversationValidationError({
      subCode: "TurnNotFound",
      message: `Turn with id '${turnId}' was not found in conversation '${conversationId}'.`,
    });
  }

  const existingTurn = conv.turns[turnIndex];
  const cancelledTurn = createConversationTurn({
    turnId: existingTurn.turnId,
    conversationId: existingTurn.conversationId,
    turnIndex: existingTurn.turnIndex,
    userMessage: existingTurn.userMessage,
    assistantMessage: existingTurn.assistantMessage,
    toolMessages: existingTurn.toolMessages,
    status: TurnStatus.FAILED,
    snapshotId: existingTurn.snapshotId,
    intentId: existingTurn.intentId,
    durationMs: existingTurn.durationMs,
  });

  const updatedTurns = [...conv.turns];
  updatedTurns[turnIndex] = cancelledTurn;

  const updatedConv = createConversation({
    conversationId: conv.conversationId,
    sessionId: conv.sessionId,
    status: ConversationStatus.IDLE,
    turns: updatedTurns,
    totalTokensConsumed: conv.totalTokensConsumed,
    metadata: { ...conv.metadata, cancellationReason: reason },
  });

  conversationStore.set(conv.conversationId, updatedConv);

  return deepFreeze({
    turn: cancelledTurn,
    conversation: updatedConv,
  });
}

/**
 * Resets the in-memory conversation store (primarily for test suite isolation).
 */
export function resetConversationStore(): void {
  conversationStore.clear();
}
