/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Transport Types (`transport-types.ts`)
 *
 * @file transport-types.ts
 * @description Immutable interface contracts defining HTTP request/response shapes, headers,
 * query parameters, retry/timeout configurations, and transport telemetry snapshots.
 *
 * @module @aether/provider-adapters/transport-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

/**
 * Normalized HTTP request header key-value map.
 */
export type RequestHeaders = Readonly<Record<string, string>>;

/**
 * Normalized URL query parameters.
 */
export type QueryParameters = Readonly<Record<string, string | number | boolean>>;

/**
 * Supported payload types for outgoing HTTP request bodies.
 */
export type RequestBody = string | Readonly<Record<string, unknown>> | ArrayBuffer;

/**
 * Immutable contract representing an outgoing HTTP request.
 */
export interface HttpRequest {
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  readonly url: string;
  readonly headers: RequestHeaders;
  readonly queryParams: QueryParameters;
  readonly body?: RequestBody;
  readonly timeoutMs: number;
  readonly requestId: string;
  readonly timestamp: number;
}

/**
 * Immutable contract representing an incoming HTTP response.
 */
export interface HttpResponse {
  readonly statusCode: number;
  readonly statusText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string | Readonly<Record<string, unknown>> | ArrayBuffer;
  readonly latencyMs: number;
  readonly timestamp: number;
  readonly requestId: string;
  readonly ok: boolean;
}

/**
 * Deterministic retry policy configuration options.
 */
export interface RetryConfiguration {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly retryableStatusCodes: ReadonlyArray<number>;
}

/**
 * Timeout and abort signal settings.
 */
export interface TimeoutConfiguration {
  readonly timeoutMs: number;
  readonly enableAbortController: boolean;
}

/**
 * Aggregated counters and performance telemetry for the HTTP transport layer.
 */
export interface TransportStatistics {
  readonly totalRequests: number;
  readonly totalRetries: number;
  readonly totalTimeouts: number;
  readonly totalErrors: number;
  readonly averageLatencyMs: number;
}

/**
 * Telemetry snapshot of the HTTP transport state at a specific point in time.
 */
export interface TransportSnapshot {
  readonly timestamp: number;
  readonly statistics: TransportStatistics;
  readonly activeRequests: number;
}
