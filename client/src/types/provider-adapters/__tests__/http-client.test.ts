/**
 * AETHER OS — Phase 9.10 AI Provider Adapter Layer
 * Unit Tests: HTTP Client (`http-client.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { HttpClient } from "../http-client";
import { TimeoutControllerError } from "../transport-errors";

describe("Phase 9.10 HTTP Client Runtime", () => {
  it("should execute a successful HTTP request with mock fetcher", async () => {
    const mockFetcher = async (url: string, init?: RequestInit) => {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ result: "success", echoUrl: url }), {
        status: 200,
        statusText: "OK",
        headers,
      });
    };

    const client = new HttpClient({ fetcher: mockFetcher });

    const response = await client.execute({
      method: "POST",
      url: "https://api.example.com/v1/infer",
      headers: { "Content-Type": "application/json" },
      body: { prompt: "Test prompt" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.body).toEqual({ result: "success", echoUrl: "https://api.example.com/v1/infer" });
    expect(Object.isFrozen(response)).toBe(true);

    const snapshot = client.getSnapshot();
    expect(snapshot.statistics.totalRequests).toBe(1);
    expect(snapshot.statistics.totalRetries).toBe(0);
    expect(snapshot.statistics.totalErrors).toBe(0);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("should perform deterministic retries when receiving 503 response", async () => {
    let attempts = 0;
    const mockFetcher = async () => {
      attempts++;
      if (attempts < 3) {
        return new Response("Service Unavailable", { status: 503, statusText: "Service Unavailable" });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, statusText: "OK" });
    };

    const client = new HttpClient({
      fetcher: mockFetcher,
      retryConfig: { maxRetries: 3, initialDelayMs: 10 },
    });

    const response = await client.execute({
      url: "https://api.example.com/v1/retry-test",
    });

    expect(response.statusCode).toBe(200);
    expect(attempts).toBe(3);

    const snapshot = client.getSnapshot();
    expect(snapshot.statistics.totalRequests).toBe(1);
    expect(snapshot.statistics.totalRetries).toBe(2);
  });

  it("should handle request timeout and throw TimeoutControllerError", async () => {
    const mockFetcher = async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    };

    const client = new HttpClient({
      fetcher: mockFetcher,
      retryConfig: { maxRetries: 0 },
    });

    await expect(
      client.execute({
        url: "https://api.example.com/v1/timeout-test",
        timeoutMs: 50,
      })
    ).rejects.toThrow(TimeoutControllerError);

    const snapshot = client.getSnapshot();
    expect(snapshot.statistics.totalTimeouts).toBe(1);
  });

  it("should reset telemetry statistics when requested", async () => {
    const mockFetcher = async () => new Response("OK", { status: 200 });
    const client = new HttpClient({ fetcher: mockFetcher });

    await client.execute({ url: "https://api.example.com/reset" });
    expect(client.getSnapshot().statistics.totalRequests).toBe(1);

    client.resetStatistics();
    expect(client.getSnapshot().statistics.totalRequests).toBe(0);
  });
});
