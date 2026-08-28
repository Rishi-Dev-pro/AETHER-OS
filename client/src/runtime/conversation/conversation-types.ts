/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation Domain Types (`conversation-types.ts`)
 *
 * @file conversation-types.ts
 * @description Strongly-typed contracts for conversation state, history, execution results, queue items, and runtime events.
 *
 * @module @aether/runtime/conversation/conversation-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type { TranslationResponse, TranslationRequest } from "../../types/provider-adapters/message-types";

/**
 * Standard conversation roles.
 */
export type ConversationRole = "system" | "user" | "assistant";

/**
 * Canonical conversation message representation.
 */
export interface ConversationMessage {
  readonly id: string;
  readonly role: ConversationRole;
  readonly content: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Status of an execution turn.
 */
export type TurnStatus = "PENDING" | "COMPLETED" | "FAILED";

/**
 * Canonical conversation turn pairing user message with assistant response.
 */
export interface ConversationTurn {
  readonly turnId: string;
  readonly userMessage: ConversationMessage;
  readonly assistantMessage?: ConversationMessage;
  readonly status: TurnStatus;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly timestamp: number;
  readonly error?: string;
}

/**
 * Immutable snapshot of conversation state.
 */
export interface ConversationStateSnapshot {
  readonly conversationId: string;
  readonly systemPrompt: string;
  readonly activeProvider: string;
  readonly activeModel: string;
  readonly messages: ReadonlyArray<ConversationMessage>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Export container for conversation data.
 */
export interface ConversationExport {
  readonly version: string;
  readonly state: ConversationStateSnapshot;
  readonly turns: ReadonlyArray<ConversationTurn>;
  readonly exportedAt: number;
}

/**
 * Result returned by ExecutionCoordinator upon completing an AI request.
 */
export interface ExecutionResult {
  readonly executionId: string;
  readonly conversationId: string;
  readonly response: TranslationResponse;
  readonly turn: ConversationTurn;
  readonly durationMs: number;
  readonly timestamp: number;
}

/**
 * Queue item status.
 */
export type QueueItemStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "CANCELLED" | "FAILED";

/**
 * Item snapshot in execution queue.
 */
export interface QueueItem {
  readonly id: string;
  readonly prompt: string;
  readonly providerId: string;
  readonly modelId?: string;
  readonly status: QueueItemStatus;
  readonly enqueuedAt: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
  readonly error?: string;
}

/**
 * Runtime Event Discriminated Union
 */
import type { StreamingChunk, StreamingProgress, StreamingResponse } from "../streaming/streaming-contracts";

export type RuntimeEventType =
  | "ExecutionStarted"
  | "ProviderSelected"
  | "RequestDispatched"
  | "ResponseReceived"
  | "ConversationUpdated"
  | "ExecutionCompleted"
  | "ExecutionFailed"
  | "ExecutionStreamStarted"
  | "ExecutionChunkReceived"
  | "ExecutionChunkRendered"
  | "ExecutionStreamCompleted"
  | "ExecutionStreamCancelled"
  | "ExecutionStreamFailed"
  | "ExecutionStreamTimeout"
  | "SessionCreated"
  | "SessionSwitched"
  | "SessionDeleted"
  | "SessionRenamed"
  | "ContextPruned";

export interface BaseRuntimeEvent {
  readonly eventId: string;
  readonly type: RuntimeEventType;
  readonly conversationId: string;
  readonly timestamp: number;
}

export interface ExecutionStartedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStarted";
  readonly executionId: string;
  readonly prompt: string;
}

export interface ProviderSelectedEvent extends BaseRuntimeEvent {
  readonly type: "ProviderSelected";
  readonly executionId: string;
  readonly providerId: string;
  readonly modelId?: string;
}

export interface RequestDispatchedEvent extends BaseRuntimeEvent {
  readonly type: "RequestDispatched";
  readonly executionId: string;
  readonly request: TranslationRequest;
}

export interface ResponseReceivedEvent extends BaseRuntimeEvent {
  readonly type: "ResponseReceived";
  readonly executionId: string;
  readonly response: TranslationResponse;
}

export interface ConversationUpdatedEvent extends BaseRuntimeEvent {
  readonly type: "ConversationUpdated";
  readonly message: ConversationMessage;
  readonly totalMessages: number;
}

export interface ExecutionCompletedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionCompleted";
  readonly executionId: string;
  readonly result: ExecutionResult;
}

export interface ExecutionFailedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionFailed";
  readonly executionId: string;
  readonly error: string;
}

export interface ExecutionStreamStartedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStreamStarted";
  readonly executionId: string;
  readonly providerId: string;
  readonly modelId: string;
}

export interface ExecutionChunkReceivedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionChunkReceived";
  readonly executionId: string;
  readonly chunk: StreamingChunk;
}

export interface ExecutionChunkRenderedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionChunkRendered";
  readonly executionId: string;
  readonly currentContent: string;
  readonly progress: StreamingProgress;
}

export interface ExecutionStreamCompletedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStreamCompleted";
  readonly executionId: string;
  readonly response: StreamingResponse;
}

export interface ExecutionStreamCancelledEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStreamCancelled";
  readonly executionId: string;
  readonly reason: string;
}

export interface ExecutionStreamFailedEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStreamFailed";
  readonly executionId: string;
  readonly error: string;
}

export interface ExecutionStreamTimeoutEvent extends BaseRuntimeEvent {
  readonly type: "ExecutionStreamTimeout";
  readonly executionId: string;
  readonly timeoutMs: number;
}

export interface SessionCreatedEvent extends BaseRuntimeEvent {
  readonly type: "SessionCreated";
  readonly sessionId: string;
  readonly title: string;
}

export interface SessionSwitchedEvent extends BaseRuntimeEvent {
  readonly type: "SessionSwitched";
  readonly previousSessionId: string;
  readonly currentSessionId: string;
}

export interface SessionDeletedEvent extends BaseRuntimeEvent {
  readonly type: "SessionDeleted";
  readonly sessionId: string;
}

export interface SessionRenamedEvent extends BaseRuntimeEvent {
  readonly type: "SessionRenamed";
  readonly sessionId: string;
  readonly newTitle: string;
}

export interface ContextPrunedEvent extends BaseRuntimeEvent {
  readonly type: "ContextPruned";
  readonly originalMessageCount: number;
  readonly prunedMessageCount: number;
  readonly estimatedTokens: number;
}

export type RuntimeEvent =
  | ExecutionStartedEvent
  | ProviderSelectedEvent
  | RequestDispatchedEvent
  | ResponseReceivedEvent
  | ConversationUpdatedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionStreamStartedEvent
  | ExecutionChunkReceivedEvent
  | ExecutionChunkRenderedEvent
  | ExecutionStreamCompletedEvent
  | ExecutionStreamCancelledEvent
  | ExecutionStreamFailedEvent
  | ExecutionStreamTimeoutEvent
  | SessionCreatedEvent
  | SessionSwitchedEvent
  | SessionDeletedEvent
  | SessionRenamedEvent
  | ContextPrunedEvent;


/**
 * Secret-free runtime diagnostics metrics snapshot.
 */
export interface RuntimeDiagnosticsMetricsSnapshot {
  readonly activeProvider: string;
  readonly activeModel: string;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageLatencyMs: number;
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly estimatedTotalCostUSD: number;
  readonly conversationMessageCount: number;
  readonly timestamp: number;
}
