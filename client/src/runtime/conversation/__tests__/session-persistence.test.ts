/**
 * AETHER OS — Phase 9.11 Milestone 5
 * Unit Tests: Session Persistence Engine (`session-persistence.test.ts`)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SessionPersistenceEngine, sanitizeForPersistence } from "../session-persistence";
import type { SessionData, SessionSnapshot } from "../session-types";

describe("SessionPersistenceEngine", () => {
  let engine: SessionPersistenceEngine;

  beforeEach(async () => {
    engine = new SessionPersistenceEngine();
    await engine.init();
    await engine.clearAll();
  });

  it("sanitizes potential credentials and API keys recursively", () => {
    const rawData = {
      apiKey: "secret_12345",
      VITE_GROQ_API_KEY: "secret_groq",
      authorization: "Bearer secret_token",
      user: {
        name: "AetherUser",
        token: "jwt_token_123",
        preferences: { theme: "cyberpunk" },
      },
      messages: [{ id: "m1", text: "Hello" }],
    };

    const sanitized: any = sanitizeForPersistence(rawData);
    expect(sanitized.apiKey).toBeUndefined();
    expect(sanitized.VITE_GROQ_API_KEY).toBeUndefined();
    expect(sanitized.authorization).toBeUndefined();
    expect(sanitized.user.token).toBeUndefined();
    expect(sanitized.user.name).toBe("AetherUser");
    expect(sanitized.user.preferences.theme).toBe("cyberpunk");
    expect(sanitized.messages[0].text).toBe("Hello");
  });

  it("saves, loads, and deletes sessions accurately", async () => {
    const sessionData: SessionData = {
      metadata: {
        sessionId: "sess_test_100",
        title: "Persistence Test Session",
        createdAt: 1000,
        updatedAt: 2000,
        activeProvider: "groq-adapter",
        activeModel: "llama-3.3-70b-versatile",
        messageCount: 1,
        tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCostUSD: 0.0001 },
        isArchived: false,
      },
      state: {
        conversationId: "sess_test_100",
        systemPrompt: "You are AETHER.",
        activeProvider: "groq-adapter",
        activeModel: "llama-3.3-70b-versatile",
        messages: [
          { id: "msg_1", role: "user", content: "Persist me", timestamp: 1500 },
        ],
        createdAt: 1000,
        updatedAt: 2000,
      },
      turns: [],
    };

    await engine.saveSession(sessionData);

    const loaded = await engine.loadSession("sess_test_100");
    expect(loaded).toBeDefined();
    expect(loaded?.metadata.title).toBe("Persistence Test Session");
    expect(loaded?.state.messages[0].content).toBe("Persist me");

    const list = await engine.listSessions();
    expect(list.some((s) => s.sessionId === "sess_test_100")).toBe(true);

    const deleted = await engine.deleteSession("sess_test_100");
    expect(deleted).toBe(true);

    const afterDelete = await engine.loadSession("sess_test_100");
    expect(afterDelete).toBeNull();
  });

  it("saves, loads, and lists memory snapshots", async () => {
    const snapshot: SessionSnapshot = {
      snapshotId: "snap_test_001",
      sessionId: "sess_test_100",
      label: "Checkpoint 1",
      data: {
        metadata: {
          sessionId: "sess_test_100",
          title: "Snapshot Test",
          createdAt: 1000,
          updatedAt: 2000,
          activeProvider: "groq-adapter",
          activeModel: "llama-3.3-70b-versatile",
          messageCount: 0,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0 },
          isArchived: false,
        },
        state: {
          conversationId: "sess_test_100",
          systemPrompt: "System",
          activeProvider: "groq-adapter",
          activeModel: "llama-3.3-70b-versatile",
          messages: [],
          createdAt: 1000,
          updatedAt: 2000,
        },
        turns: [],
      },
      createdAt: 3000,
    };

    await engine.saveSnapshot(snapshot);

    const loaded = await engine.loadSnapshot("snap_test_001");
    expect(loaded).toBeDefined();
    expect(loaded?.label).toBe("Checkpoint 1");

    const list = await engine.listSnapshots("sess_test_100");
    expect(list).toHaveLength(1);
    expect(list[0].snapshotId).toBe("snap_test_001");
  });
});
