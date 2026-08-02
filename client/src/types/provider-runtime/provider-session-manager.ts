/**
 * AETHER OS — Phase 9.9 Provider Runtime Layer
 * Milestone 5 Component: Provider Session Manager (`provider-session-manager.ts`)
 *
 * @file provider-session-manager.ts
 * @description Single exclusive owner of runtime session context handles (Browser Context,
 * Electron Window, MCP Session, AI Conversation, SSH, Database, Generic Runtime).
 * Manages session allocation, reuse, release, timeout enforcement, and cleanup.
 * Contains ZERO provider execution or authentication logic.
 *
 * @module @aether/provider-runtime/provider-session-manager
 * @version 1.1.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — MILESTONE 5
 */

import { SessionType } from "./enums";
import {
  SessionNotFoundError,
  SessionTimeoutError,
  SessionAlreadyExistsError,
  InvalidSessionStateError,
} from "./session-errors";
import type {
  ProviderSessionHandle,
  ProviderSessionSnapshot,
} from "./session-types";
import { deepFreeze } from "./factories";

/**
 * Authoritative manager governing runtime driver session handles.
 */
export class ProviderSessionManager {
  private readonly sessions = new Map<string, ProviderSessionHandle>();

  /**
   * Allocates a new runtime session handle.
   *
   * @param providerId Target provider ID.
   * @param sessionType Managed session category (BROWSER_CONTEXT, AI_CONVERSATION, etc.).
   * @param sessionConfig Optional session runtime settings.
   * @param ttlMs Optional session lifetime duration in milliseconds.
   * @returns Deeply frozen ProviderSessionHandle.
   */
  public createSession(
    providerId: string,
    sessionType: SessionType | string = SessionType.LONG_LIVED_RUNTIME,
    sessionConfig?: Readonly<Record<string, unknown>>,
    ttlMs?: number
  ): Readonly<ProviderSessionHandle> {
    if (!providerId || typeof providerId !== "string" || providerId.trim() === "") {
      throw new InvalidSessionStateError("Session allocation failed: providerId must be non-empty.");
    }

    const now = Date.now();
    const sessionId = `sess_${providerId}_${now}_${Math.floor(Math.random() * 10000)}`;

    if (this.sessions.has(sessionId)) {
      throw new SessionAlreadyExistsError(`Session '${sessionId}' already exists.`, { sessionId });
    }

    const handle: ProviderSessionHandle = {
      sessionId,
      providerId,
      sessionType,
      state: "ACTIVE",
      createdAtMs: now,
      lastAccessedAtMs: now,
      ...(ttlMs ? { expiresAtMs: now + ttlMs } : {}),
      ...(sessionConfig ? { sessionConfig: { ...sessionConfig } } : {}),
    };

    this.sessions.set(sessionId, handle);
    return deepFreeze({ ...handle });
  }

  /**
   * Retrieves and marks an active session for reuse, updating last-accessed timestamp.
   *
   * @throws SessionNotFoundError if session is missing.
   * @throws SessionTimeoutError if session has expired.
   */
  public reuseSession(sessionId: string): Readonly<ProviderSessionHandle> {
    const handle = this.getSession(sessionId);

    const updated: ProviderSessionHandle = {
      ...handle,
      state: "ACTIVE",
      lastAccessedAtMs: Date.now(),
    };

    this.sessions.set(sessionId, updated);
    return deepFreeze({ ...updated });
  }

  /**
   * Retrieves a session handle by sessionId.
   * Auto-enforces timeout expiration checks.
   */
  public getSession(sessionId: string): Readonly<ProviderSessionHandle> {
    const handle = this.sessions.get(sessionId);
    if (!handle) {
      throw new SessionNotFoundError(`Session '${sessionId}' not found in ProviderSessionManager.`, { sessionId });
    }

    if (handle.expiresAtMs && handle.expiresAtMs <= Date.now()) {
      this.timeoutSession(sessionId);
      throw new SessionTimeoutError(`Session '${sessionId}' has expired.`, {
        sessionId,
        expiresAtMs: handle.expiresAtMs,
      });
    }

    return deepFreeze({ ...handle });
  }

  /**
   * Checks if an active unexpired session exists.
   */
  public hasSession(sessionId: string): boolean {
    const handle = this.sessions.get(sessionId);
    if (!handle) {
      return false;
    }
    if (handle.expiresAtMs && handle.expiresAtMs <= Date.now()) {
      this.timeoutSession(sessionId);
      return false;
    }
    return handle.state !== "DESTROYED" && handle.state !== "EXPIRED";
  }

  /**
   * Marks a session as RELEASED (idle) for reuse.
   */
  public releaseSession(sessionId: string): Readonly<ProviderSessionHandle> {
    const handle = this.getSession(sessionId);

    const released: ProviderSessionHandle = {
      ...handle,
      state: "RELEASED",
      lastAccessedAtMs: Date.now(),
    };

    this.sessions.set(sessionId, released);
    return deepFreeze({ ...released });
  }

  /**
   * Destroys a runtime session handle and frees map references.
   */
  public destroySession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      throw new SessionNotFoundError(`Session '${sessionId}' not found in ProviderSessionManager.`, { sessionId });
    }
    return this.sessions.delete(sessionId);
  }

  /**
   * Forcefully marks a session as EXPIRED.
   */
  public timeoutSession(sessionId: string): boolean {
    const handle = this.sessions.get(sessionId);
    if (!handle) {
      return false;
    }

    const expired: ProviderSessionHandle = {
      ...handle,
      state: "EXPIRED",
      lastAccessedAtMs: Date.now(),
    };

    this.sessions.set(sessionId, expired);
    return true;
  }

  /**
   * Cleans up all sessions associated with a providerId.
   *
   * @returns Count of destroyed sessions.
   */
  public cleanupSession(providerId: string): number {
    let count = 0;
    for (const [sessionId, handle] of this.sessions.entries()) {
      if (handle.providerId === providerId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    return count;
  }

  /**
   * Lists all sessions, optionally filtered by providerId, sorted alphabetically by sessionId.
   */
  public listSessions(providerId?: string): readonly Readonly<ProviderSessionHandle>[] {
    const matched: ProviderSessionHandle[] = [];

    for (const handle of this.sessions.values()) {
      if (providerId && handle.providerId !== providerId) {
        continue;
      }
      matched.push(handle);
    }

    matched.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
    return deepFreeze(matched);
  }

  /**
   * Generates a deeply frozen ProviderSessionSnapshot.
   */
  public createSnapshot(): Readonly<ProviderSessionSnapshot> {
    const all = this.listSessions();
    const activeCount = all.filter((s) => s.state === "ACTIVE").length;

    const snapshot: ProviderSessionSnapshot = {
      snapshotId: `snap_sess_${Date.now()}`,
      createdAtMs: Date.now(),
      activeSessionsCount: activeCount,
      totalSessionsCount: all.length,
      sessions: all,
    };

    return deepFreeze(snapshot);
  }

  /**
   * Resets all sessions for testing or system shutdown.
   */
  public reset(): void {
    this.sessions.clear();
  }
}
