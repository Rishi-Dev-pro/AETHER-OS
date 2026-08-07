/**
 * AETHER OS — Phase 9.11 AI Runtime Integration Layer
 * Milestone 3 Component: Frontend Conversation Store (`conversation-store.ts`)
 *
 * @file conversation-store.ts
 * @description Strongly-typed, immutable Zustand store managing conversation messages, runtime state,
 * thinking/speaking indicators, active providers, latency, token usage, cost, errors, and snapshots.
 *
 * @module @aether/runtime/frontend/conversation-store
 * @version 1.0.0
 * @status FROZEN ARCHITECTURE SPECIFICATION — PHASE 9.11 MILESTONE 3
 */

import { create } from "zustand";
import type { ConversationStateSnapshot } from "../conversation/conversation-types";

/**
 * Representation of a conversation message within the frontend state.
 */
export interface FrontendMessage {
  readonly id: string;
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
  readonly timestamp: number;
  readonly providerId?: string;
  readonly modelId?: string;
  readonly latency?: number;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly status?: "PENDING" | "COMPLETED" | "FAILED";
  readonly error?: string;
}

/**
 * Struct representing detailed error entries.
 */
export interface ErrorEntry {
  readonly id: string;
  readonly message: string;
  readonly code?: string;
  readonly timestamp: number;
}

/**
 * Token usage aggregated metric struct.
 */
export interface TokenUsageMetrics {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * Interface contract defining Frontend Conversation Store state and mutators.
 */
export interface ConversationState {
  // Core State
  readonly messages: ReadonlyArray<FrontendMessage>;
  readonly isThinking: boolean;
  readonly isSpeaking: boolean;
  readonly currentProvider: string;
  readonly currentModel: string;
  readonly runtimeReady: boolean;
  readonly lastLatency: number;
  readonly tokenUsage: TokenUsageMetrics;
  readonly estimatedCost: number;
  readonly errors: ReadonlyArray<ErrorEntry>;
  readonly snapshots: ReadonlyArray<ConversationStateSnapshot>;

  // Actions / Mutators
  readonly setRuntimeReady: (ready: boolean) => void;
  readonly setIsThinking: (thinking: boolean) => void;
  readonly setIsSpeaking: (speaking: boolean) => void;
  readonly setProviderAndModel: (provider: string, model: string) => void;
  readonly addMessage: (message: FrontendMessage) => void;
  readonly updateMessage: (id: string, update: Partial<FrontendMessage>) => void;
  readonly setMessages: (messages: ReadonlyArray<FrontendMessage>) => void;
  readonly updateMetrics: (metrics: {
    lastLatency?: number;
    tokenUsage?: Partial<TokenUsageMetrics>;
    estimatedCost?: number;
  }) => void;
  readonly addError: (error: string | Error | { code?: string; message: string }) => void;
  readonly clearErrors: () => void;
  readonly takeSnapshot: (snapshot: ConversationStateSnapshot) => void;
  readonly clearConversation: () => void;
}

const initialTokenUsage: TokenUsageMetrics = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isThinking: false,
  isSpeaking: false,
  currentProvider: "groq-adapter",
  currentModel: "llama-3.3-70b-versatile",
  runtimeReady: false,
  lastLatency: 0,
  tokenUsage: initialTokenUsage,
  estimatedCost: 0,
  errors: [],
  snapshots: [],

  setRuntimeReady: (ready) => set({ runtimeReady: ready }),

  setIsThinking: (thinking) => set({ isThinking: thinking }),

  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  setProviderAndModel: (provider, model) =>
    set({
      currentProvider: provider,
      currentModel: model,
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, update) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...update } : msg
      ),
    })),

  setMessages: (messages) => set({ messages: [...messages] }),

  updateMetrics: (metrics) =>
    set((state) => {
      const nextLatency = metrics.lastLatency ?? state.lastLatency;
      const nextPromptTokens =
        (metrics.tokenUsage?.promptTokens ?? 0) + state.tokenUsage.promptTokens;
      const nextCompletionTokens =
        (metrics.tokenUsage?.completionTokens ?? 0) + state.tokenUsage.completionTokens;
      const nextTotalTokens =
        (metrics.tokenUsage?.totalTokens ?? 0) + state.tokenUsage.totalTokens;
      const nextCost = (metrics.estimatedCost ?? 0) + state.estimatedCost;

      return {
        lastLatency: nextLatency,
        tokenUsage: {
          promptTokens: nextPromptTokens,
          completionTokens: nextCompletionTokens,
          totalTokens: nextTotalTokens,
        },
        estimatedCost: nextCost,
      };
    }),

  addError: (err) =>
    set((state) => {
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : (err as any)?.message || "Unknown error";
      const code = typeof err === "object" && err !== null && "code" in err ? (err as any).code : undefined;

      const newError: ErrorEntry = {
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        message,
        code,
        timestamp: Date.now(),
      };

      return {
        errors: [...state.errors, newError],
      };
    }),

  clearErrors: () => set({ errors: [] }),

  takeSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    })),

  clearConversation: () =>
    set({
      messages: [],
      isThinking: false,
      isSpeaking: false,
      lastLatency: 0,
      tokenUsage: initialTokenUsage,
      estimatedCost: 0,
      errors: [],
    }),
}));
