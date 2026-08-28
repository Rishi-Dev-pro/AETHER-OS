/**
 * AETHER OS — Phase 9.11 Milestone 5
 * Unit Tests: Session Manager Subsystem (`session-manager.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager, generateUUID } from "../session-manager";
import { SessionPersistenceEngine } from "../session-persistence";

describe("SessionManager", () => {
  let persistence: SessionPersistenceEngine;
  let sessionManager: SessionManager;

  beforeEach(() => {
    persistence = new SessionPersistenceEngine();
    sessionManager = new SessionManager(persistence);
  });

  it("generates valid stable UUIDs", () => {
    const id1 = generateUUID();
    const id2 = generateUUID();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe("string");
    expect(id1.length).toBeGreaterThan(10);
  });

  it("creates session with default and custom metadata", () => {
    const session = sessionManager.createSession({
      title: "Research Chat",
      providerId: "groq-adapter",
      modelId: "llama-3.3-70b-versatile",
    });

    expect(session.sessionId).toBeDefined();
    expect(session.title).toBe("Research Chat");
    expect(session.activeProvider).toBe("groq-adapter");
    expect(session.activeModel).toBe("llama-3.3-70b-versatile");
    expect(sessionManager.getActiveSessionId()).toBe(session.sessionId);
  });

  it("switches sessions cleanly without data leakage", () => {
    const sessionA = sessionManager.createSession({ title: "Session A" });
    const stateA = sessionManager.getActiveState();
    stateA.appendUserMessage("Message in session A");
    stateA.appendAssistantMessage("Response in session A");

    const sessionB = sessionManager.createSession({ title: "Session B" });
    const stateB = sessionManager.getActiveState();
    stateB.appendUserMessage("Message in session B");

    expect(sessionManager.getActiveSessionId()).toBe(sessionB.sessionId);
    expect(sessionManager.getActiveState().getMessages()).toHaveLength(1); // user message

    // Switch back to Session A
    sessionManager.switchSession(sessionA.sessionId);
    expect(sessionManager.getActiveSessionId()).toBe(sessionA.sessionId);
    const restoredMessagesA = sessionManager.getActiveState().getMessages();
    expect(restoredMessagesA).toHaveLength(2); // user + assistant
    expect(restoredMessagesA[0].content).toBe("Message in session A");
    expect(restoredMessagesA[1].content).toBe("Response in session A");

    // Switch back to Session B
    sessionManager.switchSession(sessionB.sessionId);
    const restoredMessagesB = sessionManager.getActiveState().getMessages();
    expect(restoredMessagesB).toHaveLength(1);
    expect(restoredMessagesB[0].content).toBe("Message in session B");
  });

  it("renames sessions correctly", () => {
    const session = sessionManager.createSession({ title: "Initial Title" });
    const renamed = sessionManager.renameSession(session.sessionId, "Updated Title");

    expect(renamed.title).toBe("Updated Title");
    const active = sessionManager.getActiveSession();
    expect(active.metadata.title).toBe("Updated Title");
  });

  it("deletes session and falls back to remaining session", async () => {
    const sessionA = sessionManager.createSession({ title: "Session A" });
    const sessionB = sessionManager.createSession({ title: "Session B" });

    expect(sessionManager.listSessions()).toHaveLength(2);
    const deleted = await sessionManager.deleteSession(sessionB.sessionId);

    expect(deleted).toBe(true);
    expect(sessionManager.listSessions()).toHaveLength(1);
    expect(sessionManager.getActiveSessionId()).toBe(sessionA.sessionId);
  });

  it("updates session metrics accurately", () => {
    const session = sessionManager.createSession({ title: "Metrics Test" });
    sessionManager.updateSessionMetrics(session.sessionId, {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCostUSD: 0.0025,
    });

    const active = sessionManager.getActiveSession();
    expect(active.metadata.tokenUsage.promptTokens).toBe(100);
    expect(active.metadata.tokenUsage.completionTokens).toBe(50);
    expect(active.metadata.tokenUsage.totalTokens).toBe(150);
    expect(active.metadata.tokenUsage.estimatedCostUSD).toBe(0.0025);
  });
});
