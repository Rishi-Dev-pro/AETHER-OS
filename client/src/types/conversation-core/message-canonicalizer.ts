/**
 * AETHER OS — Phase 9.5 Conversation Core
 * Component 3: Message Canonicalizer (`message-canonicalizer.ts`)
 *
 * @file message-canonicalizer.ts
 * @description Pure canonicalizer normalizing raw text, assistant outputs, tool call responses,
 * and system directives into immutable, deep-frozen ConversationMessage contracts.
 *
 * @module @aether/conversation-core/message-canonicalizer
 * @version 1.0.0
 * @status EDD COMPLIANT — MILESTONE 1
 */

import { PayloadSensitivity } from "../ai-runtime/security";
import type { ToolCallDescriptor } from "../ai-runtime/types";
import {
  MessageRole,
  type ConversationMessage,
  createConversationMessage,
} from "./types";
import { ConversationValidationError } from "./errors";


// ============================================================================
// 1. SANITIZATION UTILITIES
// ============================================================================

/**
 * Sanitizes raw message text by stripping control characters and dangerous raw tokens.
 *
 * @param text - Raw input message text.
 * @returns Cleaned, sanitized text string.
 */
export function sanitizeMessageText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  // Strip null bytes and non-printable control characters (except newlines, tabs, carriage returns)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}


// ============================================================================
// 2. HELPER ID GENERATOR (DETERMINISTIC SUFFIX)
// ============================================================================

let messageIdCounter = 0;

/**
 * Generates a unique, structured message ID for canonical message creation.
 * Format: "msg_" + timestamp + "_" + counter
 */
export function generateMessageId(): string {
  messageIdCounter = (messageIdCounter + 1) % 100000;
  return `msg_${Date.now()}_${messageIdCounter}`;
}


// ============================================================================
// 3. CANONICAL CREATION FACTORIES BY ROLE
// ============================================================================

/**
 * Creates an immutable SYSTEM role message.
 * Used for core OS instructions and safety policies.
 */
export function createSystemMessage(
  conversationId: string,
  text: string,
  metadata?: Record<string, unknown>
): Readonly<ConversationMessage> {
  const sanitizedText = sanitizeMessageText(text);
  if (sanitizedText.trim() === "") {
    throw new ConversationValidationError({
      subCode: "EmptySystemMessage",
      message: "SYSTEM message requires a non-empty instruction string.",
    });
  }

  return createConversationMessage({
    messageId: generateMessageId(),
    conversationId,
    role: MessageRole.SYSTEM,
    text: sanitizedText,
    sensitivity: PayloadSensitivity.INTERNAL,
    metadata,
  });
}

/**
 * Creates an immutable USER role message.
 * Used for user prompt inputs or command requests.
 */
export function createUserMessage(
  conversationId: string,
  text: string,
  metadata?: Record<string, unknown>
): Readonly<ConversationMessage> {
  const sanitizedText = sanitizeMessageText(text);
  if (sanitizedText.trim() === "") {
    throw new ConversationValidationError({
      subCode: "EmptyUserMessage",
      message: "USER message requires a non-empty text string.",
    });
  }

  return createConversationMessage({
    messageId: generateMessageId(),
    conversationId,
    role: MessageRole.USER,
    text: sanitizedText,
    sensitivity: PayloadSensitivity.CONFIDENTIAL,
    metadata,
  });
}

/**
 * Creates an immutable ASSISTANT role message.
 * Used for completion output text and/or tool call execution requests.
 */
export function createAssistantMessage(
  conversationId: string,
  text: string,
  toolCalls?: readonly ToolCallDescriptor[],
  metadata?: Record<string, unknown>
): Readonly<ConversationMessage> {
  const sanitizedText = sanitizeMessageText(text);

  // An ASSISTANT message must contain either non-empty text or at least one tool call
  if (sanitizedText.trim() === "" && (!toolCalls || toolCalls.length === 0)) {
    throw new ConversationValidationError({
      subCode: "EmptyAssistantMessage",
      message: "ASSISTANT message must contain either non-empty text or at least one toolCall descriptor.",
    });
  }

  return createConversationMessage({
    messageId: generateMessageId(),
    conversationId,
    role: MessageRole.ASSISTANT,
    text: sanitizedText,
    toolCalls,
    sensitivity: PayloadSensitivity.CONFIDENTIAL,
    metadata,
  });
}

/**
 * Creates an immutable TOOL role response message.
 * Used to pass tool execution output back into the conversation history.
 */
export function createToolResponseMessage(
  conversationId: string,
  toolCallId: string,
  text: string,
  metadata?: Record<string, unknown>
): Readonly<ConversationMessage> {
  if (!toolCallId || toolCallId.trim() === "") {
    throw new ConversationValidationError({
      subCode: "MissingToolCallId",
      message: "TOOL response message requires a non-empty toolCallId matching the requested tool.",
    });
  }

  const sanitizedText = sanitizeMessageText(text);

  return createConversationMessage({
    messageId: generateMessageId(),
    conversationId,
    role: MessageRole.TOOL,
    text: sanitizedText,
    toolCallId: toolCallId.trim(),
    sensitivity: PayloadSensitivity.CONFIDENTIAL,
    metadata,
  });
}

/**
 * Creates an immutable DEVELOPER role message.
 * Used for dynamic developer directives or system prompt overrides.
 */
export function createDeveloperMessage(
  conversationId: string,
  text: string,
  metadata?: Record<string, unknown>
): Readonly<ConversationMessage> {
  const sanitizedText = sanitizeMessageText(text);
  if (sanitizedText.trim() === "") {
    throw new ConversationValidationError({
      subCode: "EmptyDeveloperMessage",
      message: "DEVELOPER message requires a non-empty instruction string.",
    });
  }

  return createConversationMessage({
    messageId: generateMessageId(),
    conversationId,
    role: MessageRole.DEVELOPER,
    text: sanitizedText,
    sensitivity: PayloadSensitivity.INTERNAL,
    metadata,
  });
}
