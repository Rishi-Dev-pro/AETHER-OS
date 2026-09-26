/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Frontend Action Dispatcher & Fast-Path Routing Test Suite
 *
 * @file desktopActionDispatcher.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useActionStore } from "../../store/actionStore";
import type { DesktopActionResult } from "../../types/desktopAction";
import type { IntentResult } from "../../types/intent";

// Mock socket
const mockSocketOn = vi.fn();
const mockSocketEmit = vi.fn();
vi.mock("../socket", () => ({
  getSocket: () => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
  }),
}));

// Mock speech synthesis
const mockSpeak = vi.fn();
vi.mock("../../runtime/frontend/speech-runtime", () => ({
  speak: (...args: any[]) => mockSpeak(...args),
}));

import { desktopActionDispatcher } from "../desktopActionDispatcher";

describe("Milestone 3: useActionStore State Management", () => {
  beforeEach(() => {
    useActionStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  it("should record active action and pending history on startAction", () => {
    const store = useActionStore.getState();
    const req = {
      actionId: "act_101",
      type: "open_app" as const,
      target: "vscode",
      source: "intent" as const,
      timestamp: Date.now(),
    };

    store.startAction(req);

    const updated = useActionStore.getState();
    expect(updated.isExecuting).toBe(true);
    expect(updated.activeAction).toEqual(req);
    expect(updated.history.length).toBe(1);
    expect(updated.history[0].status).toBe("pending");
  });

  it("should update history and clear active action on finishAction", () => {
    const store = useActionStore.getState();
    const req = {
      actionId: "act_102",
      type: "search_web" as const,
      params: { query: "vitest testing" },
      source: "manual_ui" as const,
      timestamp: Date.now(),
    };

    store.startAction(req);

    const res: DesktopActionResult = {
      actionId: "act_102",
      type: "search_web",
      success: true,
      message: "Searching web for 'vitest testing'",
      durationMs: 45,
      timestamp: Date.now(),
    };

    store.finishAction(res);

    const updated = useActionStore.getState();
    expect(updated.isExecuting).toBe(false);
    expect(updated.activeAction).toBeNull();
    expect(updated.lastResult).toEqual(res);
    expect(updated.history[0].status).toBe("success");
    expect(updated.history[0].result).toEqual(res);
  });

  it("should mark action as failed on failAction", () => {
    const store = useActionStore.getState();
    const req = {
      actionId: "act_103",
      type: "adjust_volume" as const,
      source: "intent" as const,
      timestamp: Date.now(),
    };

    store.startAction(req);
    store.failAction("act_103", "Connection lost");

    const updated = useActionStore.getState();
    expect(updated.isExecuting).toBe(false);
    expect(updated.history[0].status).toBe("failed");
    expect(updated.history[0].result?.error).toBe("Connection lost");
  });
});

describe("Milestone 3: DesktopActionDispatcher Socket IPC & Fast-Path Routing", () => {
  beforeEach(() => {
    useActionStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  it("should dispatch action over socket and resolve on ack callback", async () => {
    mockSocketEmit.mockImplementation((event, payload, ackCb) => {
      if (event === "os:action_request" && typeof ackCb === "function") {
        const mockResult: DesktopActionResult = {
          actionId: payload.actionId,
          type: payload.type,
          success: true,
          message: "Application launched",
          durationMs: 50,
          timestamp: Date.now(),
        };
        ackCb(mockResult);
      }
    });

    const result = await desktopActionDispatcher.dispatch({
      type: "open_app",
      target: "chrome",
      source: "intent",
    });

    expect(result.success).toBe(true);
    expect(result.type).toBe("open_app");
    expect(mockSocketEmit).toHaveBeenCalledWith(
      "os:action_request",
      expect.objectContaining({ type: "open_app", target: "chrome" }),
      expect.any(Function)
    );
  });

  it("should handle timeout when backend does not respond", async () => {
    mockSocketEmit.mockImplementation(() => {}); // never acks

    const result = await desktopActionDispatcher.dispatch(
      {
        type: "get_system_info",
        source: "manual_ui",
      },
      { timeoutMs: 30 }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("TIMEOUT");
    expect(useActionStore.getState().history[0].status).toBe("failed");
  });

  it("should map OPEN intent to open_app with voice feedback", async () => {
    mockSocketEmit.mockImplementation((event, payload, ackCb) => {
      if (typeof ackCb === "function") {
        ackCb({
          actionId: payload.actionId,
          type: payload.type,
          success: true,
          message: "Opened Visual Studio Code",
          durationMs: 20,
          timestamp: Date.now(),
        });
      }
    });

    const intent: IntentResult = {
      intentId: "int_01",
      timestamp: Date.now(),
      category: "INTERACTION",
      domain: "APPLICATION",
      intent: "OPEN",
      confidence: 0.95,
      entities: [{ type: "application", value: "code", normalized: "Visual Studio Code" }],
      parameters: { application: "Visual Studio Code" },
      needsClarification: false,
    };

    const result = await desktopActionDispatcher.dispatchFromIntent(intent);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("open_app");
    expect(mockSpeak).toHaveBeenCalledWith("Opening Visual Studio Code");
  });

  it("should map SEARCH, VOLUME, and LOCK_SCREEN intents", async () => {
    mockSocketEmit.mockImplementation((_event, payload, ackCb) => {
      if (typeof ackCb === "function") {
        ackCb({
          actionId: payload.actionId,
          type: payload.type,
          success: true,
          message: "Executed",
          durationMs: 10,
          timestamp: Date.now(),
        });
      }
    });

    const searchIntent: IntentResult = {
      intentId: "int_02",
      timestamp: Date.now(),
      category: "NAVIGATION",
      domain: "WEB",
      intent: "SEARCH",
      confidence: 0.9,
      entities: [],
      parameters: { query: "node js tutorials" },
      needsClarification: false,
    };

    const volumeIntent: IntentResult = {
      intentId: "int_03",
      timestamp: Date.now(),
      category: "CONTROL",
      domain: "SYSTEM",
      intent: "VOLUME_UP",
      confidence: 0.9,
      entities: [],
      parameters: {},
      needsClarification: false,
    };

    const lockIntent: IntentResult = {
      intentId: "int_04",
      timestamp: Date.now(),
      category: "CONTROL",
      domain: "SYSTEM",
      intent: "LOCK_SCREEN",
      confidence: 0.95,
      entities: [],
      parameters: {},
      needsClarification: false,
    };

    const searchRes = await desktopActionDispatcher.dispatchFromIntent(searchIntent);
    expect(searchRes?.type).toBe("search_web");
    expect(mockSpeak).toHaveBeenCalledWith("Searching for node js tutorials");

    const volumeRes = await desktopActionDispatcher.dispatchFromIntent(volumeIntent);
    expect(volumeRes?.type).toBe("adjust_volume");
    expect(mockSpeak).toHaveBeenCalledWith("Increasing volume");

    const lockRes = await desktopActionDispatcher.dispatchFromIntent(lockIntent);
    expect(lockRes?.type).toBe("lock_workstation");
    expect(mockSpeak).toHaveBeenCalledWith("Locking screen");
  });

  it("should return null for non-desktop intents like GREET", async () => {
    const greetIntent: IntentResult = {
      intentId: "int_05",
      timestamp: Date.now(),
      category: "CONVERSATION",
      domain: "ASSISTANT",
      intent: "GREET",
      confidence: 0.95,
      entities: [],
      parameters: {},
      needsClarification: false,
    };

    const result = await desktopActionDispatcher.dispatchFromIntent(greetIntent);
    expect(result).toBeNull();
  });
});
