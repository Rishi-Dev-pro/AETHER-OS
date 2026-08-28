/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 5 Component: Runtime Event Listener Subsystem (`runtime-events.ts`)
 *
 * @file runtime-events.ts
 * @description Event subscription handler bridging ConversationRuntime event emissions to the Zustand store,
 * providing pure event-driven UI updates for messages, streaming, metrics, and multi-session lifecycles.
 *
 * @module @aether/runtime/frontend/runtime-events
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 5
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
  SessionCreatedEvent,
  SessionSwitchedEvent,
  SessionRenamedEvent,
  SessionDeletedEvent,
} from "../conversation/conversation-types";
import { useConversationStore, type FrontendMessage } from "./conversation-store";

/**
 * Synchronizes messages from active snapshot into Zustand store.
 */
function syncMessagesFromSnapshot(conversationRuntime: ConversationRuntime, status: "PENDING" | "COMPLETED" = "COMPLETED") {
  try {
    const snapshot = conversationRuntime.snapshot();
    const frontendMessages: ReadonlyArray<FrontendMessage> = snapshot.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      providerId: snapshot.activeProvider,
      modelId: snapshot.activeModel,
      status,
    }));

    const storeInstance = useConversationStore.getState();
    storeInstance.setMessages(frontendMessages);
    storeInstance.takeSnapshot(snapshot);
  } catch (err) {
    console.error("Failed to sync conversation state snapshot:", err);
  }
}

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
    (_event) => {}
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
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
      useConversationStore.getState().setIsThinking(false);
    }
  );

  const subStreamStarted = conversationRuntime.subscribeToEvents<any>(
    "ExecutionStreamStarted",
    (_event) => {
      const store = useConversationStore.getState();
      store.setIsThinking(true);
      store.setIsStreaming(true);
    }
  );

  const subChunkRendered = conversationRuntime.subscribeToEvents<any>(
    "ExecutionChunkRendered",
    (event) => {
      const store = useConversationStore.getState();
      store.setStreamProgress(event.progress);
      syncMessagesFromSnapshot(conversationRuntime, "PENDING");
    }
  );

  const subStreamCompleted = conversationRuntime.subscribeToEvents<any>(
    "ExecutionStreamCompleted",
    (_event) => {
      const store = useConversationStore.getState();
      store.setIsStreaming(false);
      store.setStreamProgress(null);
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
    }
  );

  const subStreamCancelled = conversationRuntime.subscribeToEvents<any>(
    "ExecutionStreamCancelled",
    (_event) => {
      const store = useConversationStore.getState();
      store.setIsThinking(false);
      store.setIsStreaming(false);
      store.setStreamProgress(null);
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
    }
  );

  const subCompleted = conversationRuntime.subscribeToEvents<ExecutionCompletedEvent>(
    "ExecutionCompleted",
    (event) => {
      const storeInstance = useConversationStore.getState();
      storeInstance.setIsThinking(false);
      storeInstance.setIsStreaming(false);

      if (event.result) {
        storeInstance.updateMetrics({
          lastLatency: event.result.durationMs,
        });
      }

      // Refresh session list
      storeInstance.setSessions(conversationRuntime.listSessions());
    }
  );

  const subFailed = conversationRuntime.subscribeToEvents<ExecutionFailedEvent>(
    "ExecutionFailed",
    (event) => {
      const storeInstance = useConversationStore.getState();
      storeInstance.setIsThinking(false);
      storeInstance.setIsStreaming(false);
      storeInstance.addError({
        code: "EXECUTION_FAILED",
        message: event.error || "Execution failed",
      });
    }
  );

  // Multi-session lifecycle event subscriptions
  const subSessionCreated = conversationRuntime.subscribeToEvents<SessionCreatedEvent>(
    "SessionCreated",
    (event) => {
      const store = useConversationStore.getState();
      store.setSessions(conversationRuntime.listSessions());
      store.setActiveSession(event.sessionId, event.title);
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
    }
  );

  const subSessionSwitched = conversationRuntime.subscribeToEvents<SessionSwitchedEvent>(
    "SessionSwitched",
    (event) => {
      const store = useConversationStore.getState();
      store.setSessions(conversationRuntime.listSessions());
      store.setActiveSession(event.currentSessionId);
      store.setIsThinking(false);
      store.setIsStreaming(false);
      store.setStreamProgress(null);
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
    }
  );

  const subSessionRenamed = conversationRuntime.subscribeToEvents<SessionRenamedEvent>(
    "SessionRenamed",
    (event) => {
      const store = useConversationStore.getState();
      store.setSessions(conversationRuntime.listSessions());
      store.updateSessionInStore(event.sessionId, { title: event.newTitle });
    }
  );

  const subSessionDeleted = conversationRuntime.subscribeToEvents<SessionDeletedEvent>(
    "SessionDeleted",
    (event) => {
      const store = useConversationStore.getState();
      store.removeSessionFromStore(event.sessionId);
      store.setSessions(conversationRuntime.listSessions());
      store.setActiveSession(conversationRuntime.getActiveSessionId());
      syncMessagesFromSnapshot(conversationRuntime, "COMPLETED");
    }
  );

  return () => {
    conversationRuntime.unsubscribeFromEvents(subStarted);
    conversationRuntime.unsubscribeFromEvents(subProvider);
    conversationRuntime.unsubscribeFromEvents(subRequest);
    conversationRuntime.unsubscribeFromEvents(subResponse);
    conversationRuntime.unsubscribeFromEvents(subUpdated);
    conversationRuntime.unsubscribeFromEvents(subStreamStarted);
    conversationRuntime.unsubscribeFromEvents(subChunkRendered);
    conversationRuntime.unsubscribeFromEvents(subStreamCompleted);
    conversationRuntime.unsubscribeFromEvents(subStreamCancelled);
    conversationRuntime.unsubscribeFromEvents(subCompleted);
    conversationRuntime.unsubscribeFromEvents(subFailed);
    conversationRuntime.unsubscribeFromEvents(subSessionCreated);
    conversationRuntime.unsubscribeFromEvents(subSessionSwitched);
    conversationRuntime.unsubscribeFromEvents(subSessionRenamed);
    conversationRuntime.unsubscribeFromEvents(subSessionDeleted);
  };
}
