/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: React Runtime Hooks (`runtime-hooks.ts`)
 *
 * @file runtime-hooks.ts
 * @description Strongly-typed React hooks consuming Zustand store and RuntimeController with zero state duplication.
 *
 * @module @aether/runtime/frontend/runtime-hooks
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { useCallback } from "react";
import { useConversationStore } from "./conversation-store";
import { runtimeController, type DiagnosticsData } from "./runtime-controller";
import { getFrontendRuntimeStatus, type FrontendRuntimeStatus } from "./runtime-status";

/**
 * Hook for consuming conversation messages, thinking status, sending messages, clearing history, and snapshot exports.
 */
export function useConversation() {
  const messages = useConversationStore((state) => state.messages);
  const isThinking = useConversationStore((state) => state.isThinking);
  const isSpeaking = useConversationStore((state) => state.isSpeaking);
  const isStreaming = useConversationStore((state) => state.isStreaming);
  const streamProgress = useConversationStore((state) => state.streamProgress);
  const errors = useConversationStore((state) => state.errors);

  const sendMessage = useCallback(
    (prompt: string, providerId?: string, modelId?: string) => {
      return runtimeController.sendMessage(prompt, providerId, modelId);
    },
    []
  );

  const sendStreamingMessage = useCallback(
    (prompt: string, providerId?: string, modelId?: string) => {
      return runtimeController.sendStreamingMessage(prompt, providerId, modelId);
    },
    []
  );

  const cancelStreaming = useCallback(() => {
    runtimeController.cancelStreaming();
  }, []);

  const clearConversation = useCallback(() => {
    runtimeController.clearConversation();
  }, []);

  const snapshot = useCallback(() => {
    runtimeController.takeSnapshot();
  }, []);

  return {
    messages,
    isThinking,
    isSpeaking,
    isStreaming,
    streamProgress,
    errors,
    sendMessage,
    sendStreamingMessage,
    cancelStreaming,
    clearConversation,
    snapshot,
  };
}

/**
 * Hook for consuming runtime readiness, status, queue length, and lifecycle triggers.
 */
export function useRuntime() {
  const runtimeReady = useConversationStore((state) => state.runtimeReady);
  const isThinking = useConversationStore((state) => state.isThinking);
  const isStreaming = useConversationStore((state) => state.isStreaming);

  const status: FrontendRuntimeStatus = getFrontendRuntimeStatus();

  const initialize = useCallback((config?: any, customEnv?: any) => {
    return runtimeController.initialize(config, customEnv);
  }, []);

  const destroy = useCallback(() => {
    runtimeController.destroy();
  }, []);

  return {
    runtimeReady,
    status,
    currentQueueLength: status.currentQueueLength,
    isExecuting: isThinking || isStreaming,
    isStreaming,
    initialize,
    destroy,
  };
}


/**
 * Hook for consuming real-time execution diagnostics (latency, token usage breakdown, estimated cost).
 */
export function useDiagnostics(): DiagnosticsData {
  const lastLatency = useConversationStore((state) => state.lastLatency);
  const tokenUsage = useConversationStore((state) => state.tokenUsage);
  const estimatedCost = useConversationStore((state) => state.estimatedCost);
  const currentProvider = useConversationStore((state) => state.currentProvider);
  const currentModel = useConversationStore((state) => state.currentModel);
  const messagesCount = useConversationStore((state) => state.messages.length);

  return {
    latency: lastLatency,
    promptTokens: tokenUsage.promptTokens,
    completionTokens: tokenUsage.completionTokens,
    totalTokens: tokenUsage.totalTokens,
    estimatedCost,
    executionDuration: lastLatency,
    conversationLength: messagesCount,
    provider: currentProvider,
    model: currentModel,
  };
}

/**
 * Hook for managing active AI provider and model configurations.
 */
export function useProvider() {
  const currentProvider = useConversationStore((state) => state.currentProvider);
  const currentModel = useConversationStore((state) => state.currentModel);

  const setProviderAndModel = useCallback((providerId: string, modelId: string) => {
    runtimeController.setProviderAndModel(providerId, modelId);
  }, []);

  const availableProviders = [
    { id: "groq-adapter", name: "Groq Llama 3.3 70B", defaultModel: "llama-3.3-70b-versatile" },
    { id: "nvidia-adapter", name: "NVIDIA Llama 3.1 405B", defaultModel: "meta/llama-3.1-405b-instruct" },
    { id: "openai-adapter", name: "OpenAI GPT-4o", defaultModel: "gpt-4o" },
    { id: "ollama-adapter", name: "Ollama Llama 3 local", defaultModel: "llama3" },
  ];

  return {
    currentProvider,
    currentModel,
    setProviderAndModel,
    availableProviders,
  };
}
