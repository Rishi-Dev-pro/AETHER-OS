/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: Frontend Runtime Status Subsystem (`runtime-status.ts`)
 *
 * @file runtime-status.ts
 * @description Provides high-level status aggregation across runtime readiness, active provider, queue length,
 * execution state, thinking/speaking indicators, and error tracking.
 *
 * @module @aether/runtime/frontend/runtime-status
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { useConversationStore } from "./conversation-store";
import { getRuntimeBridgeStatus, hasRuntimeBridge, getConversationRuntime } from "./runtime-bridge";

export interface FrontendRuntimeStatus {
  readonly runtimeReady: boolean;
  readonly currentProvider: string;
  readonly currentModel: string;
  readonly currentQueueLength: number;
  readonly thinking: boolean;
  readonly speaking: boolean;
  readonly connected: boolean;
  readonly executing: boolean;
  readonly error: string | null;
}

/**
 * Computes consolidated frontend runtime status snapshot.
 */
export function getFrontendRuntimeStatus(): FrontendRuntimeStatus {
  const store = useConversationStore.getState();
  const bridgeStatus = getRuntimeBridgeStatus();

  let queueLength = 0;
  if (hasRuntimeBridge()) {
    try {
      const runtime = getConversationRuntime();
      // Inspect execution queue length via export or snapshot if available
      const exp = runtime.exportConversation();
      queueLength = exp.turns.filter((t) => t.status === "PENDING").length;
    } catch {
      queueLength = 0;
    }
  }

  const lastError = store.errors.length > 0 ? store.errors[store.errors.length - 1].message : null;

  return {
    runtimeReady: store.runtimeReady && bridgeStatus.ready,
    currentProvider: store.currentProvider,
    currentModel: store.currentModel,
    currentQueueLength: queueLength,
    thinking: store.isThinking,
    speaking: store.isSpeaking,
    connected: bridgeStatus.hasInstance,
    executing: store.isThinking,
    error: lastError,
  };
}

/**
 * Subscribes to status changes via store subscription.
 */
export function subscribeRuntimeStatus(
  listener: (status: FrontendRuntimeStatus) => void
): () => void {
  const unsubscribe = useConversationStore.subscribe(() => {
    listener(getFrontendRuntimeStatus());
  });
  return unsubscribe;
}
