import { describe, it, expect, beforeEach } from "vitest";
import { DevToolsService } from "../devtools-service";
import { ConversationRuntime } from "../../conversation/conversation-runtime";
import type { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-runtime";

describe("Phase 9.11 Milestone 7: DevTools Service Unit Tests", () => {
  let devTools: DevToolsService;
  let mockRuntime: ConversationRuntime;

  beforeEach(() => {
    devTools = new DevToolsService();
    const mockUnified: any = {
      execute: async () => ({
        responseId: "resp_1",
        requestId: "req_1",
        modelId: "llama-3.3-70b-versatile",
        message: { id: "m_1", role: "assistant", content: "Hello devtools", timestamp: Date.now() },
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      }),
    };
    mockRuntime = new ConversationRuntime(mockUnified as UnifiedAdapterRuntime);
  });

  it("binds to ConversationRuntime and subscribes to events cleanly", () => {
    devTools.bindRuntime(mockRuntime);
    const inspectorData = devTools.getInspectorData();

    expect(inspectorData.initialized).toBe(true);
    expect(inspectorData.activeProvider).toBe("groq-adapter");
    expect(inspectorData.queueLength).toBe(0);
  });

  it("ingests runtime events into live timeline and structured debug logs", () => {
    devTools.bindRuntime(mockRuntime);

    // Emit event directly on runtime
    (mockRuntime as any).events.emit({
      eventId: "evt_test_1",
      type: "ExecutionStarted",
      conversationId: "sess_1",
      executionId: "exec_1",
      turnNumber: 1,
      modelId: "llama-3.3-70b-versatile",
      timestamp: Date.now(),
    });

    const timeline = devTools.getTimelineEvents();
    const logs = devTools.getDebugLogs();

    expect(timeline.length).toBeGreaterThanOrEqual(1);
    expect(timeline[0].type).toBe("ExecutionStarted");
    expect(timeline[0].category).toBe("EXECUTION");
    expect(timeline[0].summary).toContain("Started turn");

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].level).toBe("INFO");
    expect(logs[0].message).toContain("[ExecutionStarted]");
  });

  it("supports pause and resume toggling", () => {
    devTools.bindRuntime(mockRuntime);

    const isPaused = devTools.togglePause();
    expect(isPaused).toBe(true);

    // Emit event while paused
    (mockRuntime as any).events.emit({
      eventId: "evt_paused_test",
      type: "ExecutionStarted",
      conversationId: "sess_1",
      executionId: "exec_2",
      turnNumber: 2,
      modelId: "llama-3.3-70b-versatile",
      timestamp: Date.now(),
    });

    // Timeline count should not increase while paused
    const timeline = devTools.getTimelineEvents();
    expect(timeline.find((t) => t.eventId === "evt_paused_test")).toBeUndefined();

    devTools.togglePause();
    expect(devTools.getIsPaused()).toBe(false);
  });

  it("clears timeline and logs upon request", () => {
    devTools.bindRuntime(mockRuntime);
    devTools.addLog("WARN", "RESILIENCE", "Test resilience warning");

    expect(devTools.getDebugLogs().length).toBeGreaterThan(0);

    devTools.clearLogs();
    expect(devTools.getDebugLogs()).toHaveLength(0);

    devTools.clearTimeline();
    expect(devTools.getTimelineEvents()).toHaveLength(0);
  });

  it("returns multi-provider telemetry without credentials", () => {
    devTools.bindRuntime(mockRuntime);
    const providers = devTools.getProviderData();

    expect(providers).toHaveLength(4);
    const groq = providers.find((p) => p.adapterId === "groq-adapter");
    expect(groq).toBeDefined();
    expect(groq?.vendor).toBe("GROQ");
    expect(groq?.circuitState).toBe("CLOSED");
    expect(groq?.supportedModels).toContain("llama-3.3-70b-versatile");
  });
});
