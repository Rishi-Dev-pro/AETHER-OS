/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation Runtime Façade (`conversation-runtime.ts`)
 *
 * @file conversation-runtime.ts
 * @description Master public entry point orchestrating conversation state, history, execution queueing,
 * event dispatches, diagnostics, and UnifiedAdapterRuntime execution.
 *
 * @module @aether/runtime/conversation/conversation-runtime
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import { getRuntime } from "../runtime-singleton";
import type { UnifiedAdapterRuntime } from "../../types/provider-adapters/unified-adapter-runtime";
import { ConversationState } from "./conversation-state";
import { ConversationHistory } from "./conversation-history";
import { ExecutionQueue } from "./execution-queue";
import { ExecutionCoordinator } from "./execution-coordinator";
import { RuntimeEvents } from "./runtime-events";
import { RuntimeDiagnostics } from "./runtime-diagnostics";
import type {
  ExecutionResult,
  ConversationExport,
  ConversationStateSnapshot,
  RuntimeDiagnosticsMetricsSnapshot,
  RuntimeEvent,
  RuntimeEventType,
} from "./conversation-types";

/**
 * Public conversation runtime façade managing end-to-end AI conversation lifecycles.
 */
export class ConversationRuntime {
  private readonly state: ConversationState;
  private readonly history: ConversationHistory;
  private readonly queue: ExecutionQueue;
  private readonly events: RuntimeEvents;
  private readonly diagnosticsMetrics: RuntimeDiagnostics;
  private readonly coordinator: ExecutionCoordinator;

  constructor(
    runtimeOverride?: UnifiedAdapterRuntime,
    systemPrompt?: string,
    providerId?: string,
    modelId?: string
  ) {
    const runtime = runtimeOverride ?? getRuntime().runtime;

    this.state = new ConversationState(undefined, systemPrompt, providerId, modelId);
    this.history = new ConversationHistory();
    this.queue = new ExecutionQueue();
    this.events = new RuntimeEvents();
    this.diagnosticsMetrics = new RuntimeDiagnostics();

    this.coordinator = new ExecutionCoordinator(
      runtime,
      this.state,
      this.history,
      this.events,
      this.diagnosticsMetrics
    );
  }

  /**
   * Initializes or updates active conversation parameters.
   */
  public startConversation(systemPrompt?: string, providerId?: string, modelId?: string): void {
    if (systemPrompt) {
      this.state.setSystemPrompt(systemPrompt);
    }
    if (providerId && modelId) {
      this.state.setProviderAndModel(providerId, modelId);
      this.diagnosticsMetrics.setActiveProviderAndModel(providerId, modelId);
    }
  }

  /**
   * Enqueues and executes a user prompt message through the execution queue & coordinator pipeline.
   *
   * @param prompt User prompt content.
   * @param providerId Optional provider ID override (e.g. 'groq-adapter').
   * @param modelId Optional model ID override.
   * @returns Promise resolving to execution result.
   */
  public async sendMessage(
    prompt: string,
    providerId?: string,
    modelId?: string
  ): Promise<Readonly<ExecutionResult>> {
    const rawProvider = providerId || this.state.getActiveProvider();
    const targetAdapter = rawProvider.endsWith("-provider")
      ? rawProvider.replace("-provider", "-adapter")
      : rawProvider.endsWith("-adapter")
      ? rawProvider
      : `${rawProvider}-adapter`;
    const targetModel = modelId || this.state.getActiveModel();

    return this.queue.enqueue(prompt, targetAdapter, targetModel, () =>
      this.coordinator.execute(targetAdapter, prompt, targetModel)
    );
  }

  /**
   * Enqueues and executes a streaming prompt message yielding real-time chunks.
   *
   * @param prompt User prompt content.
   * @param providerId Optional provider ID override.
   * @param modelId Optional model ID override.
   * @param signal Optional AbortSignal for stream cancellation.
   * @param onChunk Optional callback invoked per token delta.
   * @returns Promise resolving to execution result.
   */
  public async sendStreamingMessage(
    prompt: string,
    providerId?: string,
    modelId?: string,
    signal?: AbortSignal,
    onChunk?: (chunkText: string, accumulated: string) => void
  ): Promise<Readonly<ExecutionResult>> {
    const rawProvider = providerId || this.state.getActiveProvider();
    const targetAdapter = rawProvider.endsWith("-provider")
      ? rawProvider.replace("-provider", "-adapter")
      : rawProvider.endsWith("-adapter")
      ? rawProvider
      : `${rawProvider}-adapter`;
    const targetModel = modelId || this.state.getActiveModel();

    return this.queue.enqueue(prompt, targetAdapter, targetModel, () =>
      this.coordinator.executeStreaming(targetAdapter, prompt, targetModel, signal, onChunk)
    );
  }





  /**
   * Clears active conversation state, history, and queue.
   */
  public clearConversation(): void {
    this.queue.clear();
    this.state.clearConversation();
    this.history.clearHistory();
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
   * Exports full conversation state and history.
   */
  public exportConversation(): Readonly<ConversationExport> {
    return this.history.exportConversation(this.state.createSnapshot());
  }

  /**
   * Imports conversation turns and state from export data.
   */
  public importConversation(data: ConversationExport): void {
    this.history.importConversation(data);
    if (data.state) {
      this.state.setSystemPrompt(data.state.systemPrompt);
      this.state.setProviderAndModel(data.state.activeProvider, data.state.activeModel);
    }
  }

  /**
   * Returns current secret-free diagnostics metrics.
   */
  public diagnostics(): Readonly<RuntimeDiagnosticsMetricsSnapshot> {
    return this.diagnosticsMetrics.createSnapshot();
  }

  /**
   * Returns current immutable conversation state snapshot.
   */
  public snapshot(): Readonly<ConversationStateSnapshot> {
    return this.state.createSnapshot();
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
