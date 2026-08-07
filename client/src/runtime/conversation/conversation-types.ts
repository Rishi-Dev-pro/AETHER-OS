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
export type RuntimeEventType =
  | "ExecutionStarted"
  | "ProviderSelected"
  | "RequestDispatched"
  | "ResponseReceived"
  | "ConversationUpdated"
  | "ExecutionCompleted"
  | "ExecutionFailed";

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

export type RuntimeEvent =
  | ExecutionStartedEvent
  | ProviderSelectedEvent
  | RequestDispatchedEvent
  | ResponseReceivedEvent
  | ConversationUpdatedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent;

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
