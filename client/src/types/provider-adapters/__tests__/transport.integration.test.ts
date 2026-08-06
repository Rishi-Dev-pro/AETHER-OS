/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Integration Tests: HTTP Transport Runtime & Replay Determinism (`transport.integration.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ProviderAdapterError } from "../errors";
import {
  TransportError,
  RequestBuildError,
  ResponseParseError,
  RetryPolicyError,
  TimeoutControllerError,
  HttpRequestError,
  HttpResponseError,
} from "../transport-errors";
import { buildHttpRequest, buildUrlWithQueryParams } from "../request-builder";
import { parseHttpResponse } from "../response-parser";
import { evaluateRetryDecision } from "../retry-policy";
import { HttpClient } from "../http-client";

describe("Phase 9.10 Transport Layer Integration & Replay Determinism", () => {
  it("should execute 100 deterministic replay runs producing identical frozen transport outputs", async () => {
    const replayCount = 100;
    const outputs: string[] = [];

    const mockFetcher = async (url: string, init?: RequestInit) => {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set("X-Response-Id", "res-fixed-100");

      return new Response(
        JSON.stringify({
          status: "success",
          tokens: 42,
        }),
        {
          status: 200,
          statusText: "OK",
          headers,
        }
      );
    };

    for (let i = 0; i < replayCount; i++) {
      const requestOptions = {
        method: "POST" as const,
        url: "https://api.example.com/v1/embeddings",
        headers: {
          "Content-Type": "application/json",
          "X-Trace-Id": "trace-fixed-999",
        },
        queryParams: {
          model: "text-embedding-3-small",
          version: 1,
        },
        body: { input: "deterministic test phrase" },
        timeoutMs: 15000,
        requestId: "req-deterministic-replay-001",
        timestamp: 1700000000000,
      };

      const req = buildHttpRequest(requestOptions);
      const targetUrl = buildUrlWithQueryParams(req.url, req.queryParams);

      const client = new HttpClient({
        fetcher: mockFetcher,
        retryConfig: { maxRetries: 2, initialDelayMs: 50 },
      });

      const response = await client.execute({ ...requestOptions, timestamp: 1700000000000 });
      const decision = evaluateRetryDecision(1, 200);
      const snapshot = client.getSnapshot();

      // Verify immutability across all produced contracts
      expect(Object.isFrozen(req)).toBe(true);
      expect(Object.isFrozen(req.headers)).toBe(true);
      expect(Object.isFrozen(req.queryParams)).toBe(true);
      expect(Object.isFrozen(response)).toBe(true);
      expect(Object.isFrozen(response.headers)).toBe(true);
      expect(Object.isFrozen(response.body)).toBe(true);
      expect(Object.isFrozen(decision)).toBe(true);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.statistics)).toBe(true);

      const serialized = JSON.stringify({
        targetUrl,
        request: req,
        response: {
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          ok: response.ok,
        },
        retryDecision: decision,
      });

      outputs.push(serialized);
    }

    // Assert all 100 replay outputs are bit-for-bit identical
    const firstOutput = outputs[0];
    for (let i = 1; i < replayCount; i++) {
      expect(outputs[i]).toBe(firstOutput);
    }
  });

  it("should integrate transport exception hierarchy with ProviderAdapterError", () => {
    const transportErrors = [
      new RequestBuildError("Build failed"),
      new ResponseParseError("Parse failed"),
      new RetryPolicyError("Retry failed"),
      new TimeoutControllerError("Timeout failed"),
      new HttpRequestError("Request failed"),
      new HttpResponseError("Response failed"),
    ];

    for (const err of transportErrors) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ProviderAdapterError);
      expect(err).toBeInstanceOf(TransportError);
      expect(err.code).toBeDefined();
    }
  });
});
