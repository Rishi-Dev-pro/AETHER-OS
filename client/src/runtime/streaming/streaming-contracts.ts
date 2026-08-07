/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 4 Component: Streaming Domain Contracts (`streaming-contracts.ts`)
 *
 * @file streaming-contracts.ts
 * @description Strongly-typed, immutable contracts for incremental SSE stream chunks,
 * streaming responses, sessions, statuses, progress telemetry, and usage.
 *
 * @module @aether/runtime/streaming/streaming-contracts
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 4
 */

import type { ToolCallDescriptor } from "../../types/provider-adapters/message-types";

/**
 * Status of an active or completed streaming session.
 */
export type StreamingStatus =
  | "INITIALIZING"
  | "STREAMING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "TIMEOUT";

/**
 * Reasons why a stream completed or terminated.
 */
export type StreamingFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "error"
  | "cancelled";

/**
 * Incremental chunk payload received from an SSE stream.
 */
export interface StreamingChunk {
  readonly chunkId: string;
  readonly requestId: string;
  readonly index: number;
  readonly deltaContent?: string;
  readonly deltaReasoning?: string;
  readonly deltaToolCall?: ToolCallDescriptor;
  readonly finishReason?: StreamingFinishReason;
  readonly timestamp: number;
}

/**
 * Token usage and cost snapshot for a streaming session.
 */
export interface StreamingUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUSD: number;
}

/**
 * Finalized streaming response container assembled from accumulated stream chunks.
 */
export interface StreamingResponse {
  readonly responseId: string;
  readonly requestId: string;
  readonly modelId: string;
  readonly fullContent: string;
  readonly reasoningContent?: string;
  readonly toolCalls?: ReadonlyArray<ToolCallDescriptor>;
  readonly finishReason: StreamingFinishReason;
  readonly usage: StreamingUsage;
  readonly timestamp: number;
}

/**
 * Active streaming session handle.
 */
export interface StreamingSession {
  readonly sessionId: string;
  readonly requestId: string;
  readonly adapterId: string;
  readonly modelId: string;
  readonly startTime: number;
  readonly status: StreamingStatus;
}

/**
 * Real-time streaming performance progress telemetry.
 */
export interface StreamingProgress {
  readonly chunksReceived: number;
  readonly tokensProcessed: number;
  readonly currentLatencyMs: number;
  readonly averageChunkLatencyMs: number;
  readonly tokensPerSecond: number;
}

/**
 * Helper utility to deeply freeze objects recursively.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}
