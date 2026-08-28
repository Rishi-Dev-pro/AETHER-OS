/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Session Manager Subsystem (`session-manager.ts`)
 *
 * @file session-manager.ts
 * @description Master multi-session lifecycle controller and in-memory registry. Manages session creation,
 * switching, renaming, deletion, archiving, persistence sync, and snapshot restoration.
 *
 * @module @aether/runtime/conversation/session-manager
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import { ConversationState } from "./conversation-state";
import { ConversationHistory } from "./conversation-history";
import type {
  SessionMetadata,
  SessionData,
  SessionSnapshot,
  CreateSessionOptions,
  UpdateSessionOptions,
} from "./session-types";
import { sessionPersistence, SessionPersistenceEngine } from "./session-persistence";
import { ConversationStateError } from "./conversation-errors";

/**
 * Generates a stable UUID v4 identifier.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface SessionContainer {
  metadata: SessionMetadata;
  state: ConversationState;
  history: ConversationHistory;
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionContainer>();
  private activeSessionId: string = "";
  private readonly persistence: SessionPersistenceEngine;

  constructor(persistenceEngine: SessionPersistenceEngine = sessionPersistence) {
    this.persistence = persistenceEngine;
  }

  /**
   * Initializes the session manager and creates an initial default session if empty.
   */
  public async initialize(defaultPrompt?: string, defaultProvider?: string, defaultModel?: string): Promise<SessionMetadata> {
    const loadedList = await this.loadAndRestorePersistedSessions();
    if (loadedList.length > 0) {
      const mostRecent = loadedList[0];
      this.switchSession(mostRecent.sessionId);
      return mostRecent;
    }

    return this.createSession({
      title: "New Conversation",
      systemPrompt: defaultPrompt,
      providerId: defaultProvider,
      modelId: defaultModel,
    });
  }

  /**
   * Creates a new conversation session and sets it as active.
   */
  public createSession(options: CreateSessionOptions = {}): SessionMetadata {
    const sessionId = options.sessionId || `session_${generateUUID()}`;
    const now = Date.now();
    const systemPrompt = options.systemPrompt || "You are AETHER OS, a powerful AI operating system assistant.";
    const activeProvider = options.providerId || "groq-adapter";
    const activeModel = options.modelId || "llama-3.3-70b-versatile";
    const title = options.title || "New Conversation";

    const state = new ConversationState(sessionId, systemPrompt, activeProvider, activeModel);
    const history = new ConversationHistory();

    const metadata: SessionMetadata = {
      sessionId,
      title,
      createdAt: now,
      updatedAt: now,
      activeProvider,
      activeModel,
      messageCount: 0,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUSD: 0,
      },
      isArchived: false,
      metadata: options.metadata || {},
    };

    const container: SessionContainer = {
      metadata,
      state,
      history,
    };

    this.sessions.set(sessionId, container);
    this.activeSessionId = sessionId;

    // Trigger async persistence in background
    this.persistence.saveSession(this.exportSession(sessionId)).catch((err) => {
      console.warn("[SessionManager] Failed to persist new session:", err);
    });

    return Object.freeze({ ...metadata });
  }

  /**
   * Returns active session ID.
   */
  public getActiveSessionId(): string {
    return this.activeSessionId;
  }

  /**
   * Returns active session container.
   */
  public getActiveSession(): SessionData {
    return this.exportSession(this.activeSessionId);
  }

  /**
   * Returns active ConversationState instance.
   */
  public getActiveState(): ConversationState {
    const container = this.sessions.get(this.activeSessionId);
    if (!container) {
      throw new ConversationStateError(`Active session '${this.activeSessionId}' not found in registry.`);
    }
    return container.state;
  }

  /**
   * Returns active ConversationHistory instance.
   */
  public getActiveHistory(): ConversationHistory {
    const container = this.sessions.get(this.activeSessionId);
    if (!container) {
      throw new ConversationStateError(`Active session '${this.activeSessionId}' not found in registry.`);
    }
    return container.history;
  }

  /**
   * Switches active session to specified sessionId.
   */
  public switchSession(sessionId: string): SessionMetadata {
    const container = this.sessions.get(sessionId);
    if (!container) {
      throw new ConversationStateError(`Cannot switch to non-existent session '${sessionId}'.`);
    }

    this.activeSessionId = sessionId;
    container.metadata = {
      ...container.metadata,
      updatedAt: Date.now(),
    };

    return Object.freeze({ ...container.metadata });
  }

  /**
   * Lists all session metadata sorted by newest updated.
   */
  public listSessions(): ReadonlyArray<SessionMetadata> {
    const list = Array.from(this.sessions.values()).map((c) => ({ ...c.metadata }));
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return Object.freeze(list);
  }

  /**
   * Retrieves single session domain data by ID.
   */
  public getSession(sessionId: string): SessionData | null {
    if (!this.sessions.has(sessionId)) return null;
    return this.exportSession(sessionId);
  }

  /**
   * Renames a session.
   */
  public renameSession(sessionId: string, newTitle: string): SessionMetadata {
    const container = this.sessions.get(sessionId);
    if (!container) {
      throw new ConversationStateError(`Session '${sessionId}' not found for rename.`);
    }

    container.metadata = {
      ...container.metadata,
      title: newTitle.trim() || "Untitled Conversation",
      updatedAt: Date.now(),
    };

    this.persistence.saveSession(this.exportSession(sessionId)).catch(() => {});
    return Object.freeze({ ...container.metadata });
  }

  /**
   * Updates session metadata fields.
   */
  public updateSessionMetadata(sessionId: string, updates: UpdateSessionOptions): SessionMetadata {
    const container = this.sessions.get(sessionId);
    if (!container) {
      throw new ConversationStateError(`Session '${sessionId}' not found for update.`);
    }

    container.metadata = {
      ...container.metadata,
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
      ...(updates.summary !== undefined ? { summary: updates.summary } : {}),
      ...(updates.activeProvider !== undefined ? { activeProvider: updates.activeProvider } : {}),
      ...(updates.activeModel !== undefined ? { activeModel: updates.activeModel } : {}),
      ...(updates.metadata ? { metadata: { ...container.metadata.metadata, ...updates.metadata } } : {}),
      updatedAt: Date.now(),
    };

    this.persistence.saveSession(this.exportSession(sessionId)).catch(() => {});
    return Object.freeze({ ...container.metadata });
  }

  /**
   * Synchronizes message count and token usage into session metadata.
   */
  public updateSessionMetrics(
    sessionId: string,
    tokenUsageDelta: { promptTokens?: number; completionTokens?: number; totalTokens?: number; estimatedCostUSD?: number }
  ): void {
    const container = this.sessions.get(sessionId);
    if (!container) return;

    const currentUsage = container.metadata.tokenUsage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUSD: 0,
    };
    const nextPrompt = (tokenUsageDelta.promptTokens || 0) + (currentUsage.promptTokens || 0);
    const nextComp = (tokenUsageDelta.completionTokens || 0) + (currentUsage.completionTokens || 0);
    const nextTotal = (tokenUsageDelta.totalTokens || 0) + (currentUsage.totalTokens || 0);
    const nextCost = (tokenUsageDelta.estimatedCostUSD || 0) + (currentUsage.estimatedCostUSD || 0);

    container.metadata = {
      ...container.metadata,
      messageCount: container.state.getMessages().length,
      tokenUsage: {
        promptTokens: nextPrompt,
        completionTokens: nextComp,
        totalTokens: nextTotal,
        estimatedCostUSD: nextCost,
      },
      updatedAt: Date.now(),
    };

    this.persistence.saveSession(this.exportSession(sessionId)).catch(() => {});
  }

  /**
   * Deletes a session. If active session was deleted, switches to remaining or creates new.
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const exists = this.sessions.has(sessionId);
    if (!exists) return false;

    this.sessions.delete(sessionId);
    await this.persistence.deleteSession(sessionId);

    if (this.activeSessionId === sessionId) {
      const remaining = Array.from(this.sessions.keys());
      if (remaining.length > 0) {
        this.switchSession(remaining[0]);
      } else {
        this.createSession({ title: "New Conversation" });
      }
    }

    return true;
  }

  /**
   * Exports full session domain data container.
   */
  public exportSession(sessionId: string): SessionData {
    const container = this.sessions.get(sessionId);
    if (!container) {
      throw new ConversationStateError(`Session '${sessionId}' not found.`);
    }

    return {
      metadata: { ...container.metadata, messageCount: container.state.getMessages().length },
      state: container.state.createSnapshot(),
      turns: container.history.listTurns(),
    };
  }

  /**
   * Imports session domain data.
   */
  public importSession(sessionData: SessionData): SessionMetadata {
    const meta = sessionData.metadata;
    const state = new ConversationState(
      meta.sessionId,
      sessionData.state.systemPrompt,
      meta.activeProvider,
      meta.activeModel
    );

    for (const msg of sessionData.state.messages) {
      if (msg.role === "user") state.appendUserMessage(msg.content, msg.metadata);
      else if (msg.role === "assistant") state.appendAssistantMessage(msg.content, msg.metadata);
      else if (msg.role === "system") state.appendSystemMessage(msg.content);
    }

    const history = new ConversationHistory();
    for (const turn of sessionData.turns) {
      history.addTurn(turn);
    }

    const defaultMetrics = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUSD: 0,
    };
    const sanitizedMeta: SessionMetadata = {
      ...meta,
      tokenUsage: meta.tokenUsage || defaultMetrics,
    };

    const container: SessionContainer = {
      metadata: sanitizedMeta,
      state,
      history,
    };

    this.sessions.set(meta.sessionId, container);
    return Object.freeze({ ...sanitizedMeta });
  }

  /**
   * Loads all persisted sessions from storage into in-memory registry.
   */
  public async loadAndRestorePersistedSessions(): Promise<SessionMetadata[]> {
    try {
      const metaList = await this.persistence.listSessions();
      const restoredMeta: SessionMetadata[] = [];

      for (const meta of metaList) {
        const fullData = await this.persistence.loadSession(meta.sessionId);
        if (fullData && fullData.metadata && fullData.state) {
          const restored = this.importSession(fullData);
          restoredMeta.push(restored);
        }
      }

      restoredMeta.sort((a, b) => b.updatedAt - a.updatedAt);
      return restoredMeta;
    } catch (err) {
      console.warn("[SessionManager] Failed to load persisted sessions, proceeding with in-memory:", err);
      return [];
    }
  }

  /**
   * Creates and saves a named memory snapshot for the active session.
   */
  public async createSnapshot(label?: string): Promise<SessionSnapshot> {
    const activeData = this.getActiveSession();
    const snapshotId = `snap_${generateUUID()}`;
    const snapshot: SessionSnapshot = {
      snapshotId,
      sessionId: this.activeSessionId,
      label: label || `Snapshot ${new Date().toLocaleTimeString()}`,
      data: activeData,
      createdAt: Date.now(),
    };

    await this.persistence.saveSnapshot(snapshot);
    return Object.freeze(snapshot);
  }

  /**
   * Restores a session from a memory snapshot.
   */
  public async restoreSnapshot(snapshotId: string): Promise<SessionMetadata> {
    const snapshot = await this.persistence.loadSnapshot(snapshotId);
    if (!snapshot || !snapshot.data) {
      throw new ConversationStateError(`Snapshot '${snapshotId}' not found.`);
    }

    const restoredMeta = this.importSession(snapshot.data);
    this.switchSession(restoredMeta.sessionId);
    await this.persistence.saveSession(this.exportSession(restoredMeta.sessionId));
    return restoredMeta;
  }

  /**
   * Lists all saved snapshots.
   */
  public async listSnapshots(sessionId?: string): Promise<ReadonlyArray<SessionSnapshot>> {
    return this.persistence.listSnapshots(sessionId || this.activeSessionId);
  }

  /**
   * Deletes a snapshot.
   */
  public async deleteSnapshot(snapshotId: string): Promise<boolean> {
    return this.persistence.deleteSnapshot(snapshotId);
  }

  /**
   * Clears all sessions (for tests/reset).
   */
  public async clearAll(): Promise<void> {
    this.sessions.clear();
    this.activeSessionId = "";
    await this.persistence.clearAll();
  }
}
