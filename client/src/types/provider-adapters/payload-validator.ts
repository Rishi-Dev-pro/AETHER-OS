/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: Payload Validator (`payload-validator.ts`)
 *
 * @file payload-validator.ts
 * @description Deterministic payload validation engine. Enforces message role structural constraints,
 * conversation sequence ordering, identifier uniqueness, content presence, and request parameter bounds.
 *
 * @module @aether/provider-adapters/payload-validator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type { ConversationContext, TranslationRequest, ConversationMessage } from "./message-types";
import {
  InvalidMessageError,
  MalformedConversationError,
  InvalidPayloadError,
  UnsupportedContentError,
} from "./translation-errors";

/**
 * Validates a single conversation message structure and role constraints.
 *
 * @param message Target message.
 * @throws InvalidMessageError or UnsupportedContentError on failure.
 */
export function validateConversationMessage(message: ConversationMessage): void {
  if (!message || typeof message !== "object") {
    throw new InvalidMessageError("Message object cannot be null or undefined.");
  }

  if (!message.id || typeof message.id !== "string" || message.id.trim() === "") {
    throw new InvalidMessageError("Message requires a non-empty string id.");
  }

  const validRoles = ["system", "user", "assistant", "tool"];
  if (!validRoles.includes(message.role)) {
    throw new InvalidMessageError(`Invalid message role '${(message as any).role}'. Valid roles: ${validRoles.join(", ")}`);
  }

  switch (message.role) {
    case "system":
      if (typeof message.content !== "string" || message.content.trim() === "") {
        throw new InvalidMessageError(`System message '${message.id}' requires non-empty string content.`);
      }
      break;

    case "user":
      if (!message.content) {
        throw new InvalidMessageError(`User message '${message.id}' requires non-empty content.`);
      }
      if (typeof message.content !== "string" && !Array.isArray(message.content)) {
        throw new UnsupportedContentError(`User message '${message.id}' content must be string or content array.`);
      }
      break;

    case "assistant":
      const hasContent = typeof message.content === "string" && message.content.trim() !== "";
      const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
      const hasReasoning = typeof message.reasoningContent === "string" && message.reasoningContent.trim() !== "";

      if (!hasContent && !hasToolCalls && !hasReasoning) {
        throw new InvalidMessageError(`Assistant message '${message.id}' must contain content, toolCalls, or reasoningContent.`);
      }

      if (hasToolCalls) {
        for (const tc of message.toolCalls!) {
          if (!tc.id || typeof tc.id !== "string" || tc.id.trim() === "") {
            throw new InvalidMessageError(`Tool call in assistant message '${message.id}' requires a non-empty id.`);
          }
          if (!tc.name || typeof tc.name !== "string" || tc.name.trim() === "") {
            throw new InvalidMessageError(`Tool call in assistant message '${message.id}' requires a non-empty name.`);
          }
        }
      }
      break;

    case "tool":
      if (!message.toolCallId || typeof message.toolCallId !== "string" || message.toolCallId.trim() === "") {
        throw new InvalidMessageError(`Tool message '${message.id}' requires a non-empty toolCallId.`);
      }
      if (!message.name || typeof message.name !== "string" || message.name.trim() === "") {
        throw new InvalidMessageError(`Tool message '${message.id}' requires a non-empty name string.`);
      }
      if (typeof message.content !== "string") {
        throw new InvalidMessageError(`Tool message '${message.id}' requires string content.`);
      }
      break;
  }
}

/**
 * Validates a complete ConversationContext container.
 *
 * @param context Target context.
 * @throws MalformedConversationError or InvalidMessageError on failure.
 */
export function validateConversationContext(context: ConversationContext): void {
  if (!context || typeof context !== "object") {
    throw new MalformedConversationError("ConversationContext cannot be null or undefined.");
  }

  if (!context.conversationId || typeof context.conversationId !== "string" || context.conversationId.trim() === "") {
    throw new MalformedConversationError("ConversationContext requires a non-empty conversationId.");
  }

  if (!Array.isArray(context.messages) || context.messages.length === 0) {
    throw new MalformedConversationError("ConversationContext requires at least one message.");
  }

  const seenIds = new Set<string>();
  let nonSystemEncountered = false;

  for (let i = 0; i < context.messages.length; i++) {
    const msg = context.messages[i];
    validateConversationMessage(msg);

    if (seenIds.has(msg.id)) {
      throw new MalformedConversationError(`Duplicate message id '${msg.id}' detected in conversation.`);
    }
    seenIds.add(msg.id);

    // Sequence check: system messages must come at the beginning of the message list
    if (msg.role === "system") {
      if (nonSystemEncountered) {
        throw new MalformedConversationError(
          `System message '${msg.id}' at index ${i} found after non-system message. System messages must lead the conversation.`
        );
      }
    } else {
      nonSystemEncountered = true;
    }
  }
}

/**
 * Validates a complete TranslationRequest payload.
 *
 * @param request Target translation request.
 * @throws InvalidPayloadError or MalformedConversationError on failure.
 */
export function validateTranslationRequest(request: TranslationRequest): void {
  if (!request || typeof request !== "object") {
    throw new InvalidPayloadError("TranslationRequest cannot be null or undefined.");
  }

  if (!request.requestId || typeof request.requestId !== "string" || request.requestId.trim() === "") {
    throw new InvalidPayloadError("TranslationRequest requires a non-empty requestId.");
  }

  if (!request.modelId || typeof request.modelId !== "string" || request.modelId.trim() === "") {
    throw new InvalidPayloadError("TranslationRequest requires a non-empty modelId.");
  }

  validateConversationContext(request.context);

  if (request.temperature !== undefined) {
    if (typeof request.temperature !== "number" || request.temperature < 0 || request.temperature > 2.0) {
      throw new InvalidPayloadError("TranslationRequest temperature must be a number between 0.0 and 2.0.");
    }
  }

  if (request.topP !== undefined) {
    if (typeof request.topP !== "number" || request.topP < 0 || request.topP > 1.0) {
      throw new InvalidPayloadError("TranslationRequest topP must be a number between 0.0 and 1.0.");
    }
  }

  if (request.maxTokens !== undefined) {
    if (typeof request.maxTokens !== "number" || request.maxTokens <= 0) {
      throw new InvalidPayloadError("TranslationRequest maxTokens must be a positive number.");
    }
  }
}
