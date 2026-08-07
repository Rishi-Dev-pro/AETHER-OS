/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Unit Tests: Execution Coordinator (`execution-coordinator.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
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

describe("Phase 9.11 Milestone 2 Execution Coordinator Unit Tests", () => {
  let runtime: UnifiedAdapterRuntime;
  let state: ConversationState;
  let history: ConversationHistory;
  let events: RuntimeEvents;
  let diagnostics: RuntimeDiagnostics;
  let coordinator: ExecutionCoordinator;

  beforeEach(async () => {
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
});
