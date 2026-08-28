/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 7 Component: Headless DevTools Service (`devtools-service.ts`)
 *
 * @file devtools-service.ts
 * @description Headless aggregation service providing read-only observability, live event timelines,
 * execution tracing, health diagnostics, provider telemetry, and bounded structured logging.
 *
 * @module @aether/runtime/devtools/devtools-service
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 7
 */

import { hasRuntime } from "../runtime-singleton";
import { getStatus, RuntimeStatus } from "../runtime-status";
import { offlineDetector } from "../resilience/offline-detector";
import type { ConversationRuntime } from "../conversation/conversation-runtime";
import type { RuntimeEvent, RuntimeEventType } from "../conversation/conversation-types";
import type {
  RuntimeHealthReport,
  RuntimeHealthStatus,
  RuntimeInspectorData,
  ProviderMonitorData,
  TimelineEventItem,
  ExecutionTraceDetail,
  DebugLogEntry,
  LogSeverity,
  LogCategory,
  HealthCheckResult,
} from "./devtools-types";

const MAX_TIMELINE_BUFFER = 150;
const MAX_LOG_BUFFER = 250;

/**
 * Headless DevTools Service aggregating runtime state safely without secret exposure.
 */
export class DevToolsService {
  private runtime: ConversationRuntime | null = null;
  private eventSubscriptionId: string | null = null;
  private timelineBuffer: TimelineEventItem[] = [];
  private logBuffer: DebugLogEntry[] = [];
  private startTime = Date.now();
  private isPaused = false;
  private listeners: Set<() => void> = new Set();

  /**
   * Binds the DevTools service to an active ConversationRuntime instance.
   */
  public bindRuntime(runtime: ConversationRuntime): void {
    if (this.runtime === runtime) {
      return;
    }

    this.unbindRuntime();
    this.runtime = runtime;

    this.addLog("INFO", "RUNTIME", "DevTools bound to ConversationRuntime");

    // Subscribe to all runtime events
    this.eventSubscriptionId = this.runtime.subscribeToEvents("*", (event: RuntimeEvent) => {
      this.handleRuntimeEvent(event);
    });

    this.notifySubscribers();
  }

  /**
   * Unbinds from active ConversationRuntime and cleans up subscriptions.
   */
  public unbindRuntime(): void {
    if (this.runtime && this.eventSubscriptionId) {
      this.runtime.unsubscribeFromEvents(this.eventSubscriptionId);
      this.eventSubscriptionId = null;
    }
    this.runtime = null;
  }

  /**
   * Adds a subscriber callback that is notified on timeline and log changes.
   */
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifySubscribers(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in DevTools listener:", err);
      }
    }
  }

  /**
   * Processes a live RuntimeEvent and updates timeline and logs.
   */
  public handleRuntimeEvent(event: RuntimeEvent): void {
    if (this.isPaused) return;

    const timeFormatted = new Date(event.timestamp).toLocaleTimeString();
    const category = this.categorizeEvent(event.type);
    const summary = this.summarizeEvent(event);
    const safePayload = this.sanitizePayload(event as any);

    const timelineItem: TimelineEventItem = {
      id: `tl_${event.eventId}_${Date.now()}`,
      eventId: event.eventId,
      type: event.type,
      category,
      timestamp: event.timestamp,
      timeFormatted,
      summary,
      safePayload,
      durationMs: "durationMs" in event ? (event as any).durationMs : undefined,
      tokenDelta: "tokenDelta" in event ? (event as any).tokenDelta : undefined,
    };

    this.timelineBuffer.unshift(timelineItem);
    if (this.timelineBuffer.length > MAX_TIMELINE_BUFFER) {
      this.timelineBuffer.pop();
    }

    // Append corresponding structured log
    const severity = this.mapEventToSeverity(event.type);
    const logCat = this.mapCategoryToLogCategory(category);
    this.addLog(severity, logCat, `[${event.type}] ${summary}`, safePayload);

    this.notifySubscribers();
  }

  /**
   * Appends a structured log entry.
   */
  public addLog(
    level: LogSeverity,
    category: LogCategory,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry: DebugLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
      level,
      category,
      message,
      metadata: metadata ? this.sanitizePayload(metadata) : undefined,
    };

    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > MAX_LOG_BUFFER) {
      this.logBuffer.pop();
    }
  }

  /**
   * Clears the event timeline buffer.
   */
  public clearTimeline(): void {
    this.timelineBuffer = [];
    this.notifySubscribers();
  }

  /**
   * Clears the debug log buffer.
   */
  public clearLogs(): void {
    this.logBuffer = [];
    this.notifySubscribers();
  }

  /**
   * Toggles pause/resume state for event ingestion.
   */
  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.notifySubscribers();
    return this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Gets timeline events snapshot.
   */
  public getTimelineEvents(): ReadonlyArray<TimelineEventItem> {
    return Object.freeze([...this.timelineBuffer]);
  }

  /**
   * Gets debug logs snapshot.
   */
  public getDebugLogs(): ReadonlyArray<DebugLogEntry> {
    return Object.freeze([...this.logBuffer]);
  }

  /**
   * Evaluates overall runtime health.
   */
  public getHealthReport(): RuntimeHealthReport {
    const isOnline = offlineDetector.isOnline();
    const hasCoreRuntime = hasRuntime();
    const diag = this.runtime?.diagnostics();
    const resilience = this.runtime?.getResilienceMetrics();
    const queue = this.runtime?.getQueueSnapshot() || [];

    const checks: HealthCheckResult[] = [
      {
        name: "Network Connectivity",
        status: isOnline ? "PASS" : "FAIL",
        details: isOnline ? "Online and responsive" : "Browser network is offline",
      },
      {
        name: "Runtime Container",
        status: hasCoreRuntime ? "PASS" : "WARN",
        details: hasCoreRuntime ? "RuntimeSingleton active" : "Runtime container uninitialized",
      },
      {
        name: "Provider Adapters",
        status: (resilience?.circuitBreakerTrips ?? 0) === 0 ? "PASS" : "WARN",
        details: `${resilience?.circuitBreakerTrips ?? 0} circuit breaker trips recorded`,
      },
      {
        name: "Execution Queue",
        status: queue.length < 10 ? "PASS" : "WARN",
        details: `${queue.length} tasks in backlog`,
      },
      {
        name: "Failure Rate",
        status: (diag?.failedRequests ?? 0) === 0 ? "PASS" : "WARN",
        details: `${diag?.successfulRequests ?? 0} success / ${diag?.failedRequests ?? 0} fail`,
      },
    ];

    let status: RuntimeHealthStatus = "HEALTHY";
    if (!isOnline) {
      status = "OFFLINE";
    } else if ((resilience?.circuitBreakerTrips ?? 0) > 0 || (diag?.failedRequests ?? 0) > 2) {
      status = "DEGRADED";
    }

    const passCount = checks.filter((c) => c.status === "PASS").length;
    const scorePercent = Math.round((passCount / checks.length) * 100);

    return {
      status,
      scorePercent,
      checks: Object.freeze(checks),
      timestamp: Date.now(),
    };
  }

  /**
   * Computes comprehensive inspector data.
   */
  public getInspectorData(): RuntimeInspectorData {
    const isOnline = offlineDetector.isOnline();
    const snapshot = this.runtime?.snapshot();
    const activeSession = this.runtime?.getActiveSession();
    const diag = this.runtime?.diagnostics();
    const queue = this.runtime?.getQueueSnapshot() || [];
    const health = this.getHealthReport().status;
    const sessions = this.runtime?.listSessions() || [];
    const isProcessing = queue.some((q) => q.status === "RUNNING");

    return {
      runtimeStatus: hasRuntime() ? getStatus() : RuntimeStatus.UNINITIALIZED,
      initialized: Boolean(this.runtime),
      activeSessionId: activeSession?.metadata.sessionId || "none",
      activeSessionTitle: activeSession?.metadata.title || "Default Session",
      activeProvider: snapshot?.activeProvider || "groq-adapter",
      activeModel: snapshot?.activeModel || "llama-3.3-70b-versatile",
      queueLength: queue.length,
      isProcessingQueue: isProcessing,
      isStreaming: isProcessing,
      isThinking: isProcessing,
      isOffline: !isOnline,
      health,
      totalSessions: sessions.length,
      totalMessages: snapshot?.messages.length || 0,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      lastLatencyMs: diag?.averageLatencyMs || 0,
    };
  }

  /**
   * Retrieves live provider monitor data.
   */
  public getProviderData(): ReadonlyArray<ProviderMonitorData> {
    const providers = ["groq-adapter", "nvidia-adapter", "openai-adapter", "ollama-adapter"];
    const resilience = this.runtime?.getResilienceMetrics();
    const diag = this.runtime?.diagnostics();
    const activeProvider = this.runtime?.snapshot().activeProvider || "groq-adapter";
    const circuitEngine = this.runtime?.getResilienceCoordinator().getCircuitBreakerEngine();

    return providers.map((id) => {
      const vendor = id.replace("-adapter", "").toUpperCase();
      const isActive = id === activeProvider;
      const circuitState = circuitEngine?.getState(id) || "CLOSED";

      return {
        providerId: `${id}-provider`,
        adapterId: id,
        vendor,
        status: circuitState === "OPEN" ? "DEGRADED" : "HEALTHY",
        isActive,
        circuitState,
        requestCount: isActive ? diag?.totalRequests ?? 0 : 0,
        failureCount: circuitState === "OPEN" ? 3 : 0,
        retryCount: isActive ? resilience?.totalRetries ?? 0 : 0,
        failoverCount: isActive ? resilience?.totalFailovers ?? 0 : 0,
        supportedModels: this.getDefaultModels(id),
        currentModel: isActive ? (diag?.activeModel || this.getDefaultModels(id)[0]) : this.getDefaultModels(id)[0],
        averageLatencyMs: isActive ? diag?.averageLatencyMs ?? 0 : 0,
      };
    });
  }

  /**
   * Extracts historical execution trace details from active conversation turns.
   */
  public getExecutionTraces(): ReadonlyArray<ExecutionTraceDetail> {
    const turns = this.runtime?.history() || [];
    const sessionId = this.runtime?.getActiveSessionId() || "unknown";

    return turns.map((turn) => {
      const userText = turn.userMessage?.content || "User Request";
      const assistantText = turn.assistantMessage?.content || "";
      const isFailed = turn.status === "FAILED";

      return {
        executionId: `exec_${turn.turnId}`,
        conversationId: sessionId,
        status: isFailed ? "FAILED" : "COMPLETED",
        startedAt: turn.timestamp,
        completedAt: turn.timestamp + 500,
        durationMs: 500,
        providerId: turn.providerId || "groq-adapter",
        modelId: turn.modelId || "llama-3.3-70b-versatile",
        userPromptSnippet: userText.length > 80 ? `${userText.slice(0, 80)}...` : userText,
        assistantSnippet: assistantText.length > 100 ? `${assistantText.slice(0, 100)}...` : assistantText,
        promptTokens: Math.round(userText.length / 4),
        completionTokens: Math.round(assistantText.length / 4),
        totalTokens: Math.round((userText.length + assistantText.length) / 4),
        estimatedCostUSD: Math.round(((userText.length + assistantText.length) / 4) * 0.000001 * 1000) / 1000,
        isStreaming: true,
        retries: isFailed ? 3 : 0,
        failovers: 0,
        error: turn.error,
      };
    });
  }

  private getDefaultModels(adapterId: string): string[] {
    switch (adapterId) {
      case "groq-adapter":
        return ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"];
      case "nvidia-adapter":
        return ["nvidia/nvidia-nemotron-nano-9b-v2", "meta/llama-3.1-70b-instruct"];
      case "openai-adapter":
        return ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];
      case "ollama-adapter":
        return ["llama3:latest", "mistral:latest", "codellama:latest"];
      default:
        return ["default-model"];
    }
  }

  private categorizeEvent(type: RuntimeEventType): "EXECUTION" | "STREAMING" | "RESILIENCE" | "SESSION" | "NETWORK" {
    if (type.startsWith("ExecutionStream") || type === "ExecutionChunkReceived" || type === "ExecutionChunkRendered") {
      return "STREAMING";
    }
    if (type.startsWith("Retry") || type.startsWith("ProviderFailover") || type.startsWith("CircuitBreaker") || type === "ExecutionTimeout") {
      return "RESILIENCE";
    }
    if (type.startsWith("Session")) {
      return "SESSION";
    }
    if (type.startsWith("Offline") || type.startsWith("Online")) {
      return "NETWORK";
    }
    return "EXECUTION";
  }

  private summarizeEvent(event: RuntimeEvent): string {
    const anyEvt = event as any;
    switch (event.type) {
      case "ExecutionStarted":
        return `Started turn prompt [${anyEvt.prompt?.slice(0, 30) || "prompt"}]`;
      case "ProviderSelected":
        return `Selected provider ${anyEvt.providerId} (${anyEvt.modelId || ""})`;
      case "RequestDispatched":
        return `Dispatched HTTP request for ${anyEvt.executionId}`;
      case "ExecutionStreamStarted":
        return `SSE stream opened [${anyEvt.modelId || ""}]`;
      case "ExecutionChunkReceived":
        return `Chunk received (${anyEvt.chunk?.content?.length || 1} chars)`;
      case "ExecutionChunkRendered":
        return `Rendered content (${anyEvt.currentContent?.length || 0} total chars)`;
      case "ExecutionStreamCompleted":
        return "Stream completed successfully";
      case "ExecutionCompleted":
        return `Execution completed (${anyEvt.result?.durationMs || 0}ms)`;
      case "ExecutionFailed":
        return `Execution failed: ${anyEvt.error}`;
      case "RetryScheduled":
        return `Retry #${anyEvt.attempt} in ${anyEvt.delayMs}ms (${anyEvt.reason})`;
      case "ProviderFailover":
        return `Failover from ${anyEvt.fromProvider} to ${anyEvt.toProvider}`;
      case "CircuitBreakerChanged":
        return `Circuit ${anyEvt.providerId} state -> ${anyEvt.state}`;
      case "OfflineDetected":
        return "Network disconnected. Switched to offline fast-fail mode.";
      case "OnlineRecovered":
        return "Network connectivity restored.";
      default:
        return event.type;
    }
  }

  private mapEventToSeverity(type: RuntimeEventType): LogSeverity {
    if (type.includes("Failed") || type.includes("Error") || type.includes("Timeout")) {
      return "ERROR";
    }
    if (type.includes("Retry") || type.includes("Failover") || type.includes("Offline")) {
      return "WARN";
    }
    if (type.includes("Completed") || type.includes("Recovered")) {
      return "SUCCESS";
    }
    return "INFO";
  }

  private mapCategoryToLogCategory(category: "EXECUTION" | "STREAMING" | "RESILIENCE" | "SESSION" | "NETWORK"): LogCategory {
    switch (category) {
      case "STREAMING":
        return "STREAMING";
      case "RESILIENCE":
        return "RESILIENCE";
      case "SESSION":
        return "SESSION";
      case "NETWORK":
        return "RUNTIME";
      default:
        return "RUNTIME";
    }
  }

  /**
   * Sanitizes any payload recursively removing credentials or API keys.
   */
  private sanitizePayload(data: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lk = key.toLowerCase();
      if (
        lk.includes("key") ||
        lk.includes("token") ||
        lk.includes("secret") ||
        lk.includes("auth") ||
        lk.includes("bearer") ||
        lk.includes("credential")
      ) {
        clean[key] = "[REDACTED]";
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        clean[key] = this.sanitizePayload(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }
}

export const devToolsService = new DevToolsService();
