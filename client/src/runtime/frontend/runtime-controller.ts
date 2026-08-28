/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Runtime Controller Subsystem (`runtime-controller.ts`)
 *
 * @file runtime-controller.ts
 * @description Master application-level controller orchestrating initialization, message dispatches,
 * streaming lifecycle with cancellation guards, multi-session switching, diagnostics retrieval, and speech controls.
 *
 * @module @aether/runtime/frontend/runtime-controller
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
 */

import {
  initializeRuntimeBridge,
  getConversationRuntime,
  resetRuntimeBridge,
  hasRuntimeBridge,
  getDiagnosticsSnapshot,
} from "./runtime-bridge";
import { bindSpeechRecognition, setTTSEnabled, cancelSpeech, speakLatestAssistantMessage } from "./speech-runtime";
import { getFrontendRuntimeStatus, type FrontendRuntimeStatus } from "./runtime-status";
import { useConversationStore } from "./conversation-store";
import type { ExecutionResult } from "../conversation/conversation-types";
import type { SessionMetadata, SessionSnapshot } from "../conversation/session-types";
import type { RuntimeConfiguration } from "../../types/provider-adapters/runtime-types";

export interface DiagnosticsData {
  readonly latency: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCost: number;
  readonly executionDuration: number;
  readonly conversationLength: number;
  readonly provider: string;
  readonly model: string;
}

export class RuntimeController {
  private static instance: RuntimeController | null = null;
  private unbindSpeech: (() => void) | null = null;
  private activeStreamController: AbortController | null = null;

  /**
   * Singleton instance accessor.
   */
  public static getInstance(): RuntimeController {
    if (!RuntimeController.instance) {
      RuntimeController.instance = new RuntimeController();
    }
    return RuntimeController.instance;
  }

  /**
   * Initializes runtime bridge, event subscriptions, and speech recognition bindings.
   */
  public async initialize(
    config?: Partial<RuntimeConfiguration>,
    customEnv?: Record<string, string | undefined>,
    systemPrompt?: string,
    providerId?: string,
    modelId?: string
  ): Promise<void> {
    const runtime = await initializeRuntimeBridge(
      config,
      customEnv,
      systemPrompt,
      providerId,
      modelId
    );

    // Bind speech recognition trigger auto-sending
    if (this.unbindSpeech) {
      this.unbindSpeech();
    }
    this.unbindSpeech = bindSpeechRecognition(runtime);
  }

  // ============================================================================
  // MULTI-SESSION ORCHESTRATION
  // ============================================================================

  /**
   * Creates a new conversation session, safely cancelling any active stream first.
   */
  public async createSession(title?: string, providerId?: string, modelId?: string): Promise<SessionMetadata> {
    if (!hasRuntimeBridge()) {
      await this.initialize();
    }

    this.cancelStreaming();
    const runtime = getConversationRuntime();
    return runtime.createSession({ title, providerId, modelId });
  }

  /**
   * Switches active session to target sessionId.
   * Cancels any active stream to prevent cross-session token contamination.
   */
  public async switchSession(sessionId: string): Promise<SessionMetadata> {
    if (!hasRuntimeBridge()) {
      await this.initialize();
    }

    this.cancelStreaming();
    const runtime = getConversationRuntime();
    return runtime.switchSession(sessionId);
  }

  /**
   * Renames an existing session.
   */
  public renameSession(sessionId: string, newTitle: string): SessionMetadata {
    const runtime = getConversationRuntime();
    return runtime.renameSession(sessionId, newTitle);
  }

  /**
   * Deletes a session and updates active state.
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    if (!hasRuntimeBridge()) {
      await this.initialize();
    }

    this.cancelStreaming();
    const runtime = getConversationRuntime();
    return runtime.deleteSession(sessionId);
  }

  /**
   * Creates a memory snapshot for the active session.
   */
  public async createMemorySnapshot(label?: string): Promise<SessionSnapshot> {
    const runtime = getConversationRuntime();
    return runtime.createMemorySnapshot(label);
  }

  /**
   * Restores a session from a memory snapshot.
   */
  public async restoreMemorySnapshot(snapshotId: string): Promise<SessionMetadata> {
    this.cancelStreaming();
    const runtime = getConversationRuntime();
    return runtime.restoreMemorySnapshot(snapshotId);
  }

  /**
   * Lists all saved snapshots.
   */
  public async listMemorySnapshots(sessionId?: string): Promise<ReadonlyArray<SessionSnapshot>> {
    const runtime = getConversationRuntime();
    return runtime.listMemorySnapshots(sessionId);
  }

  /**
   * Deletes a memory snapshot.
   */
  public async deleteMemorySnapshot(snapshotId: string): Promise<boolean> {
    const runtime = getConversationRuntime();
    return runtime.deleteMemorySnapshot(snapshotId);
  }

  // ============================================================================
  // MESSAGE EXECUTION & STREAMING
  // ============================================================================

  /**
   * Sends user message prompt to active ConversationRuntime and handles speech synthesis on response.
   */
  public async sendMessage(
    prompt: string,
    providerId?: string,
    modelId?: string
  ): Promise<ExecutionResult> {
    if (!hasRuntimeBridge()) {
      await this.initialize();
    }

    const runtime = getConversationRuntime();
    try {
      const result = await runtime.sendMessage(prompt, providerId, modelId);

      // Auto-speak assistant response if TTS is enabled
      if (result && result.response && result.response.message && result.response.message.content) {
        speakLatestAssistantMessage(result.response.message.content);
      }

      return result;
    } catch (err: any) {
      useConversationStore.getState().addError({
        code: "SEND_MESSAGE_ERROR",
        message: err.message || "Failed to send message",
      });
      throw err;
    }
  }

  /**
   * Sends user message prompt to active ConversationRuntime with real-time SSE token streaming.
   */
  public async sendStreamingMessage(
    prompt: string,
    providerId?: string,
    modelId?: string
  ): Promise<ExecutionResult> {
    if (!hasRuntimeBridge()) {
      await this.initialize();
    }

    if (this.activeStreamController) {
      this.activeStreamController.abort();
    }
    this.activeStreamController = new AbortController();

    const runtime = getConversationRuntime();
    try {
      const result = await runtime.sendStreamingMessage(
        prompt,
        providerId,
        modelId,
        this.activeStreamController.signal
      );

      this.activeStreamController = null;

      // Auto-speak assistant response ONLY after stream completion
      if (result && result.response && result.response.message && result.response.message.content) {
        speakLatestAssistantMessage(result.response.message.content);
      }

      return result;
    } catch (err: any) {
      this.activeStreamController = null;
      useConversationStore.getState().addError({
        code: "STREAM_MESSAGE_ERROR",
        message: err.message || "Failed to send streaming message",
      });
      throw err;
    }
  }

  /**
   * Cancels active streaming generation.
   */
  public cancelStreaming(): void {
    if (this.activeStreamController) {
      this.activeStreamController.abort("User cancelled generation");
      this.activeStreamController = null;
    }
  }

  /**
   * Clears conversation history in store and runtime.
   */
  public clearConversation(): void {
    if (hasRuntimeBridge()) {
      getConversationRuntime().clearConversation();
    }
    useConversationStore.getState().clearConversation();
  }

  /**
   * Sets active provider and model.
   */
  public setProviderAndModel(providerId: string, modelId: string): void {
    useConversationStore.getState().setProviderAndModel(providerId, modelId);
    if (hasRuntimeBridge()) {
      getConversationRuntime().startConversation(undefined, providerId, modelId);
    }
  }

  /**
   * Toggles browser SpeechSynthesis TTS on/off.
   */
  public setTTSEnabled(enabled: boolean): void {
    setTTSEnabled(enabled);
  }

  /**
   * Cancels active browser TTS.
   */
  public cancelSpeech(): void {
    cancelSpeech();
  }

  /**
   * Retrieves aggregated diagnostics metrics for UI panel rendering.
   */
  public getDiagnostics(): DiagnosticsData {
    const store = useConversationStore.getState();
    const runtimeDiag = getDiagnosticsSnapshot();

    return {
      latency: store.lastLatency || (runtimeDiag ? runtimeDiag.averageLatencyMs : 0),
      promptTokens: store.tokenUsage.promptTokens || (runtimeDiag ? runtimeDiag.totalPromptTokens : 0),
      completionTokens:
        store.tokenUsage.completionTokens || (runtimeDiag ? runtimeDiag.totalCompletionTokens : 0),
      totalTokens: store.tokenUsage.totalTokens || (runtimeDiag ? runtimeDiag.totalTokens : 0),
      estimatedCost:
        store.estimatedCost || (runtimeDiag ? runtimeDiag.estimatedTotalCostUSD : 0),
      executionDuration: store.lastLatency,
      conversationLength:
        store.messages.length || (runtimeDiag ? runtimeDiag.conversationMessageCount : 0),
      provider: store.currentProvider,
      model: store.currentModel,
    };
  }

  /**
   * Retrieves current frontend runtime status.
   */
  public getStatus(): FrontendRuntimeStatus {
    return getFrontendRuntimeStatus();
  }

  /**
   * Takes snapshot of current conversation.
   */
  public takeSnapshot(): void {
    if (hasRuntimeBridge()) {
      const snap = getConversationRuntime().snapshot();
      useConversationStore.getState().takeSnapshot(snap);
    }
  }

  /**
   * Destroys runtime bridge and speech bindings cleanly.
   */
  public destroy(): void {
    if (this.unbindSpeech) {
      this.unbindSpeech();
      this.unbindSpeech = null;
    }
    cancelSpeech();
    resetRuntimeBridge();
  }
}

export const runtimeController = RuntimeController.getInstance();
