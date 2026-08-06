/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Provider Response Parser (`provider-response-parser.ts`)
 *
 * @file provider-response-parser.ts
 * @description Isolated response parsers converting provider JSON outputs back into canonical TranslationResponse contracts.
 *
 * @module @aether/provider-adapters/provider-response-parser
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import type { TranslationResponse, AssistantMessage, ToolCallDescriptor } from "./message-types";
import { ResponseTranslationError } from "./translation-errors";
import { translateResponse } from "./response-translator";
import { calculateUsage } from "./usage-calculator";

/**
 * Maps raw finish_reason string to canonical finish reason.
 */
function normalizeFinishReason(rawReason?: string): "stop" | "length" | "tool_calls" | "content_filter" | "error" {
  if (!rawReason) return "stop";
  switch (rawReason.toLowerCase()) {
    case "stop":
      return "stop";
    case "length":
    case "max_tokens":
      return "length";
    case "tool_calls":
    case "function_call":
      return "tool_calls";
    case "content_filter":
      return "content_filter";
    default:
      return "stop";
  }
}

/**
 * Parses raw OpenAI-compatible response JSON into a canonical TranslationResponse contract.
 *
 * @param json Raw provider response JSON object.
 * @param requestId Canonical request ID.
 * @param modelId Target model ID.
 * @returns Deeply frozen TranslationResponse instance.
 */
export function parseOpenAIResponse(
  json: Record<string, unknown>,
  requestId: string,
  modelId: string
): Readonly<TranslationResponse> {
  if (!json || typeof json !== "object") {
    throw new ResponseTranslationError("OpenAI response payload must be a non-null object.");
  }

  const choices = json["choices"] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ResponseTranslationError("OpenAI response payload contains no choices.");
  }

  const choice0 = choices[0];
  const msgObj = choice0["message"] as Record<string, unknown> | undefined;
  if (!msgObj) {
    throw new ResponseTranslationError("OpenAI choice 0 contains no message payload.");
  }

  const responseTimestamp =
    typeof json["created"] === "number"
      ? json["created"] * 1000
      : typeof json["timestamp"] === "number"
      ? json["timestamp"]
      : 1677652288000;

  const responseId = (json["id"] as string) || `resp-${requestId}`;

  const rawToolCalls = msgObj["tool_calls"] as Array<Record<string, unknown>> | undefined;
  let toolCalls: ToolCallDescriptor[] | undefined;

  if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
    toolCalls = rawToolCalls.map((tc, idx) => {
      const fn = (tc["function"] as Record<string, unknown>) ?? {};
      let parsedArgs: Record<string, unknown> | string = (fn["arguments"] as string) ?? "";
      if (typeof parsedArgs === "string") {
        try {
          parsedArgs = JSON.parse(parsedArgs);
        } catch {
          // keep as string if unparseable
        }
      }
      return {
        id: (tc["id"] as string) || `call-${idx}`,
        type: "function" as const,
        name: (fn["name"] as string) || "unknown_tool",
        arguments: parsedArgs,
      };
    });
  }

  const assistantMessage: AssistantMessage = {
    id: responseId,
    role: "assistant",
    content: (msgObj["content"] as string) ?? undefined,
    reasoningContent: (msgObj["reasoning_content"] as string) ?? undefined,
    toolCalls,
    timestamp: responseTimestamp,
  };

  const rawFinish = choice0["finish_reason"] as string | undefined;
  const finishReason = normalizeFinishReason(rawFinish);

  const usageObj = (json["usage"] as Record<string, unknown>) ?? {};
  const promptTokens = (usageObj["prompt_tokens"] as number) ?? 0;
  const completionTokens = (usageObj["completion_tokens"] as number) ?? 0;
  const usage = calculateUsage(promptTokens, completionTokens);

  return translateResponse({
    responseId,
    requestId,
    modelId: (json["model"] as string) || modelId,
    message: assistantMessage,
    finishReason,
    usage,
    timestamp: responseTimestamp,
    rawResponseMetadata: {
      system_fingerprint: json["system_fingerprint"],
      object: json["object"],
    },
  });
}

/**
 * Parses raw Ollama chat response JSON into a canonical TranslationResponse contract.
 *
 * @param json Raw provider response JSON object.
 * @param requestId Canonical request ID.
 * @param modelId Target model ID.
 * @returns Deeply frozen TranslationResponse instance.
 */
export function parseOllamaResponse(
  json: Record<string, unknown>,
  requestId: string,
  modelId: string
): Readonly<TranslationResponse> {
  if (!json || typeof json !== "object") {
    throw new ResponseTranslationError("Ollama response payload must be a non-null object.");
  }

  const msgObj = json["message"] as Record<string, unknown> | undefined;
  if (!msgObj) {
    throw new ResponseTranslationError("Ollama response payload contains no message.");
  }

  const responseTimestamp =
    typeof json["timestamp"] === "number" ? json["timestamp"] : 1677652288000;

  const responseId = (json["id"] as string) || `resp-ollama-${requestId}`;

  const assistantMessage: AssistantMessage = {
    id: `msg-${responseId}`,
    role: "assistant",
    content: (msgObj["content"] as string) ?? "",
    timestamp: responseTimestamp,
  };

  const promptTokens = (json["prompt_eval_count"] as number) ?? 0;
  const completionTokens = (json["eval_count"] as number) ?? 0;
  const usage = calculateUsage(promptTokens, completionTokens);

  return translateResponse({
    responseId,
    requestId,
    modelId: (json["model"] as string) || modelId,
    message: assistantMessage,
    finishReason: json["done"] ? "stop" : "length",
    usage,
    timestamp: responseTimestamp,
    rawResponseMetadata: {
      done_reason: json["done_reason"],
      total_duration: json["total_duration"],
    },
  });
}
