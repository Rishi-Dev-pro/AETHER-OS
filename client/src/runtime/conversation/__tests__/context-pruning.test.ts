/**
 * AETHER OS — Phase 9.11 Milestone 5
 * Unit Tests: Context Pruning & Token Budgeting (`context-pruning.test.ts`)
 */

import { describe, it, expect } from "vitest";
import { ExecutionCoordinator } from "../execution-coordinator";
import { ConversationState } from "../conversation-state";
import { ConversationHistory } from "../conversation-history";
import { RuntimeEvents } from "../runtime-events";
import { RuntimeDiagnostics } from "../runtime-diagnostics";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import { ProviderManager } from "../../../types/provider-runtime/provider-manager";
import { AdapterManager } from "../../../types/provider-adapters/adapter-manager";
import { CredentialVault } from "../../../types/provider-runtime/credential-vault";

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
});
