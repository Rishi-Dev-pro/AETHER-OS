/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Response Parser (`response-parser.ts`)
 *
 * @file response-parser.ts
 * @description Deterministic HTTP response parsing and validation utility. Enforces status code
 * validation, JSON body deserialization, header normalization, content-type checks, and deep freezing.
 *
 * @module @aether/provider-adapters/response-parser
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import type { HttpResponse } from "./transport-types";
import { ResponseParseError, HttpResponseError } from "./transport-errors";
import { deepFreeze } from "./factories";

/**
 * Options for parsing raw response data into an immutable HttpResponse object.
 */
export interface ResponseParseOptions {
  statusCode: number;
  statusText?: string;
  headers?: Record<string, string>;
  rawBody: string | Record<string, unknown> | ArrayBuffer;
  latencyMs: number;
  requestId: string;
  timestamp?: number;
  validateStatusCode?: boolean;
}

/**
 * Parses raw HTTP response data into a deeply frozen HttpResponse contract instance.
 *
 * @param options Raw response attributes.
 * @returns Deeply frozen HttpResponse instance.
 * @throws ResponseParseError or HttpResponseError if validation fails.
 */
export function parseHttpResponse(options: ResponseParseOptions): Readonly<HttpResponse> {
  if (!options) {
    throw new ResponseParseError("Response parse options cannot be null or undefined.");
  }

  if (typeof options.statusCode !== "number" || isNaN(options.statusCode)) {
    throw new ResponseParseError("Response requires a valid numeric statusCode.");
  }

  if (!options.requestId || typeof options.requestId !== "string" || options.requestId.trim() === "") {
    throw new ResponseParseError("Response requires a non-empty requestId.");
  }

  if (typeof options.latencyMs !== "number" || options.latencyMs < 0) {
    throw new ResponseParseError("Response latencyMs must be a non-negative number.");
  }

  const ok = options.statusCode >= 200 && options.statusCode < 300;

  if (options.validateStatusCode && !ok) {
    throw new HttpResponseError(
      `HTTP request failed with status code ${options.statusCode}: ${options.statusText ?? "Error"}`,
      { statusCode: options.statusCode, requestId: options.requestId }
    );
  }

  // Normalize response headers to lowercase keys
  const normalizedHeaders: Record<string, string> = {};
  if (options.headers) {
    for (const key of Object.keys(options.headers)) {
      normalizedHeaders[key.toLowerCase()] = options.headers[key].trim();
    }
  }

  let parsedBody: string | Record<string, unknown> | ArrayBuffer = options.rawBody;

  // Attempt JSON parsing if rawBody is a string and content-type is application/json (or looks like JSON)
  if (typeof options.rawBody === "string") {
    const contentType = normalizedHeaders["content-type"] ?? "";
    const trimmed = options.rawBody.trim();
    if (
      contentType.includes("application/json") ||
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        parsedBody = JSON.parse(trimmed);
      } catch (err) {
        if (contentType.includes("application/json")) {
          throw new ResponseParseError(`Failed to parse JSON response body: ${(err as Error).message}`, {
            requestId: options.requestId,
          });
        }
      }
    }
  }

  const response: HttpResponse = {
    statusCode: options.statusCode,
    statusText: options.statusText ?? (ok ? "OK" : "Error"),
    headers: normalizedHeaders,
    body: parsedBody,
    latencyMs: options.latencyMs,
    timestamp: options.timestamp ?? Date.now(),
    requestId: options.requestId.trim(),
    ok,
  };

  return deepFreeze(response);
}
