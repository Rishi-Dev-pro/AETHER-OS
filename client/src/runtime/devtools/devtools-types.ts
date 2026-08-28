/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 7 Component: Runtime DevTools Domain Types (`devtools-types.ts`)
 *
 * @file devtools-types.ts
 * @description Strongly-typed contracts for runtime inspection, provider monitoring,
 * live event timeline telemetry, execution traces, health monitoring, and structured debug logging.
 *
 * @module @aether/runtime/devtools/devtools-types
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 7
 */

import type { RuntimeStatus } from "../runtime-status";
import type { CircuitBreakerState } from "../../types/provider-runtime/enums";
import type { RuntimeEventType } from "../conversation/conversation-types";

/**
 * High-level runtime health classification.
 */
export type RuntimeHealthStatus = "HEALTHY" | "DEGRADED" | "OFFLINE" | "RECOVERING";

/**
 * Active DevTools tab selection.
 */
export type DevToolsTab =
  | "runtime"
  | "providers"
  | "timeline"
  | "executions"
  | "conversations"
  | "tokens"
  | "performance"
  | "resilience"
  | "queue"
  | "health"
  | "logs";

/**
 * Diagnostic health check item.
 */
export interface HealthCheckResult {
  readonly name: string;
  readonly status: "PASS" | "WARN" | "FAIL";
  readonly details: string;
}

/**
 * Comprehensive runtime health evaluation report.
 */
export interface RuntimeHealthReport {
  readonly status: RuntimeHealthStatus;
  readonly scorePercent: number;
  readonly checks: ReadonlyArray<HealthCheckResult>;
  readonly timestamp: number;
}

/**
 * Comprehensive snapshot of runtime state for Runtime Inspector tab.
 */
export interface RuntimeInspectorData {
  readonly runtimeStatus: RuntimeStatus;
  readonly initialized: boolean;
  readonly activeSessionId: string;
  readonly activeSessionTitle: string;
  readonly activeProvider: string;
  readonly activeModel: string;
  readonly queueLength: number;
  readonly isProcessingQueue: boolean;
  readonly isStreaming: boolean;
  readonly isThinking: boolean;
  readonly isOffline: boolean;
  readonly health: RuntimeHealthStatus;
  readonly totalSessions: number;
  readonly totalMessages: number;
  readonly uptimeSeconds: number;
  readonly lastLatencyMs: number;
}

/**
 * Safe provider telemetry representation for Provider Monitor tab.
 */
export interface ProviderMonitorData {
  readonly providerId: string;
  readonly adapterId: string;
  readonly vendor: string;
  readonly status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  readonly isActive: boolean;
  readonly circuitState: CircuitBreakerState | "CLOSED";
  readonly requestCount: number;
  readonly failureCount: number;
  readonly retryCount: number;
  readonly failoverCount: number;
  readonly supportedModels: ReadonlyArray<string>;
  readonly currentModel: string;
  readonly averageLatencyMs: number;
}

/**
 * Safe live event timeline entry.
 */
export interface TimelineEventItem {
  readonly id: string;
  readonly eventId: string;
  readonly type: RuntimeEventType;
  readonly category: "EXECUTION" | "STREAMING" | "RESILIENCE" | "SESSION" | "NETWORK";
  readonly timestamp: number;
  readonly timeFormatted: string;
  readonly summary: string;
  readonly safePayload: Record<string, unknown>;
  readonly durationMs?: number;
  readonly tokenDelta?: number;
}

/**
 * Detailed execution trace item.
 */
export interface ExecutionTraceDetail {
  readonly executionId: string;
  readonly conversationId: string;
  readonly status: "COMPLETED" | "FAILED" | "CANCELLED" | "RUNNING";
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly durationMs: number;
  readonly providerId: string;
  readonly modelId: string;
  readonly userPromptSnippet: string;
  readonly assistantSnippet: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUSD: number;
  readonly isStreaming: boolean;
  readonly retries: number;
  readonly failovers: number;
  readonly error?: string;
}

/**
 * Structured debug log entry for Debug Console.
 */
export type LogSeverity = "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG";
export type LogCategory = "RUNTIME" | "PROVIDER" | "STREAMING" | "RESILIENCE" | "SESSION" | "VOICE";

export interface DebugLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly timeFormatted: string;
  readonly level: LogSeverity;
  readonly category: LogCategory;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}
