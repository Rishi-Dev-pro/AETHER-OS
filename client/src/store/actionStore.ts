/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Desktop Action Store
 *
 * @file actionStore.ts
 * @description Zustand state store tracking active desktop actions, execution metrics,
 * and recent action history.
 */

import { create } from "zustand";
import type {
  DesktopActionRequest,
  DesktopActionResult,
  ActionHistoryEntry,
} from "../types/desktopAction";

const MAX_HISTORY_LENGTH = 50;

interface ActionState {
  activeAction: DesktopActionRequest | null;
  lastResult: DesktopActionResult | null;
  history: ActionHistoryEntry[];
  isExecuting: boolean;

  startAction: (request: DesktopActionRequest) => void;
  finishAction: (result: DesktopActionResult) => void;
  failAction: (actionId: string, error: string) => void;
  clearHistory: () => void;
}

export const useActionStore = create<ActionState>((set) => ({
  activeAction: null,
  lastResult: null,
  history: [],
  isExecuting: false,

  startAction: (request) =>
    set((state) => ({
      activeAction: request,
      isExecuting: true,
      history: [
        { request, status: "pending" as const },
        ...state.history,
      ].slice(0, MAX_HISTORY_LENGTH),
    })),

  finishAction: (result) =>
    set((state) => {
      const updatedHistory = state.history.map((entry) =>
        entry.request.actionId === result.actionId
          ? {
              ...entry,
              result,
              status: result.success ? ("success" as const) : ("failed" as const),
            }
          : entry
      );

      return {
        activeAction:
          state.activeAction?.actionId === result.actionId ? null : state.activeAction,
        lastResult: result,
        isExecuting: false,
        history: updatedHistory,
      };
    }),

  failAction: (actionId, error) =>
    set((state) => {
      const updatedHistory = state.history.map((entry) =>
        entry.request.actionId === actionId
          ? {
              ...entry,
              result: {
                actionId,
                type: entry.request.type,
                success: false,
                message: error,
                durationMs: Date.now() - entry.request.timestamp,
                timestamp: Date.now(),
                error,
              },
              status: "failed" as const,
            }
          : entry
      );

      return {
        activeAction:
          state.activeAction?.actionId === actionId ? null : state.activeAction,
        isExecuting: false,
        history: updatedHistory,
      };
    }),

  clearHistory: () => set({ history: [], activeAction: null, lastResult: null }),
}));
