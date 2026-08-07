/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 2 Component: Conversation Runtime Diagnostics (`runtime-diagnostics.ts`)
 *
 * @file runtime-diagnostics.ts
 * @description Secret-free performance and token usage metrics collector for conversation runtime.
 *
 * @module @aether/runtime/conversation/runtime-diagnostics
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 2
 */

import type { ProviderUsageStatistics } from "../../types/provider-adapters/adapter-types";
import type { RuntimeDiagnosticsMetricsSnapshot } from "./conversation-types";

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
 * Secret-free metrics tracker for runtime execution performance and token usages.
 */
export class RuntimeDiagnostics {
  private activeProvider = "groq-provider";
  private activeModel = "llama-3.3-70b-versatile";
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalLatencyMs = 0;
  private totalPromptTokens = 0;
  private totalCompletionTokens = 0;
  private conversationMessageCount = 0;

  public setActiveProviderAndModel(providerId: string, modelId: string): void {
    this.activeProvider = providerId;
    this.activeModel = modelId;
  }

  public setConversationMessageCount(count: number): void {
    this.conversationMessageCount = count;
  }

  public recordExecution(
    providerId: string,
    modelId: string,
    usage: ProviderUsageStatistics | undefined,
    durationMs: number,
    isSuccess: boolean
  ): void {
    this.activeProvider = providerId;
    this.activeModel = modelId;
    this.totalRequests++;
    this.totalLatencyMs += durationMs;

    if (isSuccess) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }

    if (usage) {
      this.totalPromptTokens += usage.promptTokens ?? 0;
      this.totalCompletionTokens += usage.completionTokens ?? 0;
    }
  }

  public createSnapshot(): Readonly<RuntimeDiagnosticsMetricsSnapshot> {
    const totalTokens = this.totalPromptTokens + this.totalCompletionTokens;
    const averageLatencyMs =
      this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;
    // Basic secret-free estimation ($0.0001 per 1k tokens)
    const estimatedTotalCostUSD = Number(((totalTokens / 1000) * 0.0001).toFixed(6));

    const snapshot: RuntimeDiagnosticsMetricsSnapshot = {
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageLatencyMs,
      totalPromptTokens: this.totalPromptTokens,
      totalCompletionTokens: this.totalCompletionTokens,
      totalTokens,
      estimatedTotalCostUSD,
      conversationMessageCount: this.conversationMessageCount,
      timestamp: Date.now(),
    };

    return deepFreeze(snapshot);
  }

  public reset(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalLatencyMs = 0;
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.conversationMessageCount = 0;
  }
}
