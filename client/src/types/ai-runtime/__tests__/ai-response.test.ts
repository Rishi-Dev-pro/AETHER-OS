import { describe, it, expect } from "vitest";
import {
  FinishReason,
  CircuitState,
  ExecutionResult,
  type TokenUsage,
  type LatencyMetrics,
  type DiagnosticStatus,
  type ToolCallDescriptor,
} from "../types";
import { SystemError } from "../errors";
import { createAIResponse, serializeAIResponse } from "../ai-response";

describe("Phase 9.4 Component 4: Canonical AIResponse Envelope (ai-response.ts)", () => {
  const mockUsage: TokenUsage = {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    reasoningTokens: 10,
    cachedTokens: 20,
  };

  const mockLatency: LatencyMetrics = {
    queueDurationMs: 5.0,
    connectionDurationMs: 20.0,
    timeToFirstTokenMs: 150.0,
    totalExecutionDurationMs: 450.0,
  };

  const mockDiagnostics: DiagnosticStatus = {
    providerId: "openai",
    concreteModel: "gpt-4o",
    attemptCount: 1,
    circuitState: CircuitState.CLOSED,
    executionResult: ExecutionResult.SUCCESS,
  };

  const mockToolCall: ToolCallDescriptor = {
    id: "call_abc123",
    name: "execute_system_command",
    arguments: { command: "dir" },
  };

  describe("Successful AIResponse Creation & Defaults", () => {
    it("should create a valid AIResponse with default text and finishReason", () => {
      const response = createAIResponse({
        requestId: "req_resp_001",
        usage: mockUsage,
        latency: mockLatency,
        diagnostics: mockDiagnostics,
      });

      expect(response.metadata.requestId).toBe("req_resp_001");
      expect(response.metadata.timestamp).toBeGreaterThan(0);
      expect(response.metadata.finishReason).toBe(FinishReason.STOP);
      expect(response.text).toBe("");
      expect(response.toolCalls).toEqual([]);
      expect(response.usage).toEqual(mockUsage);
      expect(response.latency).toEqual(mockLatency);
      expect(response.diagnostics).toEqual(mockDiagnostics);
    });

    it("should accept custom text, toolCalls, finishReason, and correlationContext", () => {
      const response = createAIResponse({
        requestId: "req_resp_002",
        text: "System status is nominal.",
        finishReason: FinishReason.TOOL_CALLS,
        toolCalls: [mockToolCall],
        usage: mockUsage,
        latency: mockLatency,
        diagnostics: mockDiagnostics,
        correlationContext: {
          sessionId: "sess_7701",
          snapshotId: "snap_8802",
          intentId: "intent_9903",
        },
      });

      expect(response.text).toBe("System status is nominal.");
      expect(response.metadata.finishReason).toBe(FinishReason.TOOL_CALLS);
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls[0].name).toBe("execute_system_command");
      expect(response.metadata.correlationContext.sessionId).toBe("sess_7701");
    });
  });

  describe("Deep Freeze & Immutability Guarantees", () => {
    it("should prevent mutation of top-level response properties at runtime", () => {
      const response = createAIResponse({
        requestId: "req_resp_003",
        text: "Immutable text",
        usage: mockUsage,
        latency: mockLatency,
        diagnostics: mockDiagnostics,
      });

      expect(Object.isFrozen(response)).toBe(true);
      expect(() => {
        // @ts-expect-error mutating frozen property
        response.text = "Mutated text";
      }).toThrow();
    });

    it("should prevent mutation of nested metadata, usage, latency, and toolCalls", () => {
      const response = createAIResponse({
        requestId: "req_resp_004",
        text: "Test text",
        toolCalls: [mockToolCall],
        usage: mockUsage,
        latency: mockLatency,
        diagnostics: mockDiagnostics,
      });

      expect(Object.isFrozen(response.metadata)).toBe(true);
      expect(Object.isFrozen(response.usage)).toBe(true);
      expect(Object.isFrozen(response.latency)).toBe(true);
      expect(Object.isFrozen(response.diagnostics)).toBe(true);
      expect(Object.isFrozen(response.toolCalls)).toBe(true);
      expect(Object.isFrozen(response.toolCalls[0])).toBe(true);

      expect(() => {
        // @ts-expect-error mutating frozen nested property
        (response.usage as { promptTokens: number }).promptTokens = 9999;
      }).toThrow();

      expect(() => {
        // @ts-expect-error mutating frozen array item
        (response.toolCalls as ToolCallDescriptor[])[0] = { id: "1", name: "bad", arguments: {} };
      }).toThrow();
    });
  });

  describe("Invariant Validation & Fail-Fast Errors", () => {
    it("should throw SystemError if requestId is missing or empty", () => {
      expect(() => {
        createAIResponse({
          requestId: "   ",
          usage: mockUsage,
          latency: mockLatency,
          diagnostics: mockDiagnostics,
        });
      }).toThrow(SystemError);
    });

    it("should throw SystemError if usage object is missing or has negative values", () => {
      expect(() => {
        createAIResponse({
          requestId: "req_005",
          usage: null as never,
          latency: mockLatency,
          diagnostics: mockDiagnostics,
        });
      }).toThrow("AIResponse requires a valid TokenUsage object.");

      expect(() => {
        createAIResponse({
          requestId: "req_006",
          usage: { promptTokens: -10, completionTokens: 5, totalTokens: 5 },
          latency: mockLatency,
          diagnostics: mockDiagnostics,
        });
      }).toThrow("TokenUsage fields (promptTokens, completionTokens, totalTokens) must be non-negative numbers.");
    });

    it("should throw SystemError if latency metrics are missing or invalid", () => {
      expect(() => {
        createAIResponse({
          requestId: "req_007",
          usage: mockUsage,
          latency: null as never,
          diagnostics: mockDiagnostics,
        });
      }).toThrow("AIResponse requires a valid LatencyMetrics object.");

      expect(() => {
        createAIResponse({
          requestId: "req_008",
          usage: mockUsage,
          latency: { queueDurationMs: -1, connectionDurationMs: 0, timeToFirstTokenMs: 0, totalExecutionDurationMs: 0 },
          diagnostics: mockDiagnostics,
        });
      }).toThrow("LatencyMetrics fields must be non-negative numbers.");
    });

    it("should throw SystemError if diagnostic status is missing or invalid", () => {
      expect(() => {
        createAIResponse({
          requestId: "req_009",
          usage: mockUsage,
          latency: mockLatency,
          diagnostics: null as never,
        });
      }).toThrow("AIResponse requires a valid DiagnosticStatus object.");

      expect(() => {
        createAIResponse({
          requestId: "req_010",
          usage: mockUsage,
          latency: mockLatency,
          diagnostics: { providerId: "", concreteModel: "gpt-4o", attemptCount: 1, circuitState: CircuitState.CLOSED, executionResult: ExecutionResult.SUCCESS },
        });
      }).toThrow("DiagnosticStatus requires valid providerId and concreteModel strings.");
    });
  });

  describe("Serialization Helpers", () => {
    it("serializeAIResponse should produce a clean, frozen JSON representation", () => {
      const response = createAIResponse({
        requestId: "req_serialize_001",
        text: "Serialized output.",
        usage: mockUsage,
        latency: mockLatency,
        diagnostics: mockDiagnostics,
      });

      const serialized = serializeAIResponse(response);

      expect(serialized.requestId).toBe("req_serialize_001");
      expect(serialized.text).toBe("Serialized output.");
      expect(serialized.finishReason).toBe(FinishReason.STOP);
      expect(serialized.usage).toEqual(mockUsage);
      expect(serialized.latency).toEqual(mockLatency);
      expect(serialized.diagnostics).toEqual(mockDiagnostics);
      expect(Object.isFrozen(serialized)).toBe(true);
    });
  });
});
