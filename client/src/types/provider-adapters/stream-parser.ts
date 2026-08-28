/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 4 Component: SSE Stream Parser (`stream-parser.ts`)
 *
 * @file stream-parser.ts
 * @description Provider-independent Server-Sent Events (SSE) stream parser converting
 * incoming stream text lines into canonical StreamingChunk domain contracts.
 *
 * @module @aether/provider-adapters/stream-parser
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 4
 */

import type { StreamingChunk, StreamingFinishReason } from "../../runtime/streaming/streaming-contracts";
import type { ToolCallDescriptor } from "./message-types";

/**
 * Normalizes raw string finish reason to canonical StreamingFinishReason.
 */
function normalizeStreamingFinishReason(rawReason?: string): StreamingFinishReason | undefined {
  if (!rawReason) return undefined;
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
    case "cancelled":
      return "cancelled";
    default:
      return "stop";
  }
}

/**
 * Parses a single raw SSE line or JSON string into a canonical StreamingChunk object.
 *
 * @param line Raw line string from SSE stream.
 * @param requestId Request ID associated with stream.
 * @param index Sequential chunk index.
 * @returns StreamingChunk instance or null if line is empty or stream terminator.
 */
export function parseSSELine(
  line: string,
  requestId: string,
  index: number
): StreamingChunk | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed === "data: [DONE]") {
    return null;
  }

  const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6).trim() : trimmed;
  if (!jsonStr || jsonStr === "[DONE]") {
    return null;
  }

  try {
    const payload = JSON.parse(jsonStr);

    let deltaContent: string | undefined;
    let deltaReasoning: string | undefined;
    let deltaToolCall: ToolCallDescriptor | undefined;
    let finishReason: StreamingFinishReason | undefined;

    // OpenAI / Groq / NVIDIA LPU structure: choices[0].delta
    if (Array.isArray(payload.choices) && payload.choices.length > 0) {
      const choice = payload.choices[0];
      finishReason = normalizeStreamingFinishReason(choice.finish_reason);

      if (choice.delta) {
        deltaContent = choice.delta.content || undefined;
        deltaReasoning = choice.delta.reasoning_content || choice.delta.reasoning || undefined;

        if (Array.isArray(choice.delta.tool_calls) && choice.delta.tool_calls.length > 0) {
          const rawTc = choice.delta.tool_calls[0];
          const fn = rawTc.function || {};
          let args = fn.arguments || "";
          if (typeof args === "string") {
            try {
              args = JSON.parse(args);
            } catch {
              // keep as string if partial
            }
          }
          deltaToolCall = {
            id: rawTc.id || `tc_${index}`,
            type: "function",
            name: fn.name || "unknown_tool",
            arguments: args,
          };
        }
      }
    } else if (payload.response || payload.message) {
      // Ollama streaming format: { response: "text", done: false }
      deltaContent = payload.response || (payload.message?.content ?? undefined);
      if (payload.done) {
        finishReason = "stop";
      }
    }

    if (!deltaContent && !deltaReasoning && !deltaToolCall && !finishReason) {
      return null;
    }

    return Object.freeze({
      chunkId: `chk_${requestId}_${index}`,
      requestId,
      index,
      deltaContent,
      deltaReasoning,
      deltaToolCall,
      finishReason,
      timestamp: Date.now(),
    });
  } catch {
    // If raw non-JSON text line
    return Object.freeze({
      chunkId: `chk_${requestId}_${index}`,
      requestId,
      index,
      deltaContent: jsonStr,
      timestamp: Date.now(),
    });
  }
}

/**
 * Async generator yielding StreamingChunk objects from a ReadableStream of Uint8Array chunks.
 *
 * @param stream Standard ReadableStream or AsyncIterable of byte/text chunks.
 * @param requestId Request ID associated with stream.
 */
export async function* parseSSEStream(
  stream: AsyncIterable<Uint8Array | string> | ReadableStream<Uint8Array> | Iterable<Uint8Array | string>,
  requestId: string
): AsyncGenerator<StreamingChunk, void, unknown> {
  let index = 0;
  let buffer = "";

  const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;

  const asyncIterable: AsyncIterable<Uint8Array | string> =
    Symbol.asyncIterator in (stream as any)
      ? (stream as AsyncIterable<Uint8Array | string>)
      : Symbol.iterator in (stream as any)
      ? {
          async *[Symbol.asyncIterator]() {
            for (const item of stream as Iterable<Uint8Array | string>) {
              yield item;
            }
          },
        }
      : {
          async *[Symbol.asyncIterator]() {
            const reader = (stream as ReadableStream<Uint8Array>).getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) yield value;
              }
            } finally {
              reader.releaseLock();
            }
          },
        };

  for await (const rawChunk of asyncIterable) {
    const textChunk =
      typeof rawChunk === "string"
        ? rawChunk
        : decoder
        ? decoder.decode(rawChunk, { stream: true })
        : String(rawChunk);

    buffer += textChunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // keep incomplete line in buffer

    for (const line of lines) {
      const parsedChunk = parseSSELine(line, requestId, index);
      if (parsedChunk) {
        index++;
        yield parsedChunk;
      }
    }
  }

  if (buffer.trim()) {
    const parsedChunk = parseSSELine(buffer, requestId, index);
    if (parsedChunk) {
      yield parsedChunk;
    }
  }
}
