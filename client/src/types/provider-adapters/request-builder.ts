/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Milestone 2 Component: Request Builder (`request-builder.ts`)
 *
 * @file request-builder.ts
 * @description Deterministic HTTP request construction utility. Enforces stable header key ordering,
 * alphabetical query parameter ordering, fail-fast input validation, and deep-freezing immutability.
 *
 * @module @aether/provider-adapters/request-builder
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 2
 */

import type { HttpRequest, RequestHeaders, QueryParameters, RequestBody } from "./transport-types";
import { RequestBuildError } from "./transport-errors";
import { deepFreeze } from "./factories";

/**
 * Options for constructing an immutable HTTP request.
 */
export interface RequestBuilderOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  body?: RequestBody;
  timeoutMs?: number;
  requestId?: string;
  timestamp?: number;
}

/**
 * Builds a normalized, deterministically formatted URL with query parameters appended in alphabetical order.
 *
 * @param baseUrl Base target URL.
 * @param queryParams Query parameter key-value pairs.
 * @returns Formatted URL string.
 */
export function buildUrlWithQueryParams(
  baseUrl: string,
  queryParams: QueryParameters
): string {
  if (!baseUrl || typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new RequestBuildError("Base URL cannot be empty.");
  }

  const keys = Object.keys(queryParams).sort();
  if (keys.length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  for (const key of keys) {
    const val = queryParams[key];
    if (val !== undefined && val !== null) {
      searchParams.append(key, String(val));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${queryString}`;
}

/**
 * Normalizes headers by sorting keys alphabetically and converting keys to lowercase for deterministic ordering.
 *
 * @param headers Outgoing header records.
 * @returns Frozen, sorted RequestHeaders object.
 */
export function normalizeHeaders(headers: Record<string, string>): RequestHeaders {
  const sortedKeys = Object.keys(headers).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const normalized: Record<string, string> = {};

  for (const key of sortedKeys) {
    normalized[key.toLowerCase()] = headers[key].trim();
  }

  return deepFreeze(normalized);
}

/**
 * Normalizes query parameters by sorting keys alphabetically.
 *
 * @param queryParams Outgoing query parameter records.
 * @returns Frozen, sorted QueryParameters object.
 */
export function normalizeQueryParams(
  queryParams: Record<string, string | number | boolean>
): QueryParameters {
  const sortedKeys = Object.keys(queryParams).sort();
  const normalized: Record<string, string | number | boolean> = {};

  for (const key of sortedKeys) {
    normalized[key] = queryParams[key];
  }

  return deepFreeze(normalized);
}

/**
 * Constructs and validates a deeply frozen HttpRequest object.
 *
 * @param options Request construction parameters.
 * @returns Deeply frozen HttpRequest contract instance.
 * @throws RequestBuildError if inputs violate structural constraints.
 */
export function buildHttpRequest(options: RequestBuilderOptions): Readonly<HttpRequest> {
  if (!options) {
    throw new RequestBuildError("Request builder options cannot be null or undefined.");
  }

  if (!options.url || typeof options.url !== "string" || options.url.trim() === "") {
    throw new RequestBuildError("HTTP request requires a valid non-empty url.");
  }

  try {
    new URL(options.url);
  } catch {
    throw new RequestBuildError(`Invalid URL string provided: '${options.url}'`);
  }

  const method = options.method ?? "GET";
  const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
  if (!validMethods.includes(method)) {
    throw new RequestBuildError(`Unsupported HTTP method: '${method}'`);
  }

  const timeoutMs = options.timeoutMs ?? 30000;
  if (typeof timeoutMs !== "number" || timeoutMs <= 0) {
    throw new RequestBuildError("HTTP request timeoutMs must be a positive number.");
  }

  const requestId = options.requestId?.trim() || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = options.timestamp ?? Date.now();

  const headers = normalizeHeaders(options.headers ?? {});
  const queryParams = normalizeQueryParams(options.queryParams ?? {});

  const request: HttpRequest = {
    method,
    url: options.url.trim(),
    headers,
    queryParams,
    body: options.body,
    timeoutMs,
    requestId,
    timestamp,
  };

  return deepFreeze(request);
}
