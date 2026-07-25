import { describe, it, expect } from "vitest";
import {
  FsmState,
  PriorityTier,
  ModelTier,
  CircuitState,
  ExecutionResult,
  LogCategory,
  type TokenUsage,
  type LatencyMetrics,
} from "../types";
import { ConfigurationError, SystemError } from "../errors";
import {
  createExecutionTelemetry,
  createRuntimeHealthReport,
  createDiagnosticEvent,
  serializeTelemetry,
  serializeHealthReport,
} from "../diagnostics";

describe("Phase 9.4 Component 7: Runtime Diagnostics Contracts (diagnostics.ts)", () => {
  const mockUsage: TokenUsage = {
    promptTokens: 120,
    completionTokens: 60,
    totalTokens: 180,
  };

  const mockLatency: LatencyMetrics = {
    queueDurationMs: 2.5,
    connectionDurationMs: 12.0,
    timeToFirstTokenMs: 180.0,
    totalExecutionDurationMs: 520.0,
  };

  describe("ExecutionTelemetry Factory & Invariant Enforcement", () => {
    it("should create a valid ExecutionTelemetry object with defaults", () => {
      const telemetry = createExecutionTelemetry({
        requestId: "req_diag_001",
        providerId: "openai",
        concreteModel: "gpt-4o",
        finalState: FsmState.COMPLETED,
        usage: mockUsage,
        latency: mockLatency,
      });

      expect(telemetry.requestId).toBe("req_diag_001");
      expect(telemetry.providerId).toBe("openai");
      expect(telemetry.concreteModel).toBe("gpt-4o");
      expect(telemetry.finalState).toBe(FsmState.COMPLETED);
      expect(telemetry.priorityTier).toBe(PriorityTier.USER_INTERACTIVE);
      expect(telemetry.modelTier).toBe(ModelTier.STANDARD);
      expect(telemetry.isStreaming).toBe(false);
      expect(telemetry.attemptCount).toBe(1);
      expect(telemetry.circuitState).toBe(CircuitState.CLOSED);
      expect(telemetry.result).toBe(ExecutionResult.SUCCESS);
      expect(telemetry.timestamp).toBeGreaterThan(0);
      expect(Object.isFrozen(telemetry)).toBe(true);
    });

    it("should throw ConfigurationError if requestId or providerId is empty", () => {
      expect(() => {
        createExecutionTelemetry({
          requestId: "   ",
          providerId: "openai",
          concreteModel: "gpt-4o",
          finalState: FsmState.COMPLETED,
          usage: mockUsage,
          latency: mockLatency,
        });
      }).toThrow(ConfigurationError);

      expect(() => {
        createExecutionTelemetry({
          requestId: "req_002",
          providerId: "",
          concreteModel: "gpt-4o",
          finalState: FsmState.COMPLETED,
          usage: mockUsage,
          latency: mockLatency,
        });
      }).toThrow("ExecutionTelemetry requires non-empty providerId and concreteModel strings.");
    });
  });

  describe("RuntimeHealthReport Factory & Invariant Enforcement", () => {
    it("should create a valid default RuntimeHealthReport", () => {
      const report = createRuntimeHealthReport();

      expect(report.activeRequestCount).toBe(0);
      expect(report.queuedRequestCount).toBe(0);
      expect(report.totalCompletedRequests).toBe(0);
      expect(report.totalFailedRequests).toBe(0);
      expect(report.systemUptimeMs).toBe(0);
      expect(report.providerHealthMap).toEqual({});
      expect(Object.isFrozen(report)).toBe(true);
    });

    it("should accept custom provider health maps and operational metrics", () => {
      const report = createRuntimeHealthReport({
        providerHealthMap: { openai: CircuitState.CLOSED, ollama: CircuitState.OPEN },
        activeRequestCount: 3,
        queuedRequestCount: 12,
        totalCompletedRequests: 1500,
        totalFailedRequests: 4,
        systemUptimeMs: 86400000,
      });

      expect(report.providerHealthMap.openai).toBe(CircuitState.CLOSED);
      expect(report.providerHealthMap.ollama).toBe(CircuitState.OPEN);
      expect(report.activeRequestCount).toBe(3);
      expect(report.queuedRequestCount).toBe(12);
      expect(report.totalCompletedRequests).toBe(1500);
      expect(Object.isFrozen(report.providerHealthMap)).toBe(true);
    });

    it("should throw ConfigurationError if any count or uptime metric is negative", () => {
      expect(() => {
        createRuntimeHealthReport({ activeRequestCount: -1 });
      }).toThrow(ConfigurationError);

      try {
        createRuntimeHealthReport({ systemUptimeMs: -500 });
      } catch (err) {
        expect(err).toBeInstanceOf(ConfigurationError);
        expect((err as ConfigurationError).subCode).toBe("NegativeHealthMetrics");
      }
    });
  });

  describe("DiagnosticEvent Factory & Validation", () => {
    it("should create a valid DiagnosticEvent object", () => {
      const event = createDiagnosticEvent({
        eventId: "event_1001",
        category: LogCategory.ORCHESTRATOR,
        level: "INFO",
        component: "RuntimeOrchestrator",
        message: "FSM state transitioned to RESOLVING_PROVIDER",
        metadata: { attempts: 1 },
      });

      expect(event.eventId).toBe("event_1001");
      expect(event.category).toBe(LogCategory.ORCHESTRATOR);
      expect(event.level).toBe("INFO");
      expect(event.component).toBe("RuntimeOrchestrator");
      expect(event.message).toBe("FSM state transitioned to RESOLVING_PROVIDER");
      expect(event.metadata).toEqual({ attempts: 1 });
      expect(Object.isFrozen(event)).toBe(true);
    });

    it("should throw SystemError if eventId, component, or message is empty", () => {
      expect(() => {
        createDiagnosticEvent({
          eventId: "",
          category: LogCategory.SYSTEM,
          level: "ERROR",
          component: "System",
          message: "Test message",
        });
      }).toThrow(SystemError);
    });
  });

  describe("Serialization Helpers", () => {
    it("serializeTelemetry should return a clean frozen JSON representation", () => {
      const telemetry = createExecutionTelemetry({
        requestId: "req_ser_001",
        providerId: "openai",
        concreteModel: "gpt-4o",
        finalState: FsmState.COMPLETED,
        usage: mockUsage,
        latency: mockLatency,
      });

      const serialized = serializeTelemetry(telemetry);

      expect(serialized.requestId).toBe("req_ser_001");
      expect(serialized.providerId).toBe("openai");
      expect(serialized.usage).toEqual(mockUsage);
      expect(Object.isFrozen(serialized)).toBe(true);
    });

    it("serializeHealthReport should return a clean frozen JSON representation", () => {
      const report = createRuntimeHealthReport({
        providerHealthMap: { openai: CircuitState.CLOSED },
        totalCompletedRequests: 100,
      });

      const serialized = serializeHealthReport(report);

      expect(serialized.totalCompletedRequests).toBe(100);
      expect(serialized.providerHealthMap).toEqual({ openai: CircuitState.CLOSED });
      expect(Object.isFrozen(serialized)).toBe(true);
    });
  });
});
