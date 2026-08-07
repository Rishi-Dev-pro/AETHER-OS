/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation Errors (`conversation-errors.ts`)
 *
 * @file conversation-errors.ts
 * @description Strongly-typed error hierarchy for conversation state, history, queue, events, and coordinator execution.
 *
 * @module @aether/runtime/conversation/conversation-errors
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import { RuntimeIntegrationError } from "../runtime-errors";

/**
 * Base exception for Conversation Domain errors.
 */
export class ConversationRuntimeError extends RuntimeIntegrationError {
  constructor(message: string, code: string = "ERR_CONVERSATION_RUNTIME", metadata: Record<string, unknown> = {}) {
    super(message, code, metadata);
  }
}

/**
 * Thrown when illegal state operations occur on conversation state.
 */
export class ConversationStateError extends ConversationRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CONVERSATION_STATE", metadata);
  }
}

/**
 * Thrown when history operations or import/export parsing fails.
 */
export class ConversationHistoryError extends ConversationRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_CONVERSATION_HISTORY", metadata);
  }
}

/**
 * Thrown when AI request execution fails inside ExecutionCoordinator.
 */
export class ExecutionCoordinatorError extends ConversationRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_COORDINATOR", metadata);
  }
}

/**
 * Thrown when execution queue operations, timeouts, or cancellations fail.
 */
export class ExecutionQueueError extends ConversationRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_EXECUTION_QUEUE", metadata);
  }
}

/**
 * Thrown when event emission or subscription rules are violated.
 */
export class RuntimeEventError extends ConversationRuntimeError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, "ERR_RUNTIME_EVENT", metadata);
  }
}
