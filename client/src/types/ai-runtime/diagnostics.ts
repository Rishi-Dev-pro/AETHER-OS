/**
 * AETHER OS — Phase 9.4 LLM Integration Layer (AI Runtime)
 * Component 7: Runtime Diagnostics Contracts (`diagnostics.ts`)
 *
 * @file diagnostics.ts
 * @description Immutable diagnostic contracts, execution telemetry models, health report
 * structures, and diagnostic factory functions for Phase 9.4 AI Runtime.
 *
 * @module @aether/ai-runtime/diagnostics
 * @version 1.0.0
 * @status FROZEN SPECIFICATION COMPLIANT
 */

import {
  FsmState,
  PriorityTier,
  ModelTier,
  CircuitState,
  ExecutionResult,
  LogCategory,
  type TokenUsage,
  type LatencyMetrics,
  type CorrelationContext,
} from "./types";
import { SystemError, ConfigurationError } from "./errors";

// ============================================================================
// 1. RUNTIME DEEP FREEZE HELPER (SHARED INTERNAL UTILITY)
// ============================================================================

import { deepFreeze } from "./internal/deep-freeze";


// ============================================================================
// 2. DIAGNOSTIC DATA CONTRACT INTERFACES
// ============================================================================

/**
 * Immutable execution telemetry model summarizing a completed request lifecycle.
 */
export interface ExecutionTelemetry {
  /** Unique request execution identifier */
  readonly requestId: string;
  /** End-to-end correlation context (sessionId, snapshotId, intentId) */
  readonly correlationContext: CorrelationContext;
  /** Provider identifier (e.g. "openai", "gemini", "ollama") */
  readonly providerId: string;
  /** Concrete vendor model handle (e.g. "gpt-4o") */
  readonly concreteModel: string;
  /** Priority tier assigned by scheduler */
  readonly priorityTier: PriorityTier;
  /** Abstract model capability tier requested */
  readonly modelTier: ModelTier;
  /** Final state of the FSM upon execution termination */
  readonly finalState: FsmState;
  /** True if execution was processed via real-time streaming */
  readonly isStreaming: boolean;
  /** Unified token consumption metrics */
  readonly usage: TokenUsage;
  /** Fine-grained execution latency breakdown */
  readonly latency: LatencyMetrics;
  /** Total transport attempt count (1 + retries) */
  readonly attemptCount: number;
  /** Circuit breaker status at time of execution */
  readonly circuitState: CircuitState;
  /** Final execution outcome summary */
  readonly result: ExecutionResult;
  /** Completion timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Immutable runtime health report capturing system status and provider availability.
 */
export interface RuntimeHealthReport {
  /** Map of provider identifiers to their current CircuitState */
  readonly providerHealthMap: Readonly<Record<string, CircuitState>>;
  /** Number of active requests currently executing in transport */
  readonly activeRequestCount: number;
  /** Number of requests currently queued in scheduler queues */
  readonly queuedRequestCount: number;
  /** Cumulative count of successfully completed requests */
  readonly totalCompletedRequests: number;
  /** Cumulative count of failed requests */
  readonly totalFailedRequests: number;
  /** Subsystem uptime in milliseconds */
  readonly systemUptimeMs: number;
  /** Report creation timestamp (epoch ms) */
  readonly timestamp: number;
}

/**
 * Diagnostic log level classification.
 */
export type DiagnosticLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

/**
 * Immutable diagnostic event envelope for internal audit and logging pipelines.
 */
export interface DiagnosticEvent {
  /** Unique diagnostic event instance identifier */
  readonly eventId: string;
  /** Structured logging category */
  readonly category: LogCategory;
  /** Diagnostic log level severity */
  readonly level: DiagnosticLogLevel;
  /** Subsystem component name emitting the event */
  readonly component: string;
  /** Diagnostic message content */
  readonly message: string;
  /** Event creation timestamp (epoch ms) */
  readonly timestamp: number;
  /** Optional key-value metadata descriptor */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Comprehensive runtime diagnostic snapshot combining telemetry history and health status.
 */
export interface DiagnosticSnapshot {
  /** Unique snapshot identifier */
  readonly snapshotId: string;
  /** Active runtime health report */
  readonly healthReport: RuntimeHealthReport;
  /** Historical array of recent execution telemetry records */
  readonly recentTelemetry: readonly ExecutionTelemetry[];
  /** Snapshot creation timestamp (epoch ms) */
  readonly timestamp: number;
}


// ============================================================================
// 3. FACTORIES & INVARIANT VALIDATORS
// ============================================================================

/**
 * Parameters passed to createExecutionTelemetry factory function.
 */
export interface CreateExecutionTelemetryParams {
  readonly requestId: string;
  readonly correlationContext?: CorrelationContext;
  readonly providerId: string;
  readonly concreteModel: string;
  readonly priorityTier?: PriorityTier;
  readonly modelTier?: ModelTier;
  readonly finalState: FsmState;
  readonly isStreaming?: boolean;
  readonly usage: TokenUsage;
  readonly latency: LatencyMetrics;
  readonly attemptCount?: number;
  readonly circuitState?: CircuitState;
  readonly result?: ExecutionResult;
}

/**
 * Factory function creating an immutable ExecutionTelemetry object.
 * Validates invariants and applies deep freeze.
 *
 * @throws {ConfigurationError} If any invariant check fails.
 */
export function createExecutionTelemetry(params: CreateExecutionTelemetryParams): Readonly<ExecutionTelemetry> {
  if (!params) {
    throw new ConfigurationError({
      subCode: "NullTelemetryParams",
      message: "createExecutionTelemetry parameters object cannot be null or undefined.",
    });
  }

  if (!params.requestId || typeof params.requestId !== "string" || params.requestId.trim() === "") {
    throw new ConfigurationError({
      subCode: "InvalidRequestId",
      message: "ExecutionTelemetry requires a non-empty requestId string.",
    });
  }

  if (!params.providerId || typeof params.providerId !== "string" || !params.concreteModel || typeof params.concreteModel !== "string") {
    throw new ConfigurationError({
      subCode: "InvalidProviderOrModel",
      message: "ExecutionTelemetry requires non-empty providerId and concreteModel strings.",
    });
  }

  if (!params.usage || params.usage.totalTokens < 0) {
    throw new ConfigurationError({
      subCode: "InvalidUsageMetrics",
      message: "ExecutionTelemetry requires valid TokenUsage metrics.",
    });
  }

  if (!params.latency || params.latency.totalExecutionDurationMs < 0) {
    throw new ConfigurationError({
      subCode: "InvalidLatencyMetrics",
      message: "ExecutionTelemetry requires valid LatencyMetrics.",
    });
  }

  const correlationContext: CorrelationContext = {
    sessionId: params.correlationContext?.sessionId ?? "default_session",
    snapshotId: params.correlationContext?.snapshotId ?? "unknown_snapshot",
    intentId: params.correlationContext?.intentId ?? "unknown_intent",
    tenantId: params.correlationContext?.tenantId,
    traceId: params.correlationContext?.traceId,
  };

  const rawTelemetry: ExecutionTelemetry = {
    requestId: params.requestId,
    correlationContext,
    providerId: params.providerId,
    concreteModel: params.concreteModel,
    priorityTier: params.priorityTier ?? PriorityTier.USER_INTERACTIVE,
    modelTier: params.modelTier ?? ModelTier.STANDARD,
    finalState: params.finalState,
    isStreaming: params.isStreaming ?? false,
    usage: { ...params.usage },
    latency: { ...params.latency },
    attemptCount: params.attemptCount ?? 1,
    circuitState: params.circuitState ?? CircuitState.CLOSED,
    result: params.result ?? ExecutionResult.SUCCESS,
    timestamp: Date.now(),
  };

  return deepFreeze(rawTelemetry);
}

/**
 * Parameters passed to createRuntimeHealthReport factory function.
 */
export interface CreateRuntimeHealthReportParams {
  readonly providerHealthMap?: Record<string, CircuitState>;
  readonly activeRequestCount?: number;
  readonly queuedRequestCount?: number;
  readonly totalCompletedRequests?: number;
  readonly totalFailedRequests?: number;
  readonly systemUptimeMs?: number;
}

/**
 * Factory function creating an immutable RuntimeHealthReport object.
 * Applies default parameters, validates invariants, and enforces deep freeze.
 *
 * @throws {ConfigurationError} If any metric count is negative.
 */
export function createRuntimeHealthReport(params: CreateRuntimeHealthReportParams = {}): Readonly<RuntimeHealthReport> {
  const activeRequestCount = params.activeRequestCount ?? 0;
  const queuedRequestCount = params.queuedRequestCount ?? 0;
  const totalCompletedRequests = params.totalCompletedRequests ?? 0;
  const totalFailedRequests = params.totalFailedRequests ?? 0;
  const systemUptimeMs = params.systemUptimeMs ?? 0;

  if (activeRequestCount < 0 || queuedRequestCount < 0 || totalCompletedRequests < 0 || totalFailedRequests < 0 || systemUptimeMs < 0) {
    throw new ConfigurationError({
      subCode: "NegativeHealthMetrics",
      message: "Health report counts and uptime metrics cannot be negative.",
    });
  }

  const rawReport: RuntimeHealthReport = {
    providerHealthMap: { ...(params.providerHealthMap ?? {}) },
    activeRequestCount,
    queuedRequestCount,
    totalCompletedRequests,
    totalFailedRequests,
    systemUptimeMs,
    timestamp: Date.now(),
  };

  return deepFreeze(rawReport);
}

/**
 * Parameters passed to createDiagnosticEvent factory function.
 */
export interface CreateDiagnosticEventParams {
  readonly eventId: string;
  readonly category: LogCategory;
  readonly level: DiagnosticLogLevel;
  readonly component: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Factory function creating an immutable DiagnosticEvent object.
 *
 * @throws {SystemError} If event ID, component, or message is empty.
 */
export function createDiagnosticEvent(params: CreateDiagnosticEventParams): Readonly<DiagnosticEvent> {
  if (!params || !params.eventId || !params.component || !params.message) {
    throw new SystemError({
      subCode: "InvalidDiagnosticEventParams",
      message: "DiagnosticEvent requires non-empty eventId, component, and message parameters.",
    });
  }

  const rawEvent: DiagnosticEvent = {
    eventId: params.eventId,
    category: params.category,
    level: params.level,
    component: params.component,
    message: params.message,
    timestamp: Date.now(),
    metadata: params.metadata ? { ...params.metadata } : undefined,
  };

  return deepFreeze(rawEvent);
}


// ============================================================================
// 4. SERIALIZATION HELPERS
// ============================================================================

/**
 * Returns a clean JSON representation of an ExecutionTelemetry object.
 */
export function serializeTelemetry(telemetry: ExecutionTelemetry): Readonly<Record<string, unknown>> {
  if (!telemetry) {
    throw new SystemError({
      subCode: "NullTelemetrySerialization",
      message: "Cannot serialize null or undefined ExecutionTelemetry object.",
    });
  }

  return Object.freeze({
    requestId: telemetry.requestId,
    providerId: telemetry.providerId,
    concreteModel: telemetry.concreteModel,
    priorityTier: telemetry.priorityTier,
    modelTier: telemetry.modelTier,
    finalState: telemetry.finalState,
    isStreaming: telemetry.isStreaming,
    usage: telemetry.usage,
    latency: telemetry.latency,
    attemptCount: telemetry.attemptCount,
    circuitState: telemetry.circuitState,
    result: telemetry.result,
    timestamp: telemetry.timestamp,
    correlationContext: telemetry.correlationContext,
  });
}

/**
 * Returns a clean JSON representation of a RuntimeHealthReport object.
 */
export function serializeHealthReport(report: RuntimeHealthReport): Readonly<Record<string, unknown>> {
  if (!report) {
    throw new SystemError({
      subCode: "NullReportSerialization",
      message: "Cannot serialize null or undefined RuntimeHealthReport object.",
    });
  }

  return Object.freeze({
    providerHealthMap: report.providerHealthMap,
    activeRequestCount: report.activeRequestCount,
    queuedRequestCount: report.queuedRequestCount,
    totalCompletedRequests: report.totalCompletedRequests,
    totalFailedRequests: report.totalFailedRequests,
    systemUptimeMs: report.systemUptimeMs,
    timestamp: report.timestamp,
  });
}
