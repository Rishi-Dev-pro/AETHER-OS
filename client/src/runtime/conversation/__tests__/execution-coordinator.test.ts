/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Execution Coordinator (`execution-coordinator.test.ts`)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExecutionCoordinator } from "../execution-coordinator";
import { ConversationState } from "../conversation-state";
import { ConversationHistory } from "../conversation-history";
import { RuntimeEvents } from "../runtime-events";
import { RuntimeDiagnostics } from "../runtime-diagnostics";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import { AdapterManager } from "../../../types/provider-adapters/adapter-manager";
import { CredentialVault, ProviderManager } from "../../../types/provider-runtime";
import { GroqAdapter } from "../../../types/provider-adapters/groq-adapter";
import type { TranslationResponse } from "../../../types/provider-adapters/message-types";
import { desktopActionDispatcher } from "../../../services/desktopActionDispatcher";

describe("Phase 9.11 Milestone 2 Execution Coordinator Unit Tests", () => {
  let runtime: UnifiedAdapterRuntime;
  let state: ConversationState;
  let history: ConversationHistory;
  let events: RuntimeEvents;
  let diagnostics: RuntimeDiagnostics;
  let coordinator: ExecutionCoordinator;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const vault = new CredentialVault();
    vault.registerCredential("groq-credential-id", "groq-provider", "API_KEY" as any, { apiKey: "gsk_test_groq_key" });

    const adapterManager = new AdapterManager();
    adapterManager.registerAdapter(new GroqAdapter());

    const providerManager = new ProviderManager(undefined, vault);
    runtime = new UnifiedAdapterRuntime(adapterManager, vault, providerManager);
    await runtime.initialize();

    state = new ConversationState("conv_coord_1");
    history = new ConversationHistory();
    events = new RuntimeEvents();
    diagnostics = new RuntimeDiagnostics();

    coordinator = new ExecutionCoordinator(runtime, state, history, events, diagnostics);
  });

  it("should execute request, append messages to state, update history, and emit runtime events", async () => {
    const mockResponse: TranslationResponse = {
      responseId: "resp_123",
      requestId: "req_123",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_ast_123",
        role: "assistant",
        content: "Hello! I am Groq AI.",
        timestamp: Date.now(),
      },
      finishReason: "stop",
      usage: { promptTokens: 12, completionTokens: 10, totalTokens: 22 },
      timestamp: Date.now(),
    };

    // Mock runtime execution
    runtime.execute = async () => mockResponse;

    const result = await coordinator.execute("groq-adapter", "Hello Groq");

    expect(result.response.message.content).toBe("Hello! I am Groq AI.");
    expect(state.getMessages().length).toBe(2);
    expect(history.listTurns().length).toBe(1);
    expect(events.createSnapshot().length).toBe(7);
    expect(diagnostics.createSnapshot().successfulRequests).toBe(1);
  });

  it("should handle conversational tool calling: invoke tool, append tool message, and resolve final answer", async () => {
    vi.spyOn(desktopActionDispatcher, "dispatch").mockResolvedValue({
      actionId: "act_test_chrome",
      type: "open_app",
      success: true,
      message: "Google Chrome opened successfully",
      durationMs: 20,
      timestamp: Date.now(),
    });

    // Turn 1: LLM decides to call open_app
    const toolCallResponse: TranslationResponse = {
      responseId: "resp_tc_1",
      requestId: "req_tc_1",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_ast_tc_1",
        role: "assistant",
        content: "I will open Google Chrome for you.",
        toolCalls: [
          {
            id: "call_open_chrome",
            type: "function",
            name: "open_app",
            arguments: { app: "chrome" },
          },
        ],
        timestamp: Date.now(),
      },
      finishReason: "tool_calls",
      usage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 },
      timestamp: Date.now(),
    };

    // Turn 2: LLM summarizes the completed action
    const followUpResponse: TranslationResponse = {
      responseId: "resp_followup_2",
      requestId: "req_followup_2",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_ast_followup_2",
        role: "assistant",
        content: "Google Chrome is now open and ready.",
        timestamp: Date.now(),
      },
      finishReason: "stop",
      usage: { promptTokens: 50, completionTokens: 12, totalTokens: 62 },
      timestamp: Date.now(),
    };

    let callCount = 0;
    runtime.execute = async () => {
      callCount++;
      return callCount === 1 ? toolCallResponse : followUpResponse;
    };

    const result = await coordinator.execute("groq-adapter", "Open Google Chrome please");

    expect(callCount).toBe(2);
    expect(result.response.message.content).toBe("Google Chrome is now open and ready.");

    const messages = state.getMessages();
    // 1: user, 2: assistant (with tool call), 3: tool result, 4: final assistant
    expect(messages.length).toBe(4);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].toolCalls?.length).toBe(1);
    expect(messages[2].role).toBe("tool");
    expect(messages[2].toolCallId).toBe("call_open_chrome");
    expect(messages[3].role).toBe("assistant");
    expect(messages[3].content).toBe("Google Chrome is now open and ready.");

    const snapshot = events.createSnapshot();
    const eventTypes = snapshot.map((e) => e.type);
    expect(eventTypes).toContain("ToolExecutionStarted");
    expect(eventTypes).toContain("ToolExecutionCompleted");
    expect(history.listTurns().length).toBe(1);
    expect(history.listTurns()[0].status).toBe("COMPLETED");
  });

  it("should stop re-invoking LLM after reaching MAX_TOOL_TURNS limit", async () => {
    vi.spyOn(desktopActionDispatcher, "dispatch").mockResolvedValue({
      actionId: "act_test_vol",
      type: "adjust_volume",
      success: true,
      message: "Volume increased",
      durationMs: 10,
      timestamp: Date.now(),
    });

    // LLM continuously returns tool calls
    const infiniteToolResponse: TranslationResponse = {
      responseId: "resp_loop",
      requestId: "req_loop",
      modelId: "llama-3.3-70b-versatile",
      message: {
        id: "msg_loop",
        role: "assistant",
        toolCalls: [
          {
            id: "call_vol",
            type: "function",
            name: "adjust_volume",
            arguments: { direction: "up" },
          },
        ],
        timestamp: Date.now(),
      },
      finishReason: "tool_calls",
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
      timestamp: Date.now(),
    };

    let executionCount = 0;
    runtime.execute = async () => {
      executionCount++;
      return infiniteToolResponse;
    };

    const result = await coordinator.execute("groq-adapter", "Turn it up indefinitely");

    // Loop capped at MAX_TOOL_TURNS (3)
    expect(executionCount).toBe(3);
    expect(result.response.finishReason).toBe("tool_calls");
  });
});
