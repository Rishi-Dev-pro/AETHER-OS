/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 6: End-to-End Integration, Regression Testing & Production Freeze
 *
 * @file phase10-e2e.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useActionStore } from "../store/actionStore";
import { desktopActionDispatcher } from "../services/desktopActionDispatcher";
import { executeDesktopTool, getDesktopToolDefinitions } from "../runtime/tools/desktop-tools";
import type { DesktopActionRequest, DesktopActionResult } from "../types/desktopAction";
import type { IntentResult } from "../types/intent";

// Mock socket
const mockSocketOn = vi.fn();
const mockSocketEmit = vi.fn();
vi.mock("../services/socket", () => ({
  getSocket: () => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
  }),
}));

// Mock speech synthesis
const mockSpeak = vi.fn();
vi.mock("../runtime/frontend/speech-runtime", () => ({
  speak: (...args: unknown[]) => mockSpeak(...args),
}));

describe("Milestone 6: Phase 10 End-to-End Integration & Regression Suite", () => {
  beforeEach(() => {
    useActionStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Fast-Path Intent Routing to Native Desktop Action Flow", () => {
    it("should process an 'OPEN' voice intent end-to-end through dispatcher and socket bus", async () => {
      mockSocketEmit.mockImplementation((event: string, payload: unknown, ackCb?: unknown) => {
        if (event === "os:action_request") {
          const req = payload as DesktopActionRequest;
          const res: DesktopActionResult = {
            actionId: req.actionId,
            type: req.type,
            success: true,
            message: "Application 'Visual Studio Code' launched successfully",
            durationMs: 38,
            timestamp: Date.now(),
            data: { pid: 9812 },
          };
          if (typeof ackCb === "function") {
            (ackCb as (r: DesktopActionResult) => void)(res);
          }
          const handler = mockSocketOn.mock.calls.find((c) => c[0] === "os:action_result")?.[1];
          if (handler) {
            handler(res);
          }
        }
      });

      const intent: IntentResult = {
        intentId: "int_01",
        timestamp: Date.now(),
        category: "CONTROL",
        domain: "SYSTEM",
        intent: "OPEN",
        confidence: 0.96,
        entities: [],
        parameters: { application: "Visual Studio Code" },
        needsClarification: false,
        rawText: "Open VS Code",
      };

      const result = await desktopActionDispatcher.dispatchFromIntent(intent);

      // Verify result
      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.type).toBe("open_app");
      expect(result?.durationMs).toBe(38);

      // Verify TTS voice confirmation
      expect(mockSpeak).toHaveBeenCalledWith("Opening Visual Studio Code");

      // Verify actionStore state telemetry
      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.lastResult?.success).toBe(true);
      expect(state.history.length).toBe(1);
      expect(state.history[0].status).toBe("success");
      expect(state.history[0].request.params?.target).toBe("Visual Studio Code");
    });

    it("should route SEARCH intent and announce query via speech synthesis", async () => {
      mockSocketEmit.mockImplementation((event: string, payload: unknown, ackCb?: unknown) => {
        if (event === "os:action_request") {
          const req = payload as DesktopActionRequest;
          const res: DesktopActionResult = {
            actionId: req.actionId,
            type: req.type,
            success: true,
            message: "Navigated to YouTube search",
            durationMs: 42,
            timestamp: Date.now(),
          };
          if (typeof ackCb === "function") {
            (ackCb as (r: DesktopActionResult) => void)(res);
          }
          const handler = mockSocketOn.mock.calls.find((c) => c[0] === "os:action_result")?.[1];
          if (handler) {
            handler(res);
          }
        }
      });

      const intent: IntentResult = {
        intentId: "int_02",
        timestamp: Date.now(),
        category: "NAVIGATION",
        domain: "WEB",
        intent: "SEARCH",
        confidence: 0.94,
        entities: [],
        parameters: { query: "cyberpunk 2077 music" },
        needsClarification: false,
        rawText: "Search YouTube for cyberpunk 2077 music",
      };

      const result = await desktopActionDispatcher.dispatchFromIntent(intent);

      expect(result?.success).toBe(true);
      expect(mockSpeak).toHaveBeenCalledWith("Searching for cyberpunk 2077 music");

      const state = useActionStore.getState();
      expect(state.history[0].request.type).toBe("search_web");
      expect(state.history[0].result?.durationMs).toBe(42);
    });

    it("should route system control intents (MUTE) without failure", async () => {
      mockSocketEmit.mockImplementation((event: string, payload: unknown, ackCb?: unknown) => {
        if (event === "os:action_request") {
          const req = payload as DesktopActionRequest;
          const res: DesktopActionResult = {
            actionId: req.actionId,
            type: req.type,
            success: true,
            message: "System master volume muted",
            durationMs: 15,
            timestamp: Date.now(),
          };
          if (typeof ackCb === "function") {
            (ackCb as (r: DesktopActionResult) => void)(res);
          }
          const handler = mockSocketOn.mock.calls.find((c) => c[0] === "os:action_result")?.[1];
          if (handler) {
            handler(res);
          }
        }
      });

      const intent: IntentResult = {
        intentId: "int_03",
        timestamp: Date.now(),
        category: "CONTROL",
        domain: "SYSTEM",
        intent: "MUTE",
        confidence: 0.99,
        entities: [],
        parameters: {},
        needsClarification: false,
        rawText: "Mute volume",
      };

      const result = await desktopActionDispatcher.dispatchFromIntent(intent);

      expect(result?.success).toBe(true);
      expect(mockSpeak).toHaveBeenCalledWith("Muting volume");
      expect(useActionStore.getState().history[0].request.type).toBe("mute_volume");
    });
  });

  describe("2. LLM Tool Calling Pipeline End-to-End Integration", () => {
    it("should export all canonical desktop tools with compliant OpenAI function schemas", () => {
      const tools = getDesktopToolDefinitions();
      expect(tools.length).toBeGreaterThanOrEqual(10);

      const names = tools.map((t) => t.function.name);
      expect(names).toContain("open_app");
      expect(names).toContain("close_app");
      expect(names).toContain("search_web");
      expect(names).toContain("open_url");
      expect(names).toContain("adjust_volume");
      expect(names).toContain("mute_volume");
      expect(names).toContain("unmute_volume");
      expect(names).toContain("lock_screen");
      expect(names).toContain("take_screenshot");
      expect(names).toContain("get_system_info");
    });

    it("should execute desktop tool calls and return content string formatted for LLM conversation context", async () => {
      mockSocketEmit.mockImplementation((event: string, payload: unknown, ackCb?: unknown) => {
        if (event === "os:action_request") {
          const req = payload as DesktopActionRequest;
          const res: DesktopActionResult = {
            actionId: req.actionId,
            type: req.type,
            success: true,
            message: "Application 'notepad' launched",
            durationMs: 25,
            timestamp: Date.now(),
          };
          if (typeof ackCb === "function") {
            (ackCb as (r: DesktopActionResult) => void)(res);
          }
          const handler = mockSocketOn.mock.calls.find((c) => c[0] === "os:action_result")?.[1];
          if (handler) {
            handler(res);
          }
        }
      });

      const toolResponse = await executeDesktopTool({
        name: "open_app",
        arguments: { app: "notepad" },
      });

      expect(toolResponse.success).toBe(true);
      const parsed = JSON.parse(toolResponse.content);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain("notepad");

      // Verify tool call was recorded in action history
      const history = useActionStore.getState().history;
      expect(history.length).toBe(1);
      expect(history[0].request.source).toBe("llm_tool");
    });

    it("should gracefully handle unknown tool execution with structured error content", async () => {
      const toolResponse = await executeDesktopTool({
        name: "unsupported_tool_xyz",
        arguments: {},
      });

      expect(toolResponse.success).toBe(false);
      const parsed = JSON.parse(toolResponse.content);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("Unsupported tool call: 'unsupported_tool_xyz'");
    });
  });

  describe("3. Security Sandbox & Failure Handling Verification", () => {
    it("should handle action failures from server execution without breaking store state", async () => {
      mockSocketEmit.mockImplementation((event: string, payload: unknown, ackCb?: unknown) => {
        if (event === "os:action_request") {
          const req = payload as DesktopActionRequest;
          const res: DesktopActionResult = {
            actionId: req.actionId,
            type: req.type,
            success: false,
            error: "Security violation: Application not found in approved registry",
            durationMs: 8,
            timestamp: Date.now(),
          };
          if (typeof ackCb === "function") {
            (ackCb as (r: DesktopActionResult) => void)(res);
          }
          const handler = mockSocketOn.mock.calls.find((c) => c[0] === "os:action_result")?.[1];
          if (handler) {
            handler(res);
          }
        }
      });

      const result = await desktopActionDispatcher.dispatch({
        type: "open_app",
        target: "forbidden_malware.exe",
        params: { app: "forbidden_malware.exe" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Security violation");

      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.lastResult?.success).toBe(false);
      expect(state.history.length).toBe(1);
      expect(state.history[0].status).toBe("failed");
    });

    it("should handle timeout gracefully if socket action acknowledgment never returns", async () => {
      // Clear socket implementation so it does not acknowledge/reply
      mockSocketEmit.mockReset();
      const dispatchPromise = desktopActionDispatcher.dispatch(
        { type: "get_system_info", params: {} },
        { timeoutMs: 50, speakConfirmation: false }
      );

      const result = await dispatchPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe("TIMEOUT");
      expect(result.message).toContain("timed out after 50ms");

      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.history[0].status).toBe("failed");
    });
  });

  describe("4. HUD & DevTools Telemetry Aggregations", () => {
    it("should correctly compute multi-action telemetry KPI metrics", () => {
      const store = useActionStore.getState();

      // Dispatch 3 successes and 1 failure
      const actions = [
        { id: "a1", type: "open_app" as const, success: true, dur: 40 },
        { id: "a2", type: "search_web" as const, success: true, dur: 60 },
        { id: "a3", type: "adjust_volume" as const, success: true, dur: 20 },
        { id: "a4", type: "lock_screen" as const, success: false, dur: 10 },
      ];

      for (const a of actions) {
        store.startAction({
          actionId: a.id,
          type: a.type,
          source: "intent",
          timestamp: Date.now(),
        });
        if (a.success) {
          store.finishAction({
            actionId: a.id,
            type: a.type,
            success: true,
            durationMs: a.dur,
            timestamp: Date.now(),
          });
        } else {
          store.failAction(a.id, "Action execution failed");
        }
      }

      const history = useActionStore.getState().history;
      expect(history.length).toBe(4);

      const completed = history.filter((h) => h.status !== "pending");
      const successCount = completed.filter((h) => h.status === "success").length;
      const successRate = Math.round((successCount / completed.length) * 100);

      expect(successCount).toBe(3);
      expect(successRate).toBe(75); // 3 of 4 = 75%
    });

    it("should support filter by all registered action types including click_target and type_text", () => {
      const store = useActionStore.getState();

      store.startAction({ actionId: "ct_1", type: "click_target", source: "intent", timestamp: Date.now() });
      store.finishAction({ actionId: "ct_1", type: "click_target", success: true, timestamp: Date.now() });

      store.startAction({ actionId: "tt_1", type: "type_text", source: "intent", timestamp: Date.now() });
      store.finishAction({ actionId: "tt_1", type: "type_text", success: true, timestamp: Date.now() });

      const history = useActionStore.getState().history;
      const clickTargets = history.filter((h) => h.request.type === "click_target");
      const typeTexts = history.filter((h) => h.request.type === "type_text");

      expect(clickTargets.length).toBe(1);
      expect(typeTexts.length).toBe(1);
    });
  });
});
