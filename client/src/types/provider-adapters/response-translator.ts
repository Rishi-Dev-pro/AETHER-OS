/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: Response Translator (`response-translator.ts`)
 *
 * @file response-translator.ts
 * @description Provider-independent AI response normalization engine. Converts raw adapter outputs into
 * canonical, deeply frozen TranslationResponse contracts.
 *
 * @module @aether/provider-adapters/response-translator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type { TranslationResponse, AssistantMessage } from "./message-types";
import { ResponseTranslationError } from "./translation-errors";
import { deepFreeze, createUsageStatistics } from "./factories";
import { validateConversationMessage } from "./payload-validator";

/**
 * Translates raw adapter output attributes into a provider-neutral, deeply frozen TranslationResponse contract.
 *
 * @param input Translation response attributes.
 * @returns Deeply frozen TranslationResponse contract instance.
 * @throws ResponseTranslationError if output validation fails.
 */
export function translateResponse(
  input: Partial<TranslationResponse>
): Readonly<TranslationResponse> {
  if (!input) {
    throw new ResponseTranslationError("Response translation input cannot be null or undefined.");
  }

  if (!input.responseId || typeof input.responseId !== "string" || input.responseId.trim() === "") {
    throw new ResponseTranslationError("Response translation requires a non-empty responseId.");
  }

  if (!input.requestId || typeof input.requestId !== "string" || input.requestId.trim() === "") {
    throw new ResponseTranslationError("Response translation requires a non-empty requestId.");
  }

  if (!input.modelId || typeof input.modelId !== "string" || input.modelId.trim() === "") {
    throw new ResponseTranslationError("Response translation requires a non-empty modelId.");
  }

  if (!input.message) {
    throw new ResponseTranslationError("Response translation requires a valid assistant message.");
  }

  try {
    validateConversationMessage(input.message);
  } catch (err) {
    throw new ResponseTranslationError(`Response assistant message validation failed: ${(err as Error).message}`);
  }

  const validFinishReasons = ["stop", "length", "tool_calls", "content_filter", "error"];
  const finishReason = input.finishReason ?? "stop";
  if (!validFinishReasons.includes(finishReason)) {
    throw new ResponseTranslationError(`Invalid finishReason '${finishReason}'. Valid reasons: ${validFinishReasons.join(", ")}`);
  }

  const usage = createUsageStatistics(input.usage ?? {});

  const translatedResponse: TranslationResponse = {
    responseId: input.responseId.trim(),
    requestId: input.requestId.trim(),
    modelId: input.modelId.trim(),
    message: input.message as AssistantMessage,
    finishReason: finishReason as any,
    usage,
    timestamp: input.timestamp ?? Date.now(),
    rawResponseMetadata: input.rawResponseMetadata ?? {},
  };

  return deepFreeze(translatedResponse);
}
