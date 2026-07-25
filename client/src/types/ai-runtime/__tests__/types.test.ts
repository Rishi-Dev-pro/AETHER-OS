import { describe, it, expect } from "vitest";
import {
  FsmState,
  PriorityTier,
  ModelTier,
  PrivacyMode,
  LogCategory,
  FinishReason,
  CircuitState,
  ExecutionResult,
  ErrorCategoryCode,
  type CorrelationContext,
  type TokenUsage,
  type LatencyMetrics,
  type ToolCallDescriptor,
  type DiagnosticStatus,
  type TokenDeltaEvent,
} from "../types";

describe("Phase 9.4 Component 1: Shared Runtime Types & Enums (types.ts)", () => {
  describe("FsmState Enum Integrity", () => {
    it("should contain exactly 12 distinct state values (8 active, 4 terminal)", () => {
      const states = Object.values(FsmState);
      expect(states).toHaveLength(12);
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(12);
    });

    it("should contain all mandatory active states", () => {
      expect(FsmState.CREATED).toBe("CREATED");
      expect(FsmState.QUEUED).toBe("QUEUED");
      expect(FsmState.RESOLVING_PROVIDER).toBe("RESOLVING_PROVIDER");
      expect(FsmState.TRANSLATING_PAYLOAD).toBe("TRANSLATING_PAYLOAD");
      expect(FsmState.EXECUTING_TRANSPORT).toBe("EXECUTING_TRANSPORT");
      expect(FsmState.STREAMING).toBe("STREAMING");
      expect(FsmState.VALIDATING).toBe("VALIDATING");
      expect(FsmState.NORMALIZING).toBe("NORMALIZING");
    });

    it("should contain all mandatory terminal states", () => {
      expect(FsmState.COMPLETED).toBe("COMPLETED");
      expect(FsmState.FAILED).toBe("FAILED");
      expect(FsmState.CANCELLED).toBe("CANCELLED");
      expect(FsmState.CIRCUIT_TRIPPED).toBe("CIRCUIT_TRIPPED");
    });
  });

  describe("PriorityTier Enum Integrity", () => {
    it("should contain exactly 4 numerical priority tiers in correct order", () => {
      expect(PriorityTier.SYSTEM_CRITICAL).toBe(0);
      expect(PriorityTier.USER_INTERACTIVE).toBe(1);
      expect(PriorityTier.BACKGROUND_ROUTINE).toBe(2);
      expect(PriorityTier.BATCH_PROCESSING).toBe(3);
    });

    it("should preserve priority ranking assertions (SYSTEM_CRITICAL < USER_INTERACTIVE)", () => {
      expect(PriorityTier.SYSTEM_CRITICAL).toBeLessThan(PriorityTier.USER_INTERACTIVE);
      expect(PriorityTier.USER_INTERACTIVE).toBeLessThan(PriorityTier.BACKGROUND_ROUTINE);
      expect(PriorityTier.BACKGROUND_ROUTINE).toBeLessThan(PriorityTier.BATCH_PROCESSING);
    });
  });

  describe("ModelTier Enum Integrity", () => {
    it("should define all 5 abstract model tiers", () => {
      expect(ModelTier.REASONING).toBe("REASONING");
      expect(ModelTier.STANDARD).toBe("STANDARD");
      expect(ModelTier.FAST).toBe("FAST");
      expect(ModelTier.VISION).toBe("VISION");
      expect(ModelTier.LOCAL).toBe("LOCAL");
    });

    it("should ensure all model tier values are unique strings", () => {
      const tiers = Object.values(ModelTier);
      expect(tiers).toHaveLength(5);
      expect(new Set(tiers).size).toBe(5);
    });
  });

  describe("PrivacyMode Enum Integrity", () => {
    it("should support STANDARD, ENCRYPTED, and LOCAL_ONLY privacy modes", () => {
      expect(PrivacyMode.STANDARD).toBe("STANDARD");
      expect(PrivacyMode.ENCRYPTED).toBe("ENCRYPTED");
      expect(PrivacyMode.LOCAL_ONLY).toBe("LOCAL_ONLY");
    });
  });

  describe("LogCategory Enum Integrity", () => {
    it("should define all 10 diagnostic categories", () => {
      const categories = Object.values(LogCategory);
      expect(categories).toHaveLength(10);
      expect(categories).toContain("ORCHESTRATOR");
      expect(categories).toContain("SCHEDULER");
      expect(categories).toContain("PROVIDER");
      expect(categories).toContain("SECURITY");
    });
  });

  describe("FinishReason Enum Integrity", () => {
    it("should define all standard generation finish reasons", () => {
      expect(FinishReason.STOP).toBe("STOP");
      expect(FinishReason.LENGTH).toBe("LENGTH");
      expect(FinishReason.TOOL_CALLS).toBe("TOOL_CALLS");
      expect(FinishReason.CONTENT_FILTER).toBe("CONTENT_FILTER");
      expect(FinishReason.ERROR).toBe("ERROR");
      expect(FinishReason.CANCELLED).toBe("CANCELLED");
    });
  });

  describe("CircuitState & ExecutionResult Enums", () => {
    it("should define valid CircuitState values", () => {
      expect(CircuitState.CLOSED).toBe("CLOSED");
      expect(CircuitState.OPEN).toBe("OPEN");
      expect(CircuitState.HALF_OPEN).toBe("HALF_OPEN");
    });

    it("should define valid ExecutionResult outcomes", () => {
      expect(ExecutionResult.SUCCESS).toBe("SUCCESS");
      expect(ExecutionResult.PARTIAL_STREAM).toBe("PARTIAL_STREAM");
      expect(ExecutionResult.RETRY_HANDLED).toBe("RETRY_HANDLED");
      expect(ExecutionResult.CIRCUIT_TRIPPED).toBe("CIRCUIT_TRIPPED");
      expect(ExecutionResult.FATAL_ERROR).toBe("FATAL_ERROR");
    });
  });

  describe("ErrorCategoryCode Enum Integrity", () => {
    it("should define 5 root error category codes matching error taxonomy", () => {
      expect(ErrorCategoryCode.TRANSIENT_ERROR).toBe("TRANSIENT_ERROR");
      expect(ErrorCategoryCode.CONFIGURATION_ERROR).toBe("CONFIGURATION_ERROR");
      expect(ErrorCategoryCode.CONTEXT_BOUNDARY_ERROR).toBe("CONTEXT_BOUNDARY_ERROR");
      expect(ErrorCategoryCode.SAFETY_ERROR).toBe("SAFETY_ERROR");
      expect(ErrorCategoryCode.SYSTEM_ERROR).toBe("SYSTEM_ERROR");
    });
  });

  describe("Readonly Data Contracts", () => {
    it("should construct valid CorrelationContext objects", () => {
      const context: CorrelationContext = {
        sessionId: "sess_123",
        snapshotId: "snap_456",
        intentId: "intent_789",
        tenantId: "tenant_abc",
        traceId: "trace_xyz",
      };

      expect(context.sessionId).toBe("sess_123");
      expect(context.snapshotId).toBe("snap_456");
      expect(context.intentId).toBe("intent_789");
      expect(context.tenantId).toBe("tenant_abc");
      expect(context.traceId).toBe("trace_xyz");
    });

    it("should construct valid TokenUsage objects and satisfy invariant prompt + completion = total", () => {
      const usage: TokenUsage = {
        promptTokens: 150,
        completionTokens: 50,
        totalTokens: 200,
        reasoningTokens: 10,
        cachedTokens: 40,
      };

      expect(usage.promptTokens + usage.completionTokens).toBe(usage.totalTokens);
      expect(usage.reasoningTokens).toBe(10);
      expect(usage.cachedTokens).toBe(40);
    });

    it("should construct valid LatencyMetrics objects", () => {
      const metrics: LatencyMetrics = {
        queueDurationMs: 1.2,
        connectionDurationMs: 15.4,
        timeToFirstTokenMs: 250.0,
        totalExecutionDurationMs: 850.5,
      };

      expect(metrics.queueDurationMs).toBe(1.2);
      expect(metrics.connectionDurationMs).toBe(15.4);
      expect(metrics.timeToFirstTokenMs).toBe(250.0);
      expect(metrics.totalExecutionDurationMs).toBe(850.5);
    });

    it("should construct valid ToolCallDescriptor objects", () => {
      const descriptor: ToolCallDescriptor = {
        id: "call_abc123",
        name: "get_weather",
        arguments: { location: "San Francisco", units: "metric" },
      };

      expect(descriptor.id).toBe("call_abc123");
      expect(descriptor.name).toBe("get_weather");
      expect(descriptor.arguments.location).toBe("San Francisco");
    });

    it("should construct valid DiagnosticStatus objects", () => {
      const status: DiagnosticStatus = {
        providerId: "openai",
        concreteModel: "gpt-4o",
        attemptCount: 1,
        circuitState: CircuitState.CLOSED,
        executionResult: ExecutionResult.SUCCESS,
      };

      expect(status.providerId).toBe("openai");
      expect(status.concreteModel).toBe("gpt-4o");
      expect(status.circuitState).toBe(CircuitState.CLOSED);
      expect(status.executionResult).toBe(ExecutionResult.SUCCESS);
    });

    it("should construct valid TokenDeltaEvent objects for streaming", () => {
      const event: TokenDeltaEvent = {
        requestId: "req_001",
        tokenText: "Hello",
        sequenceIndex: 1,
        isReasoningToken: false,
      };

      expect(event.requestId).toBe("req_001");
      expect(event.tokenText).toBe("Hello");
      expect(event.sequenceIndex).toBe(1);
      expect(event.isReasoningToken).toBe(false);
    });
  });
});
