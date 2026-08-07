/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: Runtime Bridge (`runtime-bridge.ts`)
 *
 * @file runtime-bridge.ts
 * @description Thread-safe bridge connecting the React frontend to the initialized AI runtime singleton
 * and orchestrating ConversationRuntime instances.
 *
 * @module @aether/runtime/frontend/runtime-bridge
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { bootstrapRuntime } from "../runtime-bootstrap";
import { getRuntime, hasRuntime, resetRuntime, type RuntimeInstance } from "../runtime-singleton";
import { getStatus, RuntimeStatus } from "../runtime-status";
import { ConversationRuntime } from "../conversation/conversation-runtime";
import type { RuntimeDiagnosticsMetricsSnapshot } from "../conversation/conversation-types";
import type { RuntimeConfiguration } from "../../types/provider-adapters/runtime-types";
import { useConversationStore } from "./conversation-store";
import { bindRuntimeEvents } from "./runtime-events";

let activeConversationRuntime: ConversationRuntime | null = null;
let unbindEventsCallback: (() => void) | null = null;

export interface BridgeStatusReport {
  readonly ready: boolean;
  readonly status: RuntimeStatus;
  readonly hasInstance: boolean;
  readonly hasConversationRuntime: boolean;
}

/**
 * Initializes the AI runtime bridge and instantiates the ConversationRuntime.
 * Safe against double-initialization.
 */
export async function initializeRuntimeBridge(
  config?: Partial<RuntimeConfiguration>,
  customEnv?: Record<string, string | undefined>,
  systemPrompt?: string,
  providerId?: string,
  modelId?: string
): Promise<ConversationRuntime> {
  if (activeConversationRuntime && hasRuntime()) {
    return activeConversationRuntime;
  }

  let instance: Readonly<RuntimeInstance>;
  if (!hasRuntime()) {
    instance = await bootstrapRuntime(config, customEnv);
  } else {
    instance = getRuntime();
  }

  // Create ConversationRuntime façade using initialized UnifiedAdapterRuntime
  activeConversationRuntime = new ConversationRuntime(
    instance.runtime,
    systemPrompt,
    providerId || "groq-adapter",
    modelId || "llama-3.3-70b-versatile"
  );

  // Bind event pipeline to conversation store
  if (unbindEventsCallback) {
    unbindEventsCallback();
  }
  unbindEventsCallback = bindRuntimeEvents(activeConversationRuntime);

  // Update store state
  const store = useConversationStore.getState();
  store.setRuntimeReady(true);
  store.setProviderAndModel(
    providerId || activeConversationRuntime.snapshot().activeProvider || "groq-adapter",
    modelId || activeConversationRuntime.snapshot().activeModel || "llama-3.3-70b-versatile"
  );

  return activeConversationRuntime;
}

/**
 * Retrieves active ConversationRuntime instance.
 * @throws Error if runtime bridge has not been initialized.
 */
export function getConversationRuntime(): ConversationRuntime {
  if (!activeConversationRuntime) {
    throw new Error(
      "Runtime bridge has not been initialized. Call initializeRuntimeBridge() first."
    );
  }
  return activeConversationRuntime;
}

/**
 * Checks if runtime bridge is active.
 */
export function hasRuntimeBridge(): boolean {
  return activeConversationRuntime !== null && hasRuntime();
}

/**
 * Gets high-level bridge status.
 */
export function getRuntimeBridgeStatus(): BridgeStatusReport {
  return {
    ready: hasRuntimeBridge() && getStatus() === RuntimeStatus.READY,
    status: getStatus(),
    hasInstance: hasRuntime(),
    hasConversationRuntime: activeConversationRuntime !== null,
  };
}

/**
 * Returns secret-free diagnostics metrics snapshot.
 */
export function getDiagnosticsSnapshot(): RuntimeDiagnosticsMetricsSnapshot | null {
  if (!activeConversationRuntime) {
    return null;
  }
  return activeConversationRuntime.diagnostics();
}

/**
 * Returns provider statuses map.
 */
export function getProviderStatus(): Record<string, boolean> {
  if (!hasRuntime()) {
    return {};
  }
  try {
    const { providerManager } = getRuntime();
    const snapshot = providerManager.getProviderSnapshot();
    const statusMap: Record<string, boolean> = {};
    for (const p of snapshot.providers) {
      const state = providerManager.lifecycleManager.getLifecycleState(p.providerId);
      statusMap[p.providerId] = state !== "DISABLED" && state !== "DISPOSED" && state !== "UNHEALTHY";
    }
    return statusMap;


  } catch {
    return {};
  }
}

/**
 * Cleans up and resets runtime bridge.
 */
export function resetRuntimeBridge(): void {
  if (unbindEventsCallback) {
    unbindEventsCallback();
    unbindEventsCallback = null;
  }
  if (activeConversationRuntime) {
    activeConversationRuntime.clearConversation();
    activeConversationRuntime = null;
  }
  useConversationStore.getState().setRuntimeReady(false);
  resetRuntime();
}
