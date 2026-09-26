/**
 * AETHER OS — Phase 9.11 Milestone 5
 * Unit Tests: Context Pruning & Token Budgeting (`context-pruning.test.ts`)
 */

import { describe, it, expect, vi } from "vitest";
import { ExecutionCoordinator } from "../execution-coordinator";
import { ConversationState } from "../conversation-state";
import { ConversationHistory } from "../conversation-history";
import { RuntimeEvents } from "../runtime-events";
import { RuntimeDiagnostics } from "../runtime-diagnostics";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import { ProviderManager } from "../../../types/provider-runtime/provider-manager";
import { AdapterManager } from "../../../types/provider-adapters/adapter-manager";
import { CredentialVault } from "../../../types/provider-runtime/credential-vault";
import { ResilienceCoordinator } from "../../resilience/resilience-coordinator";
import { CircuitBreakerEngine } from "../../../types/provider-runtime/circuit-breaker-engine";

describe("Context Pruning & Token Budgeting", () => {
  it("prunes oldest non-protected messages when exceeding token budget while preserving canonical history", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_prune_test", "System prompt for testing", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Add 10 turns (20 messages) with long text
    for (let i = 1; i <= 10; i++) {
      state.appendUserMessage(`User query turn ${i} - ${"long repetitive text padding content ".repeat(15)}`);
      state.appendAssistantMessage(`Assistant response turn ${i} - ${"detailed answer output text ".repeat(15)}`);
    }

    const initialMessageCount = state.getMessages().length;
    expect(initialMessageCount).toBe(20); // 20 dialogue messages (10 turns)

    // Prune for request context with a tight budget (targetMaxTokens = 1500, reserve = 500 => available = 1000)
    let pruneEventFired = false;
    events.subscribe("ContextPruned", () => {
      pruneEventFired = true;
    });

    const request = coordinator.prepareRequestContext("conv_prune_test", "exec_1", "llama-3.3-70b-versatile", 1500, 500);

    // Outgoing request messages should be trimmed to fit budget
    expect(request.context.messages.length).toBeLessThan(initialMessageCount);
    expect(pruneEventFired).toBe(true);

    // Canonical state must remain COMPLETELY UNTOUCHED!
    expect(state.getMessages().length).toBe(initialMessageCount);

    // Recent turns (last turn) must be in the request
    const lastUserMsg = state.getMessages()[state.getMessages().length - 2];
    const requestContainsLastUser = request.context.messages.some((m) => m.content === lastUserMsg.content);
    expect(requestContainsLastUser).toBe(true);
  });

  it("ensures orphaned tool messages are never present at the beginning of pruned context", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_tool_prune", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Turn 1: User message with long padding
    state.appendUserMessage(`User query 1 - ${"padding text ".repeat(30)}`);
    // Turn 1: Assistant with tool call
    state.appendAssistantMessage("", undefined, [
      {
        id: "call_tool_1",
        type: "function",
        name: "open_app",
        arguments: { app: "chrome" },
      },
    ]);
    // Turn 1: Tool execution message
    state.appendToolMessage("call_tool_1", "open_app", JSON.stringify({ success: true, message: "Chrome opened" }));
    // Turn 1: Assistant final response
    state.appendAssistantMessage(`Chrome has opened. ${"extra details ".repeat(20)}`);

    // Turn 2: Recent turn
    state.appendUserMessage("User query 2 - What is the weather?");
    state.appendAssistantMessage("It is sunny today.");

    // Prune with tight budget forcing partial eviction of Turn 1
    const request = coordinator.prepareRequestContext("conv_tool_prune", "exec_2", "llama-3.3-70b-versatile", 700, 200);

    // The first message in the outgoing context must NEVER be a tool message!
    if (request.context.messages.length > 0) {
      expect(request.context.messages[0].role).not.toBe("tool");
    }

    // Every tool message in request context must be preceded by an assistant message containing the matching toolCallId
    const messages = request.context.messages;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "tool") {
        expect(i).toBeGreaterThan(0);
        const prevMsg = messages[i - 1];
        expect(prevMsg.role).toBe("assistant");
        if (prevMsg.role === "assistant") {
          const hasMatchingToolCall = prevMsg.toolCalls?.some((tc) => tc.id === (messages[i] as any).toolCallId);
          expect(hasMatchingToolCall).toBe(true);
        }
      }
    }
  });

  it("preserves assistant message with tool calls when pruning attached tool messages would cross protectedCount boundary", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_protect_boundary", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Message 0: User query (large enough to exceed 500 token budget)
    state.appendUserMessage(`Initial greeting - ${"text ".repeat(150)}`);

    // Message 1: Assistant with tool calls
    state.appendAssistantMessage("", undefined, [
      { id: "call_vol_1", type: "function", name: "adjust_volume", arguments: { direction: "up" } },
      { id: "call_vol_2", type: "function", name: "adjust_volume", arguments: { direction: "up" } },
    ]);
    // Message 2: Tool message 1
    state.appendToolMessage("call_vol_1", "adjust_volume", JSON.stringify({ success: true }));
    // Message 3: Tool message 2
    state.appendToolMessage("call_vol_2", "adjust_volume", JSON.stringify({ success: true }));

    // Messages 4-7: 4 dialogue messages (~420 tokens)
    state.appendAssistantMessage(`Volume updated twice. ${"text ".repeat(80)}`);
    state.appendUserMessage(`User query 2 - ${"text ".repeat(80)}`);
    state.appendAssistantMessage(`Assistant response 2 - ${"text ".repeat(80)}`);
    state.appendUserMessage(`User query 3 - ${"text ".repeat(80)}`);

    // Total raw messages = 8 (~650 tokens).
    // availableInputBudget = Math.max(500, 700 - 100) = 600 tokens.
    // Message 0 is pruned (~190 tokens), leaving 7 messages (~460 tokens <= 600).
    // The assistant + 2 tools group is preserved because 460 <= 600 budget.
    const request = coordinator.prepareRequestContext("conv_protect_boundary", "exec_3", "llama-3.3-70b-versatile", 700, 100);

    expect(request.context.messages.length).toBe(7);
    expect(request.context.messages[0].role).toBe("assistant");
    expect(request.context.messages[1].role).toBe("tool");
    expect(request.context.messages[2].role).toBe("tool");
  });

  it("prunes assistant-and-tool group by conversational turn when tight budget requires it", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_turn_prune", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Message 0: User query (~150 tokens)
    state.appendUserMessage(`Initial greeting - ${"user query padding ".repeat(30)}`);

    // Messages 1-3: Assistant with 2 tool calls and responses (~850 tokens)
    state.appendAssistantMessage(`Tool invocation step - ${"long assistant tool call payload ".repeat(100)}`, undefined, [
      { id: "call_vol_1", type: "function", name: "adjust_volume", arguments: { direction: "up" } },
      { id: "call_vol_2", type: "function", name: "adjust_volume", arguments: { direction: "up" } },
    ]);
    state.appendToolMessage("call_vol_1", "adjust_volume", JSON.stringify({ success: true }));
    state.appendToolMessage("call_vol_2", "adjust_volume", JSON.stringify({ success: true }));

    // Messages 4-5: Recent dialogue turn (~100 tokens)
    state.appendUserMessage("User query 2 - What is the status?");
    state.appendAssistantMessage("Everything is operational.");

    // availableInputBudget = Math.max(500, 1000 - 500) = 500 tokens.
    // Total tokens: ~1100 tokens > 500 budget.
    // After Message 0 is pruned, remaining is ~950 tokens > 500 budget.
    // Preserving Messages 1-3 would exceed budget (950 > 500).
    // Therefore Messages 1-3 are pruned by conversational turn, leaving only the recent turn (Messages 4-5, ~100 tokens <= 500).
    const request = coordinator.prepareRequestContext("conv_turn_prune", "exec_4", "llama-3.3-70b-versatile", 1000, 500);

    // The assistant + 2 tools group was pruned atomically, leaving only the recent turn
    expect(request.context.messages.length).toBe(2);
    expect(request.context.messages[0].role).toBe("user");
    expect(request.context.messages[1].role).toBe("assistant");
  });

  it("fails explicitly with ExecutionCoordinatorError when the required context cannot fit into budget", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_overflow", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Single huge message that exceeds budget by itself
    state.appendUserMessage(`Unprunable single user prompt - ${"huge prompt content ".repeat(250)}`);

    // Budget = 500 tokens (Math.max(500, 600 - 100)), but single message is ~1250 tokens
    expect(() => {
      coordinator.prepareRequestContext("conv_overflow", "exec_fail", "llama-3.3-70b-versatile", 600, 100);
    }).toThrowError(/Cannot fit required conversation context into available token budget/);
  });

  it("preserves latest user message and every message after it including tool calls and results", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_preserve_latest_turn", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Turn 1: Older user and assistant messages (large enough so both messages exceed budget)
    state.appendUserMessage(`User turn 1 - ${"padding content text ".repeat(120)}`);
    state.appendAssistantMessage(`Assistant turn 1 - ${"padding content text ".repeat(120)}`);

    // Turn 2: Latest user message and subsequent assistant tool-call + tool result
    state.appendUserMessage("User turn 2 - Run action");
    state.appendAssistantMessage("", undefined, [
      { id: "call_tool_2", type: "function", name: "action", arguments: {} },
    ]);
    state.appendToolMessage("call_tool_2", "action", JSON.stringify({ success: true }));

    // Budget = 500 tokens (Math.max(500, 700 - 200))
    // Turn 1 (~400 tokens) + Turn 2 (~100 tokens) > 500 tokens
    // Turn 1 is pruned. Turn 2 (latest user message + tool call + tool result) is preserved.
    const request = coordinator.prepareRequestContext("conv_preserve_latest_turn", "exec_lat", "llama-3.3-70b-versatile", 700, 200);

    expect(request.context.messages.length).toBe(3);
    expect(request.context.messages[0].role).toBe("user");
    expect(request.context.messages[0].content).toBe("User turn 2 - Run action");
    expect(request.context.messages[1].role).toBe("assistant");
    expect(request.context.messages[2].role).toBe("tool");
  });

  it("stops pruning before latest user boundary and throws ExecutionCoordinatorError if the latest turn exceeds budget", () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_preserve_boundary_fail", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics
    );

    // Turn 1: Older turn
    state.appendUserMessage("Old user turn");
    state.appendAssistantMessage("Old assistant turn");

    // Turn 2: Latest user turn with massive content that cannot fit into 500 token budget
    state.appendUserMessage(`Huge latest user message - ${"massive padding content text ".repeat(150)}`);
    state.appendAssistantMessage("", undefined, [
      { id: "call_tool_huge", type: "function", name: "action", arguments: {} },
    ]);
    state.appendToolMessage("call_tool_huge", "action", JSON.stringify({ success: true }));

    // Older turn is pruned, but latest turn cannot fit in budget (Math.max(500, 600 - 100))
    expect(() => {
      coordinator.prepareRequestContext("conv_preserve_boundary_fail", "exec_lat_fail", "llama-3.3-70b-versatile", 600, 100);
    }).toThrowError(/Cannot fit required conversation context into available token budget/);
  });

  it("catches oversized-context error in executeStreaming without recording circuit breaker failure", async () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_stream_oversized", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();
    const circuitBreaker = new CircuitBreakerEngine();
    const recordFailureSpy = vi.spyOn(circuitBreaker, "recordFailure");
    const resilience = new ResilienceCoordinator({}, circuitBreaker);

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics,
      resilience
    );

    let executionFailedFired = false;
    let streamFailedFired = false;
    events.subscribe("ExecutionFailed", () => {
      executionFailedFired = true;
    });
    events.subscribe("ExecutionStreamFailed", () => {
      streamFailedFired = true;
    });

    // Provide a prompt that by itself exceeds the 7192 token availableInputBudget (8192 - 1000)
    const oversizedPrompt = "word ".repeat(30000);

    await expect(coordinator.executeStreaming("groq-adapter", oversizedPrompt)).rejects.toThrowError(
      /Cannot fit required conversation context into available token budget/
    );

    expect(executionFailedFired).toBe(true);
    expect(streamFailedFired).toBe(true);
    const turns = history.listTurns();
    expect(turns.length).toBe(1);
    expect(turns[0].status).toBe("FAILED");

    // Local context-preparation failure MUST NOT call recordFailure on the provider circuit breaker
    expect(recordFailureSpy).not.toHaveBeenCalled();
    expect(circuitBreaker.createSnapshot("groq-adapter").status.consecutiveFailures).toBe(0);
  });

  it("records circuit breaker failure when an error is raised during provider dispatch in executeStreaming", async () => {
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    const unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    const state = new ConversationState("conv_stream_dispatch_err", "System prompt", "groq-adapter", "llama-3.3-70b-versatile");
    const history = new ConversationHistory();
    const events = new RuntimeEvents();
    const diagnostics = new RuntimeDiagnostics();
    const circuitBreaker = new CircuitBreakerEngine();
    const recordFailureSpy = vi.spyOn(circuitBreaker, "recordFailure");
    const resilience = new ResilienceCoordinator({}, circuitBreaker);

    // Mock executeStreaming on runtime to fail during provider stream consumption
    (unifiedRuntime as any).executeStreaming = () => ({
      async *[Symbol.asyncIterator]() {
        throw new Error("Provider downstream network timeout");
      },
    });

    const coordinator = new ExecutionCoordinator(
      unifiedRuntime,
      state,
      history,
      events,
      diagnostics,
      resilience
    );

    await expect(coordinator.executeStreaming("groq-adapter", "Normal user prompt")).rejects.toThrowError(
      /Provider downstream network timeout/
    );

    // Errors raised during provider dispatch MUST call recordFailure
    expect(recordFailureSpy).toHaveBeenCalledWith("groq-adapter");
    expect(circuitBreaker.createSnapshot("groq-adapter").status.consecutiveFailures).toBe(1);
  });
});
