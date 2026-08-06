/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Request Builder (`request-builder.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { buildHttpRequest, buildUrlWithQueryParams, normalizeHeaders, normalizeQueryParams } from "../request-builder";
import { RequestBuildError } from "../transport-errors";

describe("Phase 9.10 Request Builder Determinism & Immutability", () => {
  it("should build a valid, deeply frozen HttpRequest object", () => {
    const req = buildHttpRequest({
      method: "POST",
      url: "https://api.example.com/v1/chat",
      headers: {
        "Content-Type": "application/json",
        "X-Custom-Header": "test-value",
      },
      queryParams: {
        version: "2",
        alpha: "true",
      },
      body: { prompt: "Hello world" },
      timeoutMs: 10000,
    });

    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://api.example.com/v1/chat");
    expect(req.timeoutMs).toBe(10000);
    expect(req.requestId).toBeDefined();
    expect(Object.isFrozen(req)).toBe(true);
    expect(Object.isFrozen(req.headers)).toBe(true);
    expect(Object.isFrozen(req.queryParams)).toBe(true);
  });

  it("should enforce stable lowercase header key normalization", () => {
    const rawHeaders = {
      "Zebra-Header": "z",
      "Authorization-Type": "custom",
      "Accept": "application/json",
    };

    const normalized = normalizeHeaders(rawHeaders);
    const keys = Object.keys(normalized);

    // Alphabetical sort of lowercase keys: accept, authorization-type, zebra-header
    expect(keys).toEqual(["accept", "authorization-type", "zebra-header"]);
  });

  it("should enforce deterministic alphabetical query parameter ordering", () => {
    const query = {
      z_param: "last",
      a_param: "first",
      m_param: "middle",
    };

    const normalized = normalizeQueryParams(query);
    const keys = Object.keys(normalized);
    expect(keys).toEqual(["a_param", "m_param", "z_param"]);

    const fullUrl = buildUrlWithQueryParams("https://api.example.com/test", query);
    expect(fullUrl).toBe("https://api.example.com/test?a_param=first&m_param=middle&z_param=last");
  });

  it("should throw RequestBuildError on invalid URL or parameters", () => {
    expect(() => buildHttpRequest({ url: "" })).toThrow(RequestBuildError);
    expect(() => buildHttpRequest({ url: "not-a-valid-url" })).toThrow(RequestBuildError);
    expect(() => buildHttpRequest({ url: "https://example.com", method: "INVALID" as any })).toThrow(RequestBuildError);
    expect(() => buildHttpRequest({ url: "https://example.com", timeoutMs: -500 })).toThrow(RequestBuildError);
  });
});
