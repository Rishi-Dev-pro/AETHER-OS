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


    // 6. Build TranslationRequest with canonical conversation context
    const canonicalMessages: CanonicalMessage[] = this.state.getMessages().map((m) => {
      if (m.role === "system") {
        return { id: m.id, role: "system", content: m.content, timestamp: m.timestamp };
      } else if (m.role === "user") {
        return { id: m.id, role: "user", content: m.content, timestamp: m.timestamp };
      } else {
        return { id: m.id, role: "assistant", content: m.content, timestamp: m.timestamp };
      }
    });

    const translationRequest: TranslationRequest = {
      requestId: `req_${executionId}`,
      modelId: targetModel,
      context: {
        conversationId,
        messages: canonicalMessages,
      },
      systemInstruction: this.state.getSystemPrompt(),
    };

    this.validateRequest(translationRequest);

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
