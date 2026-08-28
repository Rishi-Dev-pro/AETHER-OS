/**
 * AETHER OS — Phase 9.11 Milestone 5
 * Integration Tests: Multi-Session, Snapshots, Summarization, and Streaming Guard (`session-integration.test.ts`)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationRuntime } from "../conversation-runtime";
import { SessionManager } from "../session-manager";
import { SessionPersistenceEngine } from "../session-persistence";
import { summarizeTurns, shouldSummarizeSession } from "../session-summarizer";
import { UnifiedAdapterRuntime } from "../../../types/provider-adapters/unified-adapter-runtime";
import { ProviderManager } from "../../../types/provider-runtime/provider-manager";
import { AdapterManager } from "../../../types/provider-adapters/adapter-manager";
import { CredentialVault } from "../../../types/provider-runtime/credential-vault";
import type { ConversationTurn } from "../conversation-types";

describe("ConversationRuntime Multi-Session & Memory Integration", () => {
  let persistence: SessionPersistenceEngine;
  let sessionManager: SessionManager;
  let conversationRuntime: ConversationRuntime;
  let unifiedRuntime: UnifiedAdapterRuntime;

  beforeEach(async () => {
    persistence = new SessionPersistenceEngine();
    await persistence.init();
    await persistence.clearAll();

    sessionManager = new SessionManager(persistence);
    const vault = new CredentialVault();
    const providerManager = new ProviderManager();
    const adapterManager = new AdapterManager();
    unifiedRuntime = new UnifiedAdapterRuntime(providerManager, adapterManager, vault);

    conversationRuntime = new ConversationRuntime(
      unifiedRuntime,
      "You are AETHER.",
      "groq-adapter",
      "llama-3.3-70b-versatile",
      sessionManager
    );
  });

  it("handles multi-session lifecycles and event emissions", () => {
    const createdEvents: string[] = [];
    const switchedEvents: string[] = [];

    conversationRuntime.subscribeToEvents("SessionCreated", (e: any) => {
      createdEvents.push(e.sessionId);
    });
    conversationRuntime.subscribeToEvents("SessionSwitched", (e: any) => {
      switchedEvents.push(e.currentSessionId);
    });

    const sessionA = conversationRuntime.createSession({ title: "Session A" });
    const sessionB = conversationRuntime.createSession({ title: "Session B" });

    expect(createdEvents).toContain(sessionA.sessionId);
    expect(createdEvents).toContain(sessionB.sessionId);
    expect(conversationRuntime.listSessions()).toHaveLength(3); // default + A + B

    conversationRuntime.switchSession(sessionA.sessionId);
    expect(switchedEvents).toContain(sessionA.sessionId);
    expect(conversationRuntime.getActiveSessionId()).toBe(sessionA.sessionId);
  });

  it("creates and restores memory snapshots accurately", async () => {
    const session = conversationRuntime.createSession({ title: "Snapshot Testing" });
    const state = sessionManager.getActiveState();
    state.appendUserMessage("Message Before Snapshot");
    state.appendAssistantMessage("Response Before Snapshot");

    const snapshot = await conversationRuntime.createMemorySnapshot("Checkpoint Initial");
    expect(snapshot.snapshotId).toBeDefined();
    expect(snapshot.label).toBe("Checkpoint Initial");

    // Add more messages after snapshot
    state.appendUserMessage("Message After Snapshot");
    expect(state.getMessages()).toHaveLength(3); // 2 snapshot msgs + 1 post-snapshot msg

    // Revert to snapshot
    const restored = await conversationRuntime.restoreMemorySnapshot(snapshot.snapshotId);
    expect(restored.sessionId).toBe(session.sessionId);

    const revertedMessages = conversationRuntime.snapshot().messages;
    expect(revertedMessages).toHaveLength(2); // user + assistant
    expect(revertedMessages[0].content).toBe("Message Before Snapshot");
    expect(revertedMessages[1].content).toBe("Response Before Snapshot");
  });

  it("evaluates and generates deterministic turn summaries", () => {
    const dummyTurns: ConversationTurn[] = [
      {
        turnId: "t1",
        userMessage: { id: "u1", role: "user", content: "What is quantum computing?", timestamp: 1000 },
        assistantMessage: { id: "a1", role: "assistant", content: "Quantum computing uses qubits to process information.", timestamp: 1100 },
        status: "COMPLETED",
        timestamp: 1100,
      },
      {
        turnId: "t2",
        userMessage: { id: "u2", role: "user", content: "How does superposition work?", timestamp: 2000 },
        assistantMessage: { id: "a2", role: "assistant", content: "Superposition allows qubits to exist in multiple states simultaneously.", timestamp: 2100 },
        status: "COMPLETED",
        timestamp: 2100,
      },
      {
        turnId: "t3",
        userMessage: { id: "u3", role: "user", content: "Explain entanglement.", timestamp: 3000 },
        assistantMessage: { id: "a3", role: "assistant", content: "Entanglement links quantum states between particles.", timestamp: 3100 },
        status: "COMPLETED",
        timestamp: 3100,
      },
      {
        turnId: "t4",
        userMessage: { id: "u4", role: "user", content: "What are quantum algorithms?", timestamp: 4000 },
        assistantMessage: { id: "a4", role: "assistant", content: "Examples include Shor's and Grover's algorithms.", timestamp: 4100 },
        status: "COMPLETED",
        timestamp: 4100,
      },
      {
        turnId: "t5",
        userMessage: { id: "u5", role: "user", content: "Tell me about quantum hardware.", timestamp: 5000 },
        assistantMessage: { id: "a5", role: "assistant", content: "Superconducting circuits and trapped ions are common.", timestamp: 5100 },
        status: "COMPLETED",
        timestamp: 5100,
      },
    ];

    expect(shouldSummarizeSession(5, 500, 8, 4000)).toBe(false);
    expect(shouldSummarizeSession(10, 5000, 8, 4000)).toBe(true);

    const summaryResult = summarizeTurns(dummyTurns, undefined, { protectedRecentTurns: 2 });
    expect(summaryResult.summarizedTurnCount).toBe(3); // 5 - 2 = 3 eligible turns summarized
    expect(summaryResult.summary).toContain("quantum computing");
    expect(summaryResult.summary).toContain("superposition");
  });
});
