/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Execution Coordinator (`execution-coordinator.ts`)
 *
 * @file execution-coordinator.ts
 * @description Canonical runtime orchestrator executing AI requests via UnifiedAdapterRuntime,
 * updating conversation state and history, and emitting runtime events.
 *
 * @module @aether/runtime/conversation/execution-coordinator
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type { UnifiedAdapterRuntime } from "../../types/provider-adapters/unified-adapter-runtime";
import type { TranslationRequest, TranslationResponse, ConversationMessage as CanonicalMessage } from "../../types/provider-adapters/message-types";
import type { ConversationState } from "./conversation-state";
import type { ConversationHistory } from "./conversation-history";
import type { RuntimeEvents } from "./runtime-events";
import type { RuntimeDiagnostics } from "./runtime-diagnostics";
import type { ExecutionResult, ConversationTurn } from "./conversation-types";
import { ExecutionCoordinatorError } from "./conversation-errors";

/**
 * Helper to deeply freeze objects recursively.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj as Readonly<T>;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj as Readonly<T>;
}

/**
 * Canonical orchestrator managing request execution, response parsing, state mutation, and event dispatch.
 */
export class ExecutionCoordinator {
  constructor(
    private readonly runtime: UnifiedAdapterRuntime,
    private readonly state: ConversationState,
    private readonly history: ConversationHistory,
    private readonly events: RuntimeEvents,
    private readonly diagnostics: RuntimeDiagnostics
  ) {}

  /**
   * Validates a TranslationRequest payload fail-fast.
   *
   * @param request Target TranslationRequest.
   */
  public validateRequest(request: TranslationRequest): void {
    if (!request) {
      throw new ExecutionCoordinatorError("TranslationRequest cannot be undefined or null.");
    }
    if (!request.context || !request.context.messages || request.context.messages.length === 0) {
      throw new ExecutionCoordinatorError("TranslationRequest context must contain at least one message.");
    }
  }

  /**
   * Deterministically builds the outgoing request context with context pruning and token budgeting.
   */
  public prepareRequestContext(
    conversationId: string,
    executionId: string,
    targetModel: string,
    targetMaxTokens = 8192,
    reserveOutputTokens = 1000
  ): TranslationRequest {
    const rawMessages = this.state.getMessages();
    const systemPrompt = this.state.getSystemPrompt();

    const estimateTokens = (text: unknown) => {
      if (!text) return 4;
      const len = typeof text === "string" ? text.length : JSON.stringify(text).length;
      return Math.ceil(len / 4) + 4;
    };
    const systemTokens = estimateTokens(systemPrompt);
    const availableInputBudget = Math.max(500, targetMaxTokens - reserveOutputTokens);

    const canonicalMessages: CanonicalMessage[] = rawMessages.map((m) => ({
      id: m.id,
      role: m.role as any,
      content: m.content,
      timestamp: m.timestamp,
    }));

    const activeMessages = [...canonicalMessages];
    let totalEstimated = systemTokens + activeMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);

    let prunedCount = 0;
    // Rule 2: Protect recent 3 turns (approx 6 messages)
    const protectedCount = Math.min(activeMessages.length, 6);

    // Rule 4: Sliding window pruning of oldest non-protected messages
    while (totalEstimated > availableInputBudget && activeMessages.length > protectedCount) {
      const removed = activeMessages.shift();
      if (removed) {
        prunedCount++;
        totalEstimated -= estimateTokens(removed.content);
      }
    }

    if (prunedCount > 0) {
      this.events.emit({
        eventId: `evt_${Date.now()}_prune`,
        type: "ContextPruned",
        conversationId,
        originalMessageCount: rawMessages.length,
        prunedMessageCount: prunedCount,
        estimatedTokens: totalEstimated,
        timestamp: Date.now(),
      });
    }

    const request: TranslationRequest = {
      requestId: `req_${executionId}`,
      modelId: targetModel,
      context: {
        conversationId,
        messages: activeMessages,
      },
      systemInstruction: systemPrompt,
    };

    this.validateRequest(request);
    return request;
  }

  /**
   * Executes a user prompt against the UnifiedAdapterRuntime.
   *
   * @param adapterId Provider adapter ID (e.g., 'groq-adapter', 'nvidia-adapter').
   * @param prompt User input text.
   * @param modelId Optional target model ID.
   * @returns Deeply frozen ExecutionResult object.
   */
  public async execute(
    adapterId: string,
    prompt: string,
    modelId?: string
  ): Promise<Readonly<ExecutionResult>> {
    const startTime = Date.now();
    const executionId = `exec_${startTime}_${Math.random().toString(36).substring(2, 7)}`;
    const conversationId = this.state.getConversationId();

    // 1. Emit ExecutionStarted event
    this.events.emit({
      eventId: `evt_${Date.now()}_start`,
      type: "ExecutionStarted",
      conversationId,
      executionId,
      prompt,
      timestamp: Date.now(),
    });

    // 2. Append User Message to State
    const userMessage = this.state.appendUserMessage(prompt);

    // 3. Emit ConversationUpdated event for User Message
    this.events.emit({
      eventId: `evt_${Date.now()}_msg_user`,
      type: "ConversationUpdated",
      conversationId,
      message: userMessage,
      totalMessages: this.state.getMessages().length,
      timestamp: Date.now(),
    });

    // 4. Determine canonical adapter and provider IDs
    const rawAdapter = adapterId || "groq-adapter";
    const targetAdapter = rawAdapter.endsWith("-provider")
      ? rawAdapter.replace("-provider", "-adapter")
      : rawAdapter.endsWith("-adapter")
      ? rawAdapter
      : `${rawAdapter}-adapter`;

    const targetProvider = targetAdapter.replace("-adapter", "-provider");
    const targetModel = modelId || (targetAdapter === "nvidia-adapter" ? "nvidia/nvidia-nemotron-nano-9b-v2" : "llama-3.3-70b-versatile");

    this.state.setProviderAndModel(targetProvider, targetModel);
    this.diagnostics.setActiveProviderAndModel(targetProvider, targetModel);

    // 5. Emit ProviderSelected event
    this.events.emit({
      eventId: `evt_${Date.now()}_prov`,
      type: "ProviderSelected",
      conversationId,
      executionId,
      providerId: targetAdapter,
      modelId: targetModel,
      timestamp: Date.now(),
    });

    // 6. Build TranslationRequest with context pruning and token budgeting
    const translationRequest = this.prepareRequestContext(conversationId, executionId, targetModel);

    // 7. Emit RequestDispatched event
    this.events.emit({
      eventId: `evt_${Date.now()}_req`,
      type: "RequestDispatched",
      conversationId,
      executionId,
      request: translationRequest,
      timestamp: Date.now(),
    });

    try {
      // 8. Execute request through UnifiedAdapterRuntime
      const response: TranslationResponse = await this.runtime.execute(targetAdapter, translationRequest);
      const durationMs = Date.now() - startTime;


      // 9. Emit ResponseReceived event
      this.events.emit({
        eventId: `evt_${Date.now()}_res`,
        type: "ResponseReceived",
        conversationId,
        executionId,
        response,
        timestamp: Date.now(),
      });

      // 10. Append Assistant Message to State
      const assistantContent = response.message?.content || "";
      const assistantMessage = this.state.appendAssistantMessage(assistantContent);

      // 11. Emit ConversationUpdated event for Assistant Message
      this.events.emit({
        eventId: `evt_${Date.now()}_msg_ast`,
        type: "ConversationUpdated",
        conversationId,
        message: assistantMessage,
        totalMessages: this.state.getMessages().length,
        timestamp: Date.now(),
      });

      // 12. Create Turn and Record in History
      const turn: ConversationTurn = {
        turnId: `turn_${Date.now()}`,
        userMessage,
        assistantMessage,
        status: "COMPLETED",
        providerId: targetAdapter,
        modelId: targetModel,
        timestamp: Date.now(),
      };
      this.history.addTurn(turn);

      // 13. Record Diagnostics
      this.diagnostics.recordExecution(
        targetAdapter,
        targetModel,
        response.usage,
        durationMs,
        true
      );
      this.diagnostics.setConversationMessageCount(this.state.getMessages().length);

      // 14. Create ExecutionResult
      const result: ExecutionResult = deepFreeze({
        executionId,
        conversationId,
        response,
        turn,
        durationMs,
        timestamp: Date.now(),
      });

      // 15. Emit ExecutionCompleted event
      this.events.emit({
        eventId: `evt_${Date.now()}_complete`,
        type: "ExecutionCompleted",
        conversationId,
        executionId,
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      const errorMsg = err.message || "Execution failed";

      // Create Failed Turn and Record in History
      const failedTurn: ConversationTurn = {
        turnId: `turn_${Date.now()}_failed`,
        userMessage,
        status: "FAILED",
        providerId: targetAdapter,
        modelId: targetModel,
        timestamp: Date.now(),
        error: errorMsg,
      };
      this.history.addTurn(failedTurn);

      // Record Failed Diagnostics
      this.diagnostics.recordExecution(
        targetAdapter,
        targetModel,
        undefined,
        durationMs,
        false
      );

      // Emit ExecutionFailed event
      this.events.emit({
        eventId: `evt_${Date.now()}_failed`,
        type: "ExecutionFailed",
        conversationId,
        executionId,
        error: errorMsg,
        timestamp: Date.now(),
      });

      throw new ExecutionCoordinatorError(`AI Execution failed: ${errorMsg}`, {
        originalError: errorMsg,
        executionId,
      });
    }
  }

  /**
   * Executes a streaming prompt yielding incremental response deltas and emitting streaming events.
   */
  public async executeStreaming(
    adapterId: string,
    prompt: string,
    modelId?: string,
    signal?: AbortSignal,
    onChunk?: (chunkText: string, accumulated: string) => void
  ): Promise<Readonly<ExecutionResult>> {
    const startTime = Date.now();
    const executionId = `exec_str_${startTime}_${Math.random().toString(36).substring(2, 7)}`;
    const conversationId = this.state.getConversationId();

    this.events.emit({
      eventId: `evt_${Date.now()}_start`,
      type: "ExecutionStarted",
      conversationId,
      executionId,
      prompt,
      timestamp: Date.now(),
    });

    const userMessage = this.state.appendUserMessage(prompt);

    this.events.emit({
      eventId: `evt_${Date.now()}_msg_user`,
      type: "ConversationUpdated",
      conversationId,
      message: userMessage,
      totalMessages: this.state.getMessages().length,
      timestamp: Date.now(),
    });

    const rawAdapter = adapterId || "groq-adapter";
    const targetAdapter = rawAdapter.endsWith("-provider")
      ? rawAdapter.replace("-provider", "-adapter")
      : rawAdapter.endsWith("-adapter")
      ? rawAdapter
      : `${rawAdapter}-adapter`;

    const targetProvider = targetAdapter.replace("-adapter", "-provider");
    const targetModel = modelId || (targetAdapter === "nvidia-adapter" ? "nvidia/nvidia-nemotron-nano-9b-v2" : "llama-3.3-70b-versatile");

    this.state.setProviderAndModel(targetProvider, targetModel);
    this.diagnostics.setActiveProviderAndModel(targetProvider, targetModel);

    this.events.emit({
      eventId: `evt_${Date.now()}_prov`,
      type: "ProviderSelected",
      conversationId,
      executionId,
      providerId: targetAdapter,
      modelId: targetModel,
      timestamp: Date.now(),
    });

    this.events.emit({
      eventId: `evt_${Date.now()}_str_start`,
      type: "ExecutionStreamStarted",
      conversationId,
      executionId,
      providerId: targetAdapter,
      modelId: targetModel,
      timestamp: Date.now(),
    });

    const translationRequest = this.prepareRequestContext(conversationId, executionId, targetModel);

    this.events.emit({
      eventId: `evt_${Date.now()}_req`,
      type: "RequestDispatched",
      conversationId,
      executionId,
      request: translationRequest,
      timestamp: Date.now(),
    });

    const assistantMessage = this.state.appendAssistantMessage("");

    let accumulatedContent = "";
    let accumulatedReasoning = "";
    let chunksCount = 0;
    let finishReason: any = "stop";

    try {
      const chunkStream = (this.runtime as any).executeStreaming(
        targetAdapter,
        translationRequest,
        undefined,
        signal
      );

      for await (const chunk of chunkStream) {
        if (signal?.aborted) {
          throw new Error("Stream cancelled by user");
        }

        chunksCount++;
        if (chunk.deltaContent) {
          accumulatedContent += chunk.deltaContent;
        }
        if (chunk.deltaReasoning) {
          accumulatedReasoning += chunk.deltaReasoning;
        }
        if (chunk.finishReason) {
          finishReason = chunk.finishReason;
        }

        this.state.updateMessage(assistantMessage.id, { content: accumulatedContent });

        this.events.emit({
          eventId: `evt_${Date.now()}_chk_${chunksCount}`,
          type: "ExecutionChunkReceived",
          conversationId,
          executionId,
          chunk,
          timestamp: Date.now(),
        });

        const currentLatencyMs = Date.now() - startTime;
        const tokensProcessed = accumulatedContent.split(/\s+/).filter(Boolean).length;
        const tokensPerSecond = currentLatencyMs > 0 ? (tokensProcessed / currentLatencyMs) * 1000 : 0;

        this.events.emit({
          eventId: `evt_${Date.now()}_rnd_${chunksCount}`,
          type: "ExecutionChunkRendered",
          conversationId,
          executionId,
          currentContent: accumulatedContent,
          progress: Object.freeze({
            chunksReceived: chunksCount,
            tokensProcessed,
            currentLatencyMs,
            averageChunkLatencyMs: chunksCount > 0 ? Math.round(currentLatencyMs / chunksCount) : 0,
            tokensPerSecond: parseFloat(tokensPerSecond.toFixed(2)),
          }),
          timestamp: Date.now(),
        });

        if (onChunk && chunk.deltaContent) {
          onChunk(chunk.deltaContent, accumulatedContent);
        }
      }

      const durationMs = Date.now() - startTime;
      const promptTokens = prompt.split(/\s+/).filter(Boolean).length;
      const completionTokens = accumulatedContent.split(/\s+/).filter(Boolean).length;

      const usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUSD: (promptTokens + completionTokens) * 0.000001,
      };

      const response: TranslationResponse = {
        responseId: `resp_${executionId}`,
        requestId: translationRequest.requestId,
        modelId: targetModel,
        message: {
          id: assistantMessage.id,
          role: "assistant",
          content: accumulatedContent,
          reasoningContent: accumulatedReasoning || undefined,
          timestamp: Date.now(),
        },
        finishReason,
        usage,
        timestamp: Date.now(),
      };

      this.events.emit({
        eventId: `evt_${Date.now()}_str_complete`,
        type: "ExecutionStreamCompleted",
        conversationId,
        executionId,
        response: {
          responseId: response.responseId,
          requestId: response.requestId,
          modelId: response.modelId,
          fullContent: accumulatedContent,
          reasoningContent: accumulatedReasoning || undefined,
          finishReason,
          usage,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      const updatedAssistantMessage = { ...assistantMessage, content: accumulatedContent };
      this.events.emit({
        eventId: `evt_${Date.now()}_msg_ast`,
        type: "ConversationUpdated",
        conversationId,
        message: updatedAssistantMessage,
        totalMessages: this.state.getMessages().length,
        timestamp: Date.now(),
      });

      const turn: ConversationTurn = {
        turnId: `turn_${Date.now()}`,
        userMessage,
        assistantMessage: updatedAssistantMessage,
        status: "COMPLETED",
        providerId: targetAdapter,
        modelId: targetModel,
        timestamp: Date.now(),
      };
      this.history.addTurn(turn);

      this.diagnostics.recordExecution(targetAdapter, targetModel, usage, durationMs, true);
      this.diagnostics.setConversationMessageCount(this.state.getMessages().length);

      const result: ExecutionResult = deepFreeze({
        executionId,
        conversationId,
        response,
        turn,
        durationMs,
        timestamp: Date.now(),
      });

      this.events.emit({
        eventId: `evt_${Date.now()}_complete`,
        type: "ExecutionCompleted",
        conversationId,
        executionId,
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err.message || "Streaming failed";
      const isCancelled = signal?.aborted || errorMsg.includes("cancelled");

      if (isCancelled) {
        this.events.emit({
          eventId: `evt_${Date.now()}_cancelled`,
          type: "ExecutionStreamCancelled",
          conversationId,
          executionId,
          reason: errorMsg,
          timestamp: Date.now(),
        });
      } else {
        this.events.emit({
          eventId: `evt_${Date.now()}_str_failed`,
          type: "ExecutionStreamFailed",
          conversationId,
          executionId,
          error: errorMsg,
          timestamp: Date.now(),
        });
      }

      const failedTurn: ConversationTurn = {
        turnId: `turn_${Date.now()}_failed`,
        userMessage,
        status: "FAILED",
        providerId: targetAdapter,
        modelId: targetModel,
        timestamp: Date.now(),
        error: errorMsg,
      };
      this.history.addTurn(failedTurn);

      this.diagnostics.recordExecution(targetAdapter, targetModel, undefined, durationMs, false);

      this.events.emit({
        eventId: `evt_${Date.now()}_failed`,
        type: "ExecutionFailed",
        conversationId,
        executionId,
        error: errorMsg,
        timestamp: Date.now(),
      });

      throw new ExecutionCoordinatorError(`AI Execution failed: ${errorMsg}`, {
        originalError: errorMsg,
        executionId,
      });
    }
  }


  public createExecutionResult(
    executionId: string,
    conversationId: string,
    response: TranslationResponse,
    turn: ConversationTurn,
    durationMs: number
  ): Readonly<ExecutionResult> {
    return deepFreeze({
      executionId,
      conversationId,
      response,
      turn,
      durationMs,
      timestamp: Date.now(),
    });
  }
}
