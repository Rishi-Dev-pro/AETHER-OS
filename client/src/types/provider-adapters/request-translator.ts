/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: Request Translator (`request-translator.ts`)
 *
 * @file request-translator.ts
 * @description Provider-independent AI request translation utility. Normalizes conversation messages,
 * system instructions, and request parameters into canonical, deeply frozen TranslationRequest contracts.
 *
 * @module @aether/provider-adapters/request-translator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type {
  TranslationRequest,
  ConversationContext,
  ConversationMessage,
  SystemMessage,
} from "./message-types";
import { RequestTranslationError } from "./translation-errors";
import { validateTranslationRequest } from "./payload-validator";
import { deepFreeze } from "./factories";

/**
 * Normalizes system instructions into a leading SystemMessage if systemInstruction is provided.
 *
 * @param context Input conversation context.
 * @param systemInstruction Optional system prompt override string.
 * @returns Normalized array of ConversationMessages.
 */
export function normalizeMessageSequence(
  context: ConversationContext,
  systemInstruction?: string
): ReadonlyArray<ConversationMessage> {
  const existingMessages = [...context.messages];

  if (systemInstruction && systemInstruction.trim() !== "") {
    const cleanInstruction = systemInstruction.trim();

    // If first message is already a system message, update its content if needed, or prepend new SystemMessage
    if (existingMessages.length > 0 && existingMessages[0].role === "system") {
      const firstSys = existingMessages[0] as SystemMessage;
      if (firstSys.content !== cleanInstruction) {
        existingMessages[0] = {
          ...firstSys,
          content: cleanInstruction,
        };
      }
    } else {
      const newSysMessage: SystemMessage = {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: "system",
        content: cleanInstruction,
        timestamp: Date.now(),
      };
      existingMessages.unshift(newSysMessage);
    }
  }

  return deepFreeze(existingMessages);
}

/**
 * Translates and normalizes input parameters into a provider-neutral, deeply frozen TranslationRequest contract.
 *
 * @param input Request translation parameters.
 * @returns Deeply frozen TranslationRequest contract instance.
 * @throws RequestTranslationError if translation or validation fails.
 */
export function translateRequest(
  input: Partial<TranslationRequest>
): Readonly<TranslationRequest> {
  if (!input) {
    throw new RequestTranslationError("Request translation input cannot be null or undefined.");
  }

  const requestId = input.requestId?.trim() || `req-trans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const modelId = input.modelId?.trim();

  if (!modelId) {
    throw new RequestTranslationError("Request translation requires a non-empty modelId.");
  }

  if (!input.context) {
    throw new RequestTranslationError("Request translation requires a valid conversation context.");
  }

  const normalizedMessages = normalizeMessageSequence(input.context, input.systemInstruction);

  const normalizedContext: ConversationContext = {
    conversationId: input.context.conversationId.trim(),
    messages: normalizedMessages,
    metadata: input.context.metadata ?? {},
  };

  const translatedRequest: TranslationRequest = {
    requestId,
    modelId,
    context: normalizedContext,
    systemInstruction: input.systemInstruction?.trim(),
    temperature: input.temperature,
    topP: input.topP,
    maxTokens: input.maxTokens,
    stopSequences: input.stopSequences ? [...input.stopSequences] : undefined,
    responseFormat: input.responseFormat ?? "text",
    tools: input.tools ? [...input.tools] : undefined,
    metadata: input.metadata ?? {},
  };

  try {
    validateTranslationRequest(translatedRequest);
  } catch (err) {
    throw new RequestTranslationError(`Translated request validation failed: ${(err as Error).message}`);
  }

  return deepFreeze(translatedRequest);
}
