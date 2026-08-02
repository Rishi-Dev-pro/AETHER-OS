/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Unit Test: ProviderSessionManager Suite (`provider-session-manager.test.ts`)
 *
 * @file provider-session-manager.test.ts
 * @description Validates runtime session allocation, reuse, release, timeout checks,
 * cleanup, and snapshot exports.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SessionType } from "../enums";
import {
  SessionNotFoundError,
  SessionTimeoutError,
  InvalidSessionStateError,
} from "../session-errors";
import { ProviderSessionManager } from "../provider-session-manager";

describe("Phase 9.9 — Milestone 5: ProviderSessionManager Unit Test Suite", () => {
  let sessionManager: ProviderSessionManager;

  beforeEach(() => {
    sessionManager = new ProviderSessionManager();
  });

  it("should create active sessions and retrieve them by sessionId", () => {
    const handle = sessionManager.createSession(
      "playwright-browser",
      SessionType.BROWSER_CONTEXT,
      { width: 1920, height: 1080 }
    );

    expect(handle.sessionId).toBeDefined();
    expect(handle.providerId).toBe("playwright-browser");
    expect(handle.sessionType).toBe(SessionType.BROWSER_CONTEXT);
    expect(handle.state).toBe("ACTIVE");
    expect(Object.isFrozen(handle)).toBe(true);

    const fetched = sessionManager.getSession(handle.sessionId);
    expect(fetched.sessionId).toBe(handle.sessionId);
  });

  it("should reuse active sessions and update last-accessed timestamp", () => {
    const handle = sessionManager.createSession("groq-cloud", SessionType.AI_CONVERSATION);
    const reused = sessionManager.reuseSession(handle.sessionId);

    expect(reused.sessionId).toBe(handle.sessionId);
    expect(reused.state).toBe("ACTIVE");
    expect(reused.lastAccessedAtMs).toBeGreaterThanOrEqual(handle.lastAccessedAtMs);
  });

  it("should release active sessions to IDLE/RELEASED state", () => {
    const handle = sessionManager.createSession("electron-desktop", SessionType.ELECTRON_WINDOW);
    const released = sessionManager.releaseSession(handle.sessionId);

    expect(released.state).toBe("RELEASED");
  });

  it("should enforce session expiration timeout rules", () => {
    const handle = sessionManager.createSession(
      "p1",
      SessionType.LONG_LIVED_RUNTIME,
      {},
      -1000 // Already expired in past
    );

    expect(() => sessionManager.getSession(handle.sessionId)).toThrow(SessionTimeoutError);
    expect(sessionManager.hasSession(handle.sessionId)).toBe(false);
  });

  it("should destroy session handles and remove them from map", () => {
    const handle = sessionManager.createSession("p1", SessionType.MCP_SESSION);
    expect(sessionManager.destroySession(handle.sessionId)).toBe(true);
    expect(() => sessionManager.getSession(handle.sessionId)).toThrow(SessionNotFoundError);
  });

  it("should cleanup all sessions associated with a providerId", () => {
    sessionManager.createSession("target-p", SessionType.AI_CONVERSATION);
    sessionManager.createSession("target-p", SessionType.BROWSER_PAGE);
    sessionManager.createSession("other-p", SessionType.SSH_SESSION);

    const cleanedCount = sessionManager.cleanupSession("target-p");
    expect(cleanedCount).toBe(2);
    expect(sessionManager.listSessions("target-p").length).toBe(0);
    expect(sessionManager.listSessions("other-p").length).toBe(1);
  });

  it("should generate deeply frozen ProviderSessionSnapshot objects", () => {
    sessionManager.createSession("p1", SessionType.DATABASE_SESSION);
    const snapshot = sessionManager.createSnapshot();

    expect(snapshot.totalSessionsCount).toBe(1);
    expect(snapshot.activeSessionsCount).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.sessions)).toBe(true);
  });
});
