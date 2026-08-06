/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: Response Parser (`response-parser.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { parseHttpResponse } from "../response-parser";
import { ResponseParseError, HttpResponseError } from "../transport-errors";

describe("Phase 9.10 Response Parser Determinism & Immutability", () => {
  it("should parse a valid 200 OK JSON response into a frozen HttpResponse", () => {
    const res = parseHttpResponse({
      statusCode: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      rawBody: '{"status":"success","data":[1,2,3]}',
      latencyMs: 120,
      requestId: "req-parse-1",
    });

    expect(res.statusCode).toBe(200);
    expect(res.ok).toBe(true);
    expect(res.body).toEqual({ status: "success", data: [1, 2, 3] });
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.body)).toBe(true);
  });

  it("should throw HttpResponseError when validateStatusCode is true on error status", () => {
    expect(() =>
      parseHttpResponse({
        statusCode: 500,
        statusText: "Internal Server Error",
        rawBody: "Error occurred",
        latencyMs: 50,
        requestId: "req-err-1",
        validateStatusCode: true,
      })
    ).toThrow(HttpResponseError);
  });

  it("should throw ResponseParseError when JSON parsing fails on application/json content-type", () => {
    expect(() =>
      parseHttpResponse({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        rawBody: "{ invalid json ...",
        latencyMs: 30,
        requestId: "req-invalid-json",
      })
    ).toThrow(ResponseParseError);
  });

  it("should throw ResponseParseError on invalid numeric parameters", () => {
    expect(() =>
      parseHttpResponse({
        statusCode: NaN,
        rawBody: "",
        latencyMs: 10,
        requestId: "req-nan",
      })
    ).toThrow(ResponseParseError);

    expect(() =>
      parseHttpResponse({
        statusCode: 200,
        rawBody: "",
        latencyMs: -10,
        requestId: "req-neg-latency",
      })
    ).toThrow(ResponseParseError);
  });
});
