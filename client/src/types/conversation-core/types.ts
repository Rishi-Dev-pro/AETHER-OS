/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 1: Shared Conversation Types, Enums & Immutable Data Contracts (`types.ts`)
 *
 * @file types.ts
 * @description Foundation layer for Phase 9.5 Conversation Core defining enums,
 * message interfaces, turn descriptors, context snapshots, session interfaces,
 * conversation state envelopes, and immutable factory functions with invariant validation.
 *
 * @module @aether/conversation-core/types
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 1
 */

import { deepFreeze } from "../ai-runtime/internal/deep-freeze";
import { PayloadSensitivity } from "../ai-runtime/security";
import type { ToolCallDescriptor } from "../ai-runtime/types";
import { ConversationValidationError } from "./errors";


// ============================================================================
// 1. CONVERSATION ENUMS
// ============================================================================

/**
 * Formal roles for conversational message attribution across model and system boundaries.
 */
export enum MessageRole {
  /** Core OS instructions, safety boundaries, and context setup */
  SYSTEM = "SYSTEM",
  /** User-initiated prompts, voice commands, or multimodal inputs */
  USER = "USER",
  /** LLM assistant completion outputs or tool invocation requests */
  ASSISTANT = "ASSISTANT",
  /** Tool execution result outputs returned to model */
  TOOL = "TOOL",
  /** System developer directives or dynamic system prompt injected rules */
  DEVELOPER = "DEVELOPER",
}

/**
 * Formal lifecycle status states for a Conversation instance.
 */
export enum ConversationStatus {
  /** Initialized and validated; awaiting first turn dispatch */
  CREATED = "CREATED",
  /** Actively processing or engaging in dialogue turns */
  ACTIVE = "ACTIVE",
  /** Awaiting external async response (e.g. LLM transport or tool execution) */
  WAITING = "WAITING",
  /** Dialogue turn completed; idle and awaiting next user interaction */
  IDLE = "IDLE",
  /** Summarized and persisted; inactive but recoverable */
  ARCHIVED = "ARCHIVED",
  /** Terminated and read-only; no further turns allowed */
  CLOSED = "CLOSED",
}

/**
 * Formal state of an individual ConversationTurn execution cycle.
 */
export enum TurnStatus {
  /** Turn envelope instantiated and assigned index */
  TURN_CREATED = "TURN_CREATED",
  /** Awaiting user prompt input or tool output response */
  AWAITING_INPUT = "AWAITING_INPUT",
  /** Actively processing prompt packaging or AI Runtime dispatch */
  PROCESSING = "PROCESSING",
  /** Assistant emitted tool calls; awaiting tool execution completion */
  AWAITING_TOOL = "AWAITING_TOOL",
  /** Turn execution successfully completed with normalized assistant output */
  COMPLETED = "COMPLETED",
  /** Non-recoverable turn execution failure */
  FAILED = "FAILED",
}

/**
 * Context reduction heuristics applied by the Context Trimmer.
 */
export enum TrimmingStrategy {
  /** Trim oldest intermediate non-system messages sequentially */
  SLIDING_WINDOW = "SLIDING_WINDOW",
  /** Preserve high-priority safety instructions and recent turns */
  PRIORITY_RESERVE = "PRIORITY_RESERVE",
  /** Combine intermediate turn summarization with sliding window */
  SUMMARY_HYBRID = "SUMMARY_HYBRID",
}


// ============================================================================
// 2. IMMUTABLE DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable canonical conversation message representation.
 */
export interface ConversationMessage {
  /** Unique message instance identifier (e.g. "msg_8f1a2b3c") */
  readonly messageId: string;
  /** Linked conversation instance identifier */
  readonly conversationId: string;
  /** Attributed role of the message sender */
  readonly role: MessageRole;
  /** Primary text content of the message */
  readonly text: string;
  /** Optional tool call descriptors requested if role === ASSISTANT */
  readonly toolCalls?: readonly ToolCallDescriptor[];
  /** Optional tool call identifier matching requested tool if role === TOOL */
  readonly toolCallId?: string;
  /** Creation timestamp (epoch ms) */
  readonly timestamp: number;
  /** Data sensitivity classification for transport and logging security */
  readonly sensitivity: PayloadSensitivity;
  /** Extensible key-value metadata descriptor */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Immutable multi-role dialogue turn capturing paired user input, assistant response, and tools.
 */
export interface ConversationTurn {
  /** Unique turn execution identifier (e.g. "turn_001") */
  readonly turnId: string;
  /** Linked conversation instance identifier */
  readonly conversationId: string;
  /** Monotonically increasing 1-indexed turn position within the conversation */
  readonly turnIndex: number;
  /** User message initiating the turn (if present) */
  readonly userMessage?: ConversationMessage;
  /** Assistant message completing the turn (if present) */
  readonly assistantMessage?: ConversationMessage;
  /** Intermediate tool output messages associated with this turn */
  readonly toolMessages?: readonly ConversationMessage[];
  /** Execution status of this turn */
  readonly status: TurnStatus;
  /** Linked Phase 9.1 Perception Snapshot identifier (if available) */
  readonly snapshotId?: string;
  /** Linked Phase 9.2 Intent Result identifier (if available) */
  readonly intentId?: string;
  /** Turn creation timestamp (epoch ms) */
  readonly timestamp: number;
  /** Total elapsed duration of turn execution in milliseconds */
  readonly durationMs?: number;
}

/**
 * Immutable snapshot of context history prepared for downstream Prompt Builder consumption.
 */
export interface ContextSnapshot {
  /** Unique context snapshot identifier (e.g. "ctx_snap_001") */
  readonly snapshotId: string;
  /** Linked conversation instance identifier */
  readonly conversationId: string;
  /** Immutable System instruction message (never trimmed) */
  readonly systemMessage: ConversationMessage;
  /** Active array of trimmed, priority-filtered context messages */
  readonly activeMessages: readonly ConversationMessage[];
  /** Calculated total token estimate for systemMessage + activeMessages */
  readonly totalTokenEstimate: number;
  /** Number of intermediate messages trimmed out to satisfy token budget */
  readonly trimmedCount: number;
  /** Trimming strategy applied during snapshot creation */
  readonly trimmingStrategy: TrimmingStrategy;
  /** Snapshot creation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable multi-conversation session context.
 */
export interface ConversationSession {
  /** Unique session identifier */
  readonly sessionId: string;
  /** Optional multi-tenant organizational identifier */
  readonly tenantId?: string;
  /** Currently active primary conversation identifier */
  readonly activeConversationId: string;
  /** Array of all conversation identifiers attached to this session */
  readonly conversationIds: readonly string[];
  /** Maximum allowable concurrent active conversations limit */
  readonly maxConcurrentConversations: number;
  /** Session creation timestamp (epoch ms) */
  readonly createdAt: number;
  /** Last interaction access timestamp (epoch ms) */
  readonly lastAccessedAt: number;
  /** Hard session expiration timestamp (epoch ms) */
  readonly expiresAt: number;
  /** Extensible session metadata descriptor */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Canonical Conversation model representing full multi-turn conversation state.
 */
export interface Conversation {
  /** Unique conversation instance identifier */
  readonly conversationId: string;
  /** Linked session identifier */
  readonly sessionId: string;
  /** Current conversation lifecycle status */
  readonly status: ConversationStatus;
  /** Sequential array of completed and active turns */
  readonly turns: readonly ConversationTurn[];
  /** Cumulative count of messages across all turns */
  readonly messageCount: number;
  /** Cumulative tokens consumed across all turns in this conversation */
  readonly totalTokensConsumed: number;
  /** Creation timestamp (epoch ms) */
  readonly createdAt: number;
  /** Last update timestamp (epoch ms) */
  readonly updatedAt: number;
  /** Extensible metadata descriptor */
  readonly metadata: Readonly<Record<string, unknown>>;
}


// ============================================================================
// 3. FACTORIES & INVARIANT VALIDATORS
// ============================================================================

/**
 * Parameters passed to createConversationMessage factory function.
 */
export interface CreateConversationMessageParams {
  readonly messageId: string;
  readonly conversationId: string;
  readonly role: MessageRole;
  readonly text: string;
  readonly toolCalls?: readonly ToolCallDescriptor[];
  readonly toolCallId?: string;
  readonly sensitivity?: PayloadSensitivity;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable, deep-frozen ConversationMessage instance.
 *
 * @throws {ConversationValidationError} If any invariant check fails.
 */
export function createConversationMessage(
  params: CreateConversationMessageParams
): Readonly<ConversationMessage> {
  if (!params) {
    throw new ConversationValidationError({
      subCode: "NullMessageParams",
      message: "createConversationMessage parameters object cannot be null or undefined.",
    });
  }

  if (!params.messageId || typeof params.messageId !== "string" || params.messageId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidMessageId",
      message: "ConversationMessage requires a non-empty messageId string.",
    });
  }

  if (!params.conversationId || typeof params.conversationId !== "string" || params.conversationId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidConversationId",
      message: "ConversationMessage requires a non-empty conversationId string.",
    });
  }

  if (!params.role || !Object.values(MessageRole).includes(params.role)) {
    throw new ConversationValidationError({
      subCode: "InvalidMessageRole",
      message: `Invalid MessageRole provided: ${String(params.role)}`,
    });
  }

  if (typeof params.text !== "string") {
    throw new ConversationValidationError({
      subCode: "InvalidMessageText",
      message: "ConversationMessage text property must be a string.",
    });
  }

  if (params.role === MessageRole.TOOL && (!params.toolCallId || params.toolCallId.trim() === "")) {
    throw new ConversationValidationError({
      subCode: "MissingToolCallId",
      message: "ConversationMessage with role TOOL requires a non-empty toolCallId.",
    });
  }

  const rawMessage: ConversationMessage = {
    messageId: params.messageId.trim(),
    conversationId: params.conversationId.trim(),
    role: params.role,
    text: params.text,
    toolCalls: params.toolCalls ? [...params.toolCalls] : undefined,
    toolCallId: params.toolCallId?.trim(),
    timestamp: Date.now(),
    sensitivity: params.sensitivity ?? PayloadSensitivity.CONFIDENTIAL,
    metadata: { ...(params.metadata ?? {}) },
  };

  return deepFreeze(rawMessage);
}

/**
 * Parameters passed to createConversationTurn factory function.
 */
export interface CreateConversationTurnParams {
  readonly turnId: string;
  readonly conversationId: string;
  readonly turnIndex: number;
  readonly userMessage?: ConversationMessage;
  readonly assistantMessage?: ConversationMessage;
  readonly toolMessages?: readonly ConversationMessage[];
  readonly status?: TurnStatus;
  readonly snapshotId?: string;
  readonly intentId?: string;
  readonly durationMs?: number;
}

/**
 * Factory function creating an immutable, deep-frozen ConversationTurn instance.
 *
 * @throws {ConversationValidationError} If any invariant check fails.
 */
export function createConversationTurn(
  params: CreateConversationTurnParams
): Readonly<ConversationTurn> {
  if (!params) {
    throw new ConversationValidationError({
      subCode: "NullTurnParams",
      message: "createConversationTurn parameters object cannot be null or undefined.",
    });
  }

  if (!params.turnId || typeof params.turnId !== "string" || params.turnId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidTurnId",
      message: "ConversationTurn requires a non-empty turnId string.",
    });
  }

  if (!params.conversationId || typeof params.conversationId !== "string" || params.conversationId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidConversationId",
      message: "ConversationTurn requires a non-empty conversationId string.",
    });
  }

  if (typeof params.turnIndex !== "number" || params.turnIndex < 1 || !Number.isInteger(params.turnIndex)) {
    throw new ConversationValidationError({
      subCode: "InvalidTurnIndex",
      message: `ConversationTurn turnIndex must be a positive integer >= 1. Received: ${params.turnIndex}`,
    });
  }

  const status = params.status ?? TurnStatus.TURN_CREATED;
  if (!Object.values(TurnStatus).includes(status)) {
    throw new ConversationValidationError({
      subCode: "InvalidTurnStatus",
      message: `Invalid TurnStatus provided: ${String(status)}`,
    });
  }

  const rawTurn: ConversationTurn = {
    turnId: params.turnId.trim(),
    conversationId: params.conversationId.trim(),
    turnIndex: params.turnIndex,
    userMessage: params.userMessage,
    assistantMessage: params.assistantMessage,
    toolMessages: params.toolMessages ? [...params.toolMessages] : undefined,
    status,
    snapshotId: params.snapshotId?.trim(),
    intentId: params.intentId?.trim(),
    timestamp: Date.now(),
    durationMs: params.durationMs,
  };

  return deepFreeze(rawTurn);
}

/**
 * Parameters passed to createContextSnapshot factory function.
 */
export interface CreateContextSnapshotParams {
  readonly snapshotId: string;
  readonly conversationId: string;
  readonly systemMessage: ConversationMessage;
  readonly activeMessages?: readonly ConversationMessage[];
  readonly totalTokenEstimate?: number;
  readonly trimmedCount?: number;
  readonly trimmingStrategy?: TrimmingStrategy;
}

/**
 * Factory function creating an immutable, deep-frozen ContextSnapshot instance.
 *
 * @throws {ConversationValidationError} If invariant validation fails.
 */
export function createContextSnapshot(
  params: CreateContextSnapshotParams
): Readonly<ContextSnapshot> {
  if (!params) {
    throw new ConversationValidationError({
      subCode: "NullContextSnapshotParams",
      message: "createContextSnapshot parameters object cannot be null or undefined.",
    });
  }

  if (!params.snapshotId || typeof params.snapshotId !== "string" || params.snapshotId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidSnapshotId",
      message: "ContextSnapshot requires a non-empty snapshotId string.",
    });
  }

  if (!params.systemMessage || params.systemMessage.role !== MessageRole.SYSTEM) {
    throw new ConversationValidationError({
      subCode: "InvalidSystemMessage",
      message: "ContextSnapshot requires a valid systemMessage with role === MessageRole.SYSTEM.",
    });
  }

  const totalTokenEstimate = params.totalTokenEstimate ?? 0;
  const trimmedCount = params.trimmedCount ?? 0;

  if (totalTokenEstimate < 0 || trimmedCount < 0) {
    throw new ConversationValidationError({
      subCode: "NegativeTokenMetrics",
      message: "ContextSnapshot totalTokenEstimate and trimmedCount must be non-negative.",
    });
  }

  const rawSnapshot: ContextSnapshot = {
    snapshotId: params.snapshotId.trim(),
    conversationId: params.conversationId.trim(),
    systemMessage: params.systemMessage,
    activeMessages: params.activeMessages ? [...params.activeMessages] : [],
    totalTokenEstimate,
    trimmedCount,
    trimmingStrategy: params.trimmingStrategy ?? TrimmingStrategy.SLIDING_WINDOW,
    timestamp: Date.now(),
  };

  return deepFreeze(rawSnapshot);
}

/**
 * Parameters passed to createConversationSession factory function.
 */
export interface CreateConversationSessionParams {
  readonly sessionId: string;
  readonly tenantId?: string;
  readonly activeConversationId: string;
  readonly conversationIds?: readonly string[];
  readonly maxConcurrentConversations?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable, deep-frozen ConversationSession instance.
 *
 * @throws {ConversationValidationError} If invariant validation fails.
 */
export function createConversationSession(
  params: CreateConversationSessionParams
): Readonly<ConversationSession> {
  if (!params) {
    throw new ConversationValidationError({
      subCode: "NullSessionParams",
      message: "createConversationSession parameters object cannot be null or undefined.",
    });
  }

  if (!params.sessionId || typeof params.sessionId !== "string" || params.sessionId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidSessionId",
      message: "ConversationSession requires a non-empty sessionId string.",
    });
  }

  if (!params.activeConversationId || typeof params.activeConversationId !== "string" || params.activeConversationId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidActiveConversationId",
      message: "ConversationSession requires a non-empty activeConversationId string.",
    });
  }

  const maxConcurrent = params.maxConcurrentConversations ?? 5;
  if (maxConcurrent < 1 || !Number.isInteger(maxConcurrent)) {
    throw new ConversationValidationError({
      subCode: "InvalidMaxConcurrent",
      message: `maxConcurrentConversations must be a positive integer. Received: ${maxConcurrent}`,
    });
  }

  const now = Date.now();
  const rawSession: ConversationSession = {
    sessionId: params.sessionId.trim(),
    tenantId: params.tenantId?.trim(),
    activeConversationId: params.activeConversationId.trim(),
    conversationIds: params.conversationIds ? [...params.conversationIds] : [params.activeConversationId.trim()],
    maxConcurrentConversations: maxConcurrent,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + 86400000, // Default 24h expiration window
    metadata: { ...(params.metadata ?? {}) },
  };

  return deepFreeze(rawSession);
}

/**
 * Parameters passed to createConversation factory function.
 */
export interface CreateConversationParams {
  readonly conversationId: string;
  readonly sessionId: string;
  readonly status?: ConversationStatus;
  readonly turns?: readonly ConversationTurn[];
  readonly totalTokensConsumed?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable, deep-frozen Conversation instance.
 *
 * @throws {ConversationValidationError} If invariant validation fails.
 */
export function createConversation(
  params: CreateConversationParams
): Readonly<Conversation> {
  if (!params) {
    throw new ConversationValidationError({
      subCode: "NullConversationParams",
      message: "createConversation parameters object cannot be null or undefined.",
    });
  }

  if (!params.conversationId || typeof params.conversationId !== "string" || params.conversationId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidConversationId",
      message: "Conversation requires a non-empty conversationId string.",
    });
  }

  if (!params.sessionId || typeof params.sessionId !== "string" || params.sessionId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "InvalidSessionId",
      message: "Conversation requires a non-empty sessionId string.",
    });
  }

  const status = params.status ?? ConversationStatus.CREATED;
  if (!Object.values(ConversationStatus).includes(status)) {
    throw new ConversationValidationError({
      subCode: "InvalidConversationStatus",
      message: `Invalid ConversationStatus provided: ${String(status)}`,
    });
  }

  const turns = params.turns ? [...params.turns] : [];
  const messageCount = turns.reduce((acc, turn) => {
    let count = 0;
    if (turn.userMessage) count++;
    if (turn.assistantMessage) count++;
    if (turn.toolMessages) count += turn.toolMessages.length;
    return acc + count;
  }, 0);

  const now = Date.now();
  const rawConversation: Conversation = {
    conversationId: params.conversationId.trim(),
    sessionId: params.sessionId.trim(),
    status,
    turns,
    messageCount,
    totalTokensConsumed: params.totalTokensConsumed ?? 0,
    createdAt: now,
    updatedAt: now,
    metadata: { ...(params.metadata ?? {}) },
  };

  return deepFreeze(rawConversation);
}
