/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Conversation Runtime Façade (`conversation-runtime.ts`)
 *
 * @file conversation-runtime.ts
 * @description Master public entry point orchestrating multi-session conversation state,
 * history, execution queueing, event dispatches, diagnostics, persistence, and UnifiedAdapterRuntime execution.
 *
 * @module @aether/runtime/conversation/conversation-runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import { getRuntime } from "../runtime-singleton";
import type { UnifiedAdapterRuntime } from "../../types/provider-adapters/unified-adapter-runtime";
import { ExecutionQueue } from "./execution-queue";
import { ExecutionCoordinator } from "./execution-coordinator";
import { RuntimeEvents } from "./runtime-events";
import { RuntimeDiagnostics } from "./runtime-diagnostics";
import { SessionManager } from "./session-manager";
import type {
  SessionMetadata,
  SessionData,
  SessionSnapshot,
  CreateSessionOptions,
} from "./session-types";
import type {
  ExecutionResult,
  ConversationExport,
  ConversationStateSnapshot,
  RuntimeDiagnosticsMetricsSnapshot,
  RuntimeEvent,
  RuntimeEventType,
} from "./conversation-types";

/**
 * Public conversation runtime façade managing end-to-end AI conversation lifecycles and sessions.
 */
export class ConversationRuntime {
  private readonly adapterRuntime: UnifiedAdapterRuntime;
  private readonly sessionManager: SessionManager;
  private readonly queue: ExecutionQueue;
  private readonly events: RuntimeEvents;
  private readonly diagnosticsMetrics: RuntimeDiagnostics;
  private coordinator: ExecutionCoordinator;

  constructor(
    runtimeOverride?: UnifiedAdapterRuntime,
    systemPrompt?: string,
    providerId?: string,
    modelId?: string,
    sessionManagerOverride?: SessionManager
  ) {
    this.adapterRuntime = runtimeOverride ?? getRuntime().runtime;
    this.sessionManager = sessionManagerOverride ?? new SessionManager();
    this.queue = new ExecutionQueue();
    this.events = new RuntimeEvents();
    this.diagnosticsMetrics = new RuntimeDiagnostics();

    // Create or initialize default session
    this.sessionManager.createSession({
      title: "New Conversation",
      systemPrompt,
      providerId,
      modelId,
    });

    this.coordinator = this.buildCoordinator();
  }

  private buildCoordinator(): ExecutionCoordinator {
    return new ExecutionCoordinator(
      this.adapterRuntime,
      this.sessionManager.getActiveState(),
      this.sessionManager.getActiveHistory(),
      this.events,
      this.diagnosticsMetrics
    );
  }

  /**
   * Initializes or updates active conversation parameters.
   */
  public startConversation(systemPrompt?: string, providerId?: string, modelId?: string): void {
    const state = this.sessionManager.getActiveState();
    if (systemPrompt) {
      state.setSystemPrompt(systemPrompt);
    }
    if (providerId && modelId) {
      state.setProviderAndModel(providerId, modelId);
      this.diagnosticsMetrics.setActiveProviderAndModel(providerId, modelId);
      this.sessionManager.updateSessionMetadata(this.sessionManager.getActiveSessionId(), {
        activeProvider: providerId,
        activeModel: modelId,
      });
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Creates a new conversation session, switches to it, and emits SessionCreated event.
   */
  public createSession(options: CreateSessionOptions = {}): SessionMetadata {
    const meta = this.sessionManager.createSession(options);
    this.coordinator = this.buildCoordinator();

    this.events.emit({
      eventId: `evt_${Date.now()}_sess_created`,
      type: "SessionCreated",
      conversationId: meta.sessionId,
      sessionId: meta.sessionId,
      title: meta.title,
      timestamp: Date.now(),
    });

    return meta;
  }

  /**
   * Switches active session to specified sessionId, updates coordinator, and emits SessionSwitched event.
   */
  public switchSession(sessionId: string): SessionMetadata {
    const prevId = this.sessionManager.getActiveSessionId();
    const meta = this.sessionManager.switchSession(sessionId);
    this.coordinator = this.buildCoordinator();

    this.events.emit({
      eventId: `evt_${Date.now()}_sess_switched`,
      type: "SessionSwitched",
      conversationId: meta.sessionId,
      previousSessionId: prevId,
      currentSessionId: meta.sessionId,
      timestamp: Date.now(),
    });

    return meta;
  }

  /**
   * Lists all sessions in chronological order.
   */
  public listSessions(): ReadonlyArray<SessionMetadata> {
    return this.sessionManager.listSessions();
  }

  /**
   * Gets active session ID.
   */
  public getActiveSessionId(): string {
    return this.sessionManager.getActiveSessionId();
  }

  /**
   * Gets complete active session data.
   */
  public getActiveSession(): SessionData {
    return this.sessionManager.getActiveSession();
  }

  /**
   * Renames a session and emits SessionRenamed event.
   */
  public renameSession(sessionId: string, newTitle: string): SessionMetadata {
    const meta = this.sessionManager.renameSession(sessionId, newTitle);

    this.events.emit({
      eventId: `evt_${Date.now()}_sess_renamed`,
      type: "SessionRenamed",
      conversationId: meta.sessionId,
      sessionId: meta.sessionId,
      newTitle: meta.title,
      timestamp: Date.now(),
    });

    return meta;
  }

  /**
   * Deletes a session and emits SessionDeleted event.
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const success = await this.sessionManager.deleteSession(sessionId);
    if (success) {
      this.coordinator = this.buildCoordinator();

      this.events.emit({
        eventId: `evt_${Date.now()}_sess_deleted`,
        type: "SessionDeleted",
        conversationId: sessionId,
        sessionId,
        timestamp: Date.now(),
      });
    }
    return success;
  }

  /**
   * Restores all persisted sessions from storage.
   */
  public async loadAndRestorePersistedSessions(): Promise<SessionMetadata[]> {
    const loaded = await this.sessionManager.loadAndRestorePersistedSessions();
    if (loaded.length > 0) {
      this.coordinator = this.buildCoordinator();
    }
    return loaded;
  }

  /**
   * Creates a named memory snapshot of the active session.
   */
  public async createMemorySnapshot(label?: string): Promise<SessionSnapshot> {
    return this.sessionManager.createSnapshot(label);
  }

  /**
   * Restores active session from a snapshot.
   */
  public async restoreMemorySnapshot(snapshotId: string): Promise<SessionMetadata> {
    const meta = await this.sessionManager.restoreSnapshot(snapshotId);
    this.coordinator = this.buildCoordinator();
    return meta;
  }

  /**
   * Lists all memory snapshots.
   */
  public async listMemorySnapshots(sessionId?: string): Promise<ReadonlyArray<SessionSnapshot>> {
    return this.sessionManager.listSnapshots(sessionId);
  }

  /**
   * Deletes a memory snapshot.
   */
  public async deleteMemorySnapshot(snapshotId: string): Promise<boolean> {
    return this.sessionManager.deleteSnapshot(snapshotId);
  }

  // ============================================================================
  // MESSAGE EXECUTION
  // ============================================================================

  /**
   * Enqueues and executes a user prompt message through the execution queue & coordinator pipeline.
   */
  public async sendMessage(
    prompt: string,
    providerId?: string,
    modelId?: string
  ): Promise<Readonly<ExecutionResult>> {
    const state = this.sessionManager.getActiveState();
    const rawProvider = providerId || state.getActiveProvider();
    const targetAdapter = rawProvider.endsWith("-provider")
      ? rawProvider.replace("-provider", "-adapter")
      : rawProvider.endsWith("-adapter")
      ? rawProvider
      : `${rawProvider}-adapter`;
    const targetModel = modelId || state.getActiveModel();

    const result = await this.queue.enqueue(prompt, targetAdapter, targetModel, () =>
      this.coordinator.execute(targetAdapter, prompt, targetModel)
    );

    // Sync session metrics & persistence
    if (result && result.response && result.response.usage) {
      const usage = result.response.usage as any;
      this.sessionManager.updateSessionMetrics(this.sessionManager.getActiveSessionId(), {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUSD: usage.estimatedCostUSD ?? usage.estimatedCostUsd ?? 0,
      });
    }

    return result;
  }

  /**
   * Enqueues and executes a streaming prompt message yielding real-time chunks.
   */
  public async sendStreamingMessage(
    prompt: string,
    providerId?: string,
    modelId?: string,
    signal?: AbortSignal,
    onChunk?: (chunkText: string, accumulated: string) => void
  ): Promise<Readonly<ExecutionResult>> {
    const state = this.sessionManager.getActiveState();
    const rawProvider = providerId || state.getActiveProvider();
    const targetAdapter = rawProvider.endsWith("-provider")
      ? rawProvider.replace("-provider", "-adapter")
      : rawProvider.endsWith("-adapter")
      ? rawProvider
      : `${rawProvider}-adapter`;
    const targetModel = modelId || state.getActiveModel();

    const result = await this.queue.enqueue(prompt, targetAdapter, targetModel, () =>
      this.coordinator.executeStreaming(targetAdapter, prompt, targetModel, signal, onChunk)
    );

    // Sync session metrics & persistence
    if (result && result.response && result.response.usage) {
      const usage = result.response.usage as any;
      this.sessionManager.updateSessionMetrics(this.sessionManager.getActiveSessionId(), {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUSD: usage.estimatedCostUSD ?? usage.estimatedCostUsd ?? 0,
      });
    }

    return result;
  }

  /**
   * Clears active conversation state, history, and queue.
   */
  public clearConversation(): void {
    this.queue.clear();
    const state = this.sessionManager.getActiveState();
    const history = this.sessionManager.getActiveHistory();
    state.clearConversation();
    history.clearHistory();
    this.events.clear();
    this.diagnosticsMetrics.reset();
  }

  /**
   * Ends conversation cleanly.
   */
  public endConversation(): void {
    this.clearConversation();
  }

  /**
   * Exports full active conversation state and history.
   */
  public exportConversation(): Readonly<ConversationExport> {
    const state = this.sessionManager.getActiveState();
    const history = this.sessionManager.getActiveHistory();
    return history.exportConversation(state.createSnapshot());
  }

  /**
   * Imports conversation turns and state from export data into active session.
   */
  public importConversation(data: ConversationExport): void {
    const state = this.sessionManager.getActiveState();
    const history = this.sessionManager.getActiveHistory();
    history.importConversation(data);
    if (data.state) {
      state.setSystemPrompt(data.state.systemPrompt);
      state.setProviderAndModel(data.state.activeProvider, data.state.activeModel);
    }
  }

  /**
   * Returns current secret-free diagnostics metrics.
   */
  public diagnostics(): Readonly<RuntimeDiagnosticsMetricsSnapshot> {
    return this.diagnosticsMetrics.createSnapshot();
  }

  /**
   * Returns current immutable active conversation state snapshot.
   */
  public snapshot(): Readonly<ConversationStateSnapshot> {
    return this.sessionManager.getActiveState().createSnapshot();
  }

  /**
   * Subscribes to runtime events.
   */
  public subscribeToEvents<T extends RuntimeEvent = RuntimeEvent>(
    eventType: RuntimeEventType | "*",
    listener: (event: T) => void
  ): string {
    return this.events.subscribe(eventType, listener);
  }

  /**
   * Unsubscribes from runtime events.
   */
  public unsubscribeFromEvents(subscriptionId: string): boolean {
    return this.events.unsubscribe(subscriptionId);
  }

  /**
   * Returns event history snapshot.
   */
  public eventHistory(): ReadonlyArray<RuntimeEvent> {
    return this.events.createSnapshot();
  }
}
