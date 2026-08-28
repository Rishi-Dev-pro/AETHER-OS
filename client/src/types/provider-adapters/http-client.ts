/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: HTTP Client Runtime (`http-client.ts`)
 *
 * @file http-client.ts
 * @description Provider-independent, deterministic HTTP client engine. Coordinates request construction,
 * timeout enforcement, retry policy evaluation, response parsing, and transport statistics accounting.
 *
 * @module @aether/provider-adapters/http-client
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import type {
  HttpRequest,
  HttpResponse,
  RetryConfiguration,
  TransportStatistics,
  TransportSnapshot,
} from "./transport-types";
import { HttpRequestError, TimeoutControllerError } from "./transport-errors";
import { buildHttpRequest, buildUrlWithQueryParams, type RequestBuilderOptions } from "./request-builder";
import { parseHttpResponse } from "./response-parser";
import { evaluateRetryDecision, DEFAULT_RETRY_CONFIGURATION } from "./retry-policy";
import { createTimeoutHandle } from "./timeout-controller";
import { deepFreeze } from "./factories";

/**
 * Interface signature for pluggable HTTP fetch implementations.
 */
export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Options for configuring an HttpClient instance.
 */
export interface HttpClientOptions {
  readonly retryConfig?: Partial<RetryConfiguration>;
  readonly fetcher?: FetchFunction;
}

/**
 * Provider-independent HTTP client implementation.
 */
export class HttpClient {
  private readonly retryConfig: Readonly<RetryConfiguration>;
  private readonly fetcher: FetchFunction;

  private totalRequests = 0;
  private totalRetries = 0;
  private totalTimeouts = 0;
  private totalErrors = 0;
  private totalLatencyMs = 0;
  private activeRequests = 0;

  constructor(options: HttpClientOptions = {}) {
    this.retryConfig = options.retryConfig
      ? deepFreeze({ ...DEFAULT_RETRY_CONFIGURATION, ...options.retryConfig })
      : DEFAULT_RETRY_CONFIGURATION;

    // Use provided custom fetcher or fallback to global fetch if available
    this.fetcher =
      options.fetcher ??
      (typeof fetch !== "undefined"
        ? fetch.bind(globalThis)
        : async () => {
            throw new HttpRequestError("Global fetch environment is not available.");
          });
  }

  /**
   * Executes an HTTP request with automatic deterministic retries, timeout control, and response parsing.
   *
   * @param requestOptions Outgoing request construction options.
   * @returns Deeply frozen HttpResponse instance.
   */
  async execute(requestOptions: RequestBuilderOptions): Promise<Readonly<HttpResponse>> {
    const request: Readonly<HttpRequest> = buildHttpRequest(requestOptions);
    const targetUrl = buildUrlWithQueryParams(request.url, request.queryParams);

    this.totalRequests++;
    this.activeRequests++;
    const startTime = Date.now();

    let attempt = 1;
    let lastError: Error | null = null;

    try {
      while (true) {
        const timeoutHandle = createTimeoutHandle(request.timeoutMs);
        const attemptStartTime = Date.now();

        try {
          const fetchInit: RequestInit = {
            method: request.method,
            headers: { ...request.headers },
            signal: timeoutHandle.signal,
          };

          if (request.body && request.method !== "GET" && request.method !== "HEAD") {
            if (typeof request.body === "string" || request.body instanceof ArrayBuffer) {
              fetchInit.body = request.body;
            } else {
              fetchInit.body = JSON.stringify(request.body);
            }
          }

          const rawResponse = await this.fetcher(targetUrl, fetchInit);
          timeoutHandle.cancel();

          const attemptLatency = Date.now() - attemptStartTime;
          let rawTextBody = "";
          try {
            rawTextBody = await rawResponse.text();
          } catch {
            rawTextBody = "";
          }

          // Convert raw headers to Record<string, string>
          const responseHeaders: Record<string, string> = {};
          if (rawResponse.headers && typeof rawResponse.headers.forEach === "function") {
            rawResponse.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });
          }

          const parsed = parseHttpResponse({
            statusCode: rawResponse.status,
            statusText: rawResponse.statusText,
            headers: responseHeaders,
            rawBody: rawTextBody,
            latencyMs: attemptLatency,
            requestId: request.requestId,
          });

          if (parsed.ok) {
            this.totalLatencyMs += Date.now() - startTime;
            return parsed;
          }

          const retryDecision = evaluateRetryDecision(attempt, parsed.statusCode, this.retryConfig);

          if (!retryDecision.shouldRetry) {
            this.totalLatencyMs += Date.now() - startTime;
            return parsed;
          }

          this.totalRetries++;
          attempt++;
          if (retryDecision.delayMs > 0) {
            await new Promise((res) => setTimeout(res, retryDecision.delayMs));
          }
        } catch (err) {
          timeoutHandle.cancel();
          const isTimeout = timeoutHandle.isTimedOut() || (err as Error).name === "AbortError";

          if (isTimeout) {
            this.totalTimeouts++;
            lastError = new TimeoutControllerError(
              `HTTP request timed out after ${request.timeoutMs}ms for requestId '${request.requestId}'`,
              { requestId: request.requestId, timeoutMs: request.timeoutMs }
            );
          } else {
            lastError = err instanceof Error ? err : new HttpRequestError(String(err));
          }

          const retryDecision = evaluateRetryDecision(attempt, undefined, this.retryConfig);
          if (!retryDecision.shouldRetry) {
            this.totalErrors++;
            this.totalLatencyMs += Date.now() - startTime;
            throw lastError;
          }

          this.totalRetries++;
          attempt++;
          if (retryDecision.delayMs > 0) {
            await new Promise((res) => setTimeout(res, retryDecision.delayMs));
          }
        }
      }
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Executes an HTTP streaming request and returns a raw ReadableStream or AsyncIterable of chunks.
   *
   * @param requestOptions Outgoing request construction options.
   * @param signal Optional AbortSignal for stream cancellation.
   * @returns AsyncIterable of Uint8Array or string chunks.
   */
  async executeStream(
    requestOptions: RequestBuilderOptions,
    signal?: AbortSignal
  ): Promise<AsyncIterable<Uint8Array | string>> {
    const request: Readonly<HttpRequest> = buildHttpRequest(requestOptions);
    const targetUrl = buildUrlWithQueryParams(request.url, request.queryParams);

    this.totalRequests++;
    this.activeRequests++;

    try {
      const fetchInit: RequestInit = {
        method: request.method,
        headers: { ...request.headers, accept: "text/event-stream, application/json" },
        signal,
      };

      if (request.body && request.method !== "GET" && request.method !== "HEAD") {
        fetchInit.body = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
      }

      const rawResponse = await this.fetcher(targetUrl, fetchInit);

      if (!rawResponse.ok) {
        let errText = "";
        try {
          errText = await rawResponse.text();
        } catch {
          errText = "";
        }
        throw new HttpRequestError(
          `Streaming request failed with HTTP ${rawResponse.status}: ${errText}`,
          { statusCode: rawResponse.status, requestId: request.requestId }
        );
      }

      if (rawResponse.body && Symbol.asyncIterator in (rawResponse.body as any)) {
        return rawResponse.body as unknown as AsyncIterable<Uint8Array | string>;
      }

      if (rawResponse.body && typeof (rawResponse.body as any).getReader === "function") {
        const reader = (rawResponse.body as any).getReader();
        return {
          async *[Symbol.asyncIterator]() {
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
      }

      // Fallback if body is text
      const fullText = await rawResponse.text();
      return {
        async *[Symbol.asyncIterator]() {
          yield fullText;
        },
      };
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Captures and returns a frozen snapshot of transport statistics and current state.
   */
  getSnapshot(): Readonly<TransportSnapshot> {
    const averageLatencyMs =
      this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;

    const stats: TransportStatistics = {
      totalRequests: this.totalRequests,
      totalRetries: this.totalRetries,
      totalTimeouts: this.totalTimeouts,
      totalErrors: this.totalErrors,
      averageLatencyMs,
    };

    const snapshot: TransportSnapshot = {
      timestamp: Date.now(),
      statistics: deepFreeze(stats),
      activeRequests: this.activeRequests,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Resets all internal telemetry counters to initial zero states.
   */
  resetStatistics(): void {
    this.totalRequests = 0;
    this.totalRetries = 0;
    this.totalTimeouts = 0;
    this.totalErrors = 0;
    this.totalLatencyMs = 0;
  }
}
