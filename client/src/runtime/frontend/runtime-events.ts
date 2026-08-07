/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: Runtime Event Listener Subsystem (`runtime-events.ts`)
 *
 * @file runtime-events.ts
 * @description Event subscription handler bridging ConversationRuntime event emissions to the Zustand store,
 * providing pure event-driven UI updates without polling or timers.
 *
 * @module @aether/runtime/frontend/runtime-events
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import type { ConversationRuntime } from "../conversation/conversation-runtime";
import type {
  ExecutionStartedEvent,
  ProviderSelectedEvent,
  RequestDispatchedEvent,
  ResponseReceivedEvent,
  ConversationUpdatedEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
} from "../conversation/conversation-types";
import { useConversationStore, type FrontendMessage } from "./conversation-store";

/**
 * Binds store updates to ConversationRuntime events.
 *
 * @param conversationRuntime Active ConversationRuntime instance.
 * @returns Cleanup function to unsubscribe all listeners.
 */
export function bindRuntimeEvents(conversationRuntime: ConversationRuntime): () => void {
  const subStarted = conversationRuntime.subscribeToEvents<ExecutionStartedEvent>(
    "ExecutionStarted",
    (_event) => {
      useConversationStore.getState().setIsThinking(true);
    }
  );

  const subProvider = conversationRuntime.subscribeToEvents<ProviderSelectedEvent>(
    "ProviderSelected",
    (event) => {
      useConversationStore
        .getState()
        .setProviderAndModel(event.providerId, event.modelId || "");
    }
  );

  const subRequest = conversationRuntime.subscribeToEvents<RequestDispatchedEvent>(
    "RequestDispatched",
    (_event) => {
      // Event handler for dispatched request
    }
  );

  const subResponse = conversationRuntime.subscribeToEvents<ResponseReceivedEvent>(
    "ResponseReceived",
    (event) => {
      const response = event.response;
      if (response && response.usage) {
        const usage = response.usage as any;
        useConversationStore.getState().updateMetrics({
          tokenUsage: {
            promptTokens: usage.promptTokens || 0,
            completionTokens: usage.completionTokens || 0,
            totalTokens: usage.totalTokens || 0,
          },
          estimatedCost: usage.estimatedCostUsd ?? usage.estimatedCostUSD ?? 0,
        });
      }
    }
  );


  const subUpdated = conversationRuntime.subscribeToEvents<ConversationUpdatedEvent>(
    "ConversationUpdated",
    (_event) => {
      // Sync messages from runtime state snapshot


      try {
        const snapshot = conversationRuntime.snapshot();
        const frontendMessages: ReadonlyArray<FrontendMessage> = snapshot.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          providerId: snapshot.activeProvider,
          modelId: snapshot.activeModel,
          status: "COMPLETED",
        }));

        const storeInstance = useConversationStore.getState();
        storeInstance.setMessages(frontendMessages);
        storeInstance.setIsThinking(false);
        storeInstance.takeSnapshot(snapshot);
      } catch (err) {
        console.error("Failed to sync conversation state snapshot:", err);
      }
    }
  );

  const subCompleted = conversationRuntime.subscribeToEvents<ExecutionCompletedEvent>(
    "ExecutionCompleted",
    (event) => {
      const storeInstance = useConversationStore.getState();
      storeInstance.setIsThinking(false);

      if (event.result) {
        storeInstance.updateMetrics({
          lastLatency: event.result.durationMs,
        });
      }
    }
  );

  const subFailed = conversationRuntime.subscribeToEvents<ExecutionFailedEvent>(
    "ExecutionFailed",
    (event) => {
      const storeInstance = useConversationStore.getState();
      storeInstance.setIsThinking(false);
      storeInstance.addError({
        code: "EXECUTION_FAILED",
        message: event.error || "Execution failed",
      });
    }
  );

  return () => {
    conversationRuntime.unsubscribeFromEvents(subStarted);
    conversationRuntime.unsubscribeFromEvents(subProvider);
    conversationRuntime.unsubscribeFromEvents(subRequest);
    conversationRuntime.unsubscribeFromEvents(subResponse);
    conversationRuntime.unsubscribeFromEvents(subUpdated);
    conversationRuntime.unsubscribeFromEvents(subCompleted);
    conversationRuntime.unsubscribeFromEvents(subFailed);
  };
}
