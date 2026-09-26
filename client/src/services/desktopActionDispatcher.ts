/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Frontend Desktop Action Dispatcher
 *
 * @file desktopActionDispatcher.ts
 * @description Manages socket-based action requests, execution timeout safeguards,
 * state synchronization with useActionStore, and voice TTS confirmation.
 */

import { getSocket } from "./socket";
import { useActionStore } from "../store/actionStore";
import { speak } from "../runtime/frontend/speech-runtime";
import type {
  DesktopActionRequest,
  DesktopActionResult,
  DesktopActionType,
} from "../types/desktopAction";
import type { IntentResult } from "../types/intent";

const DEFAULT_TIMEOUT_MS = 5000;

export interface DispatchOptions {
  timeoutMs?: number;
  speakConfirmation?: boolean;
}

class DesktopActionDispatcher {
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: DesktopActionResult) => void;
      reject: (error: Error) => void;
      timer: any;
    }
  >();
  private listenersBound = false;

  constructor() {
    this.ensureSocketListener();
  }

  /**
   * Binds global os:action_result listener on socket once available.
   */
  private ensureSocketListener() {
    if (this.listenersBound) return;
    try {
      const socket = getSocket();
      socket.on("os:action_result", (result: DesktopActionResult) => {
        this.handleActionResult(result);
      });
      this.listenersBound = true;
    } catch {
      // In SSR or test environments, socket might not be immediately available
    }
  }

  /**
   * Dispatches a structured desktop action to the backend via Socket.IO.
   */
  async dispatch(
    partialRequest: {
      type: DesktopActionType;
      target?: string;
      params?: Record<string, any>;
      source?: "intent" | "llm_tool" | "manual_ui";
      actionId?: string;
      timestamp?: number;
    },
    options: DispatchOptions = {}
  ): Promise<DesktopActionResult> {
    this.ensureSocketListener();

    const actionId =
      partialRequest.actionId ||
      `act_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const timestamp = partialRequest.timestamp || Date.now();
    const source = partialRequest.source || "manual_ui";
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

    const request: DesktopActionRequest = {
      actionId,
      type: partialRequest.type,
      target: partialRequest.target,
      params: partialRequest.params || {},
      source,
      timestamp,
    };

    // Update store state
    useActionStore.getState().startAction(request);

    // Speak pre-execution voice confirmation if enabled
    if (options.speakConfirmation) {
      this.provideVoiceFeedback(request);
    }

    return new Promise<DesktopActionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(actionId);
        const timeoutError = `Action '${request.type}' timed out after ${timeoutMs}ms`;
        useActionStore.getState().failAction(actionId, timeoutError);
        resolve({
          actionId,
          type: request.type,
          success: false,
          message: timeoutError,
          durationMs: timeoutMs,
          timestamp: Date.now(),
          error: "TIMEOUT",
        });
      }, timeoutMs);

      this.pendingRequests.set(actionId, { resolve, reject, timer });

      try {
        const socket = getSocket();
        socket.emit("os:action_request", request, (ackResult?: DesktopActionResult) => {
          if (ackResult) {
            this.handleActionResult(ackResult);
          }
        });
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingRequests.delete(actionId);
        const errorMsg = err?.message || "Socket dispatch failed";
        useActionStore.getState().failAction(actionId, errorMsg);
        resolve({
          actionId,
          type: request.type,
          success: false,
          message: errorMsg,
          durationMs: 0,
          timestamp: Date.now(),
          error: errorMsg,
        });
      }
    });
  }

  /**
   * Internal handler for action results from ack callback or socket event.
   */
  private handleActionResult(result: DesktopActionResult) {
    if (!result?.actionId) return;

    const pending = this.pendingRequests.get(result.actionId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(result.actionId);
      useActionStore.getState().finishAction(result);
      pending.resolve(result);
    } else {
      useActionStore.getState().finishAction(result);
    }
  }

  /**
   * Maps an IntentResult directly into a native desktop action.
   * Returns null if intent does not map to a desktop automation task.
   */
  async dispatchFromIntent(
    intentResult: IntentResult
  ): Promise<DesktopActionResult | null> {
    const { intent, parameters } = intentResult;

    switch (intent) {
      case "OPEN": {
        const target = String(
          parameters.application || parameters.raw || ""
        ).trim();
        if (!target) return null;
        return this.dispatch(
          {
            type: "open_app",
            target,
            params: { target },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "CLOSE": {
        const target = String(parameters.application || "").trim();
        return this.dispatch(
          {
            type: "close_app",
            target,
            params: { target },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "NAVIGATE": {
        const url = String(parameters.url || parameters.raw || "").trim();
        if (!url) return null;
        return this.dispatch(
          {
            type: "open_url",
            target: url,
            params: { url },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "SEARCH": {
        const query = String(
          parameters.query || parameters.text || parameters.raw || ""
        ).trim();
        if (!query) return null;
        return this.dispatch(
          {
            type: "search_web",
            target: query,
            params: { query },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "VOLUME_UP": {
        return this.dispatch(
          {
            type: "adjust_volume",
            params: { direction: "up", steps: 2 },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "VOLUME_DOWN": {
        return this.dispatch(
          {
            type: "adjust_volume",
            params: { direction: "down", steps: 2 },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "SET_VOLUME": {
        const level = Number(parameters.number ?? 50);
        return this.dispatch(
          {
            type: "adjust_volume",
            params: { level },
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "MUTE": {
        return this.dispatch(
          {
            type: "mute_volume",
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "UNMUTE": {
        return this.dispatch(
          {
            type: "unmute_volume",
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      case "LOCK_SCREEN": {
        return this.dispatch(
          {
            type: "lock_workstation",
            source: "intent",
          },
          { speakConfirmation: true }
        );
      }

      default:
        return null;
    }
  }

  /**
   * Synthesizes immediate voice feedback for desktop actions.
   */
  private provideVoiceFeedback(request: DesktopActionRequest) {
    try {
      switch (request.type) {
        case "open_app":
          if (request.target) speak(`Opening ${request.target}`);
          break;
        case "close_app":
          if (request.target) speak(`Closing ${request.target}`);
          break;
        case "open_url":
        case "navigate":
          speak("Opening web address");
          break;
        case "search_web":
          if (request.params?.query) {
            speak(`Searching for ${request.params.query}`);
          } else {
            speak("Searching web");
          }
          break;
        case "adjust_volume":
          speak(
            request.params?.direction === "down"
              ? "Lowering volume"
              : "Increasing volume"
          );
          break;
        case "mute_volume":
          speak("Muting volume");
          break;
        case "unmute_volume":
          speak("Unmuting volume");
          break;
        case "lock_workstation":
        case "lock_screen":
          speak("Locking screen");
          break;
        default:
          break;
      }
    } catch {
      // Ignore TTS errors gracefully
    }
  }
}

export const desktopActionDispatcher = new DesktopActionDispatcher();
export { DesktopActionDispatcher };
