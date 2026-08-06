/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 5 Component: Provider Payload Serializer (`provider-serializer.ts`)
 *
 * @file provider-serializer.ts
 * @description Isolated request serializers converting canonical TranslationRequest contracts into
 * provider wire payloads for OpenAI-compatible APIs (OpenAI, Groq, NVIDIA) and Ollama APIs.
 *
 * @module @aether/provider-adapters/provider-serializer
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import type { TranslationRequest, ConversationMessage } from "./message-types";
import { deepFreeze } from "./factories";

/**
 * Converts a canonical ConversationMessage into OpenAI chat message wire format.
 */
function serializeOpenAIMessage(msg: ConversationMessage): Record<string, unknown> {
  switch (msg.role) {
    case "system":
      return { role: "system", content: msg.content };

    case "user":
      return {
        role: "user",
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {}),
      };

    case "assistant": {
      const payload: Record<string, unknown> = { role: "assistant" };
      if (msg.content) payload["content"] = msg.content;
      if (msg.reasoningContent) payload["reasoning_content"] = msg.reasoningContent;
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        payload["tool_calls"] = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
          },
        }));
      }
      return payload;
    }

    case "tool":
      return {
        role: "tool",
        tool_call_id: msg.toolCallId,
        name: msg.name,
        content: msg.content,
      };
  }
}

/**
 * Serializes a canonical TranslationRequest into OpenAI-compatible chat completion JSON payload.
 *
 * @param request Canonical TranslationRequest.
 * @returns Deeply frozen OpenAI-compatible request payload object.
 */
export function serializeOpenAIFormat(request: TranslationRequest): Readonly<Record<string, unknown>> {
  const messages = request.context.messages.map(serializeOpenAIMessage);

  const payload: Record<string, unknown> = {
    model: request.modelId,
    messages,
  };

  if (request.temperature !== undefined) payload["temperature"] = request.temperature;
  if (request.topP !== undefined) payload["top_p"] = request.topP;
  if (request.maxTokens !== undefined) payload["max_tokens"] = request.maxTokens;
  if (request.stopSequences && request.stopSequences.length > 0) payload["stop"] = [...request.stopSequences];

  if (request.responseFormat === "json_object") {
    payload["response_format"] = { type: "json_object" };
  }

  if (request.tools && request.tools.length > 0) {
    payload["tools"] = [...request.tools];
  }

  return deepFreeze(payload);
}

/**
 * Serializes a canonical TranslationRequest into Ollama chat completion JSON payload.
 *
 * @param request Canonical TranslationRequest.
 * @returns Deeply frozen Ollama request payload object.
 */
export function serializeOllamaFormat(request: TranslationRequest): Readonly<Record<string, unknown>> {
  const messages = request.context.messages.map((msg) => ({
    role: msg.role,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));

  const options: Record<string, unknown> = {};
  if (request.temperature !== undefined) options["temperature"] = request.temperature;
  if (request.topP !== undefined) options["top_p"] = request.topP;
  if (request.maxTokens !== undefined) options["num_predict"] = request.maxTokens;
  if (request.stopSequences && request.stopSequences.length > 0) options["stop"] = [...request.stopSequences];

  const payload: Record<string, unknown> = {
    model: request.modelId,
    messages,
    stream: false,
    options,
  };

  return deepFreeze(payload);
}
