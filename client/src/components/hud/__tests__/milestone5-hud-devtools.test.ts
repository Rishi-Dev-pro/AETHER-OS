/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 5 Unit Tests: HUD Visual Action Feedback & DevTools Action Inspector Tab
 *
 * @file milestone5-hud-devtools.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useActionStore } from "../../../store/actionStore";
import type { DesktopActionRequest, DesktopActionResult } from "../../../types/desktopAction";

// Mock socket
const mockSocketOn = vi.fn();
const mockSocketEmit = vi.fn();
vi.mock("../../../services/socket", () => ({
  getSocket: () => ({
    on: mockSocketOn,
    emit: mockSocketEmit,
  }),
}));

// Mock speech synthesis
vi.mock("../../../runtime/frontend/speech-runtime", () => ({
  speak: vi.fn(),
}));

import { desktopActionDispatcher } from "../../../services/desktopActionDispatcher";

describe("Milestone 5: HUD Visual Action Feedback & DevTools Action Tab", () => {
  beforeEach(() => {
    useActionStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  describe("HUD Action Notification Data Contracts", () => {
    it("should provide active action details for HUD Notification Pill", () => {
      const request: DesktopActionRequest = {
        actionId: "act_hud_001",
        type: "open_app",
        target: "chrome",
        params: { app: "chrome" },
        source: "intent",
        timestamp: Date.now(),
      };

      useActionStore.getState().startAction(request);

      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.activeAction).not.toBeNull();
      expect(state.activeAction?.actionId).toBe("act_hud_001");
      expect(state.activeAction?.type).toBe("open_app");
      expect(state.activeAction?.params?.app).toBe("chrome");
    });

    it("should transition to completed state with duration telemetry on finishAction", () => {
      const request: DesktopActionRequest = {
        actionId: "act_hud_002",
        type: "adjust_volume",
        params: { direction: "up", percent: 10 },
        source: "llm_tool",
        timestamp: Date.now() - 45,
      };

      useActionStore.getState().startAction(request);

      const result: DesktopActionResult = {
        actionId: "act_hud_002",
        type: "adjust_volume",
        success: true,
        message: "Volume increased by 10%",
        durationMs: 45,
        timestamp: Date.now(),
      };

      useActionStore.getState().finishAction(result);

      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.activeAction).toBeNull();
      expect(state.lastResult).not.toBeNull();
      expect(state.lastResult?.success).toBe(true);
      expect(state.lastResult?.durationMs).toBe(45);
      expect(state.lastResult?.message).toBe("Volume increased by 10%");
    });

    it("should record failed state with error details on failAction", () => {
      const request: DesktopActionRequest = {
        actionId: "act_hud_003",
        type: "open_app",
        target: "invalid_app_xyz",
        params: { app: "invalid_app_xyz" },
        source: "intent",
        timestamp: Date.now(),
      };

      useActionStore.getState().startAction(request);
      useActionStore.getState().failAction("act_hud_003", "Application not found in Windows registry");

      const state = useActionStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.lastResult?.success).toBe(false);
      expect(state.lastResult?.error).toBe("Application not found in Windows registry");
    });
  });

  describe("DevTools Tab 12: Action Inspector Telemetry & Analytics", () => {
    it("should compute accurate KPI metrics from action history", () => {
      const store = useActionStore.getState();

      // Action 1: Success (30ms)
      store.startAction({
        actionId: "act_kpi_1",
        type: "open_app",
        params: { app: "vscode" },
        source: "intent",
        timestamp: Date.now() - 30,
      });
      store.finishAction({
        actionId: "act_kpi_1",
        type: "open_app",
        success: true,
        message: "Opened Visual Studio Code",
        durationMs: 30,
        timestamp: Date.now(),
      });

      // Action 2: Success (50ms)
      store.startAction({
        actionId: "act_kpi_2",
        type: "search_web",
        params: { query: "Aether OS", engine: "google" },
        source: "intent",
        timestamp: Date.now() - 50,
      });
      store.finishAction({
        actionId: "act_kpi_2",
        type: "search_web",
        success: true,
        message: "Search completed",
        durationMs: 50,
        timestamp: Date.now(),
      });

      // Action 3: Failed (20ms)
      store.startAction({
        actionId: "act_kpi_3",
        type: "adjust_volume",
        params: { direction: "invalid" },
        source: "llm_tool",
        timestamp: Date.now() - 20,
      });
      store.failAction("act_kpi_3", "Invalid direction argument");

      const updated = useActionStore.getState();
      expect(updated.history.length).toBe(3);

      const completed = updated.history.filter((h) => h.status !== "pending");
      const successCount = completed.filter((h) => h.status === "success").length;
      const successRate = Math.round((successCount / completed.length) * 100);
      const totalDuration = completed.reduce((sum, h) => sum + (h.result?.durationMs ?? 0), 0);
      const avgLatency = Math.round(totalDuration / completed.length);

      expect(successCount).toBe(2);
      expect(successRate).toBe(67); // 2/3 = ~67%
      expect(avgLatency).toBe(33); // (30 + 50 + 20) / 3 = 33.3ms
    });

    it("should support clearHistory without breaking state invariants", () => {
      const store = useActionStore.getState();
      store.startAction({
        actionId: "act_clear_test",
        type: "get_system_info",
        source: "llm_tool",
        timestamp: Date.now(),
      });

      expect(useActionStore.getState().history.length).toBe(1);

      useActionStore.getState().clearHistory();

      const cleared = useActionStore.getState();
      expect(cleared.history.length).toBe(0);
      expect(cleared.activeAction).toBeNull();
      expect(cleared.lastResult).toBeNull();
    });

    it("should allow quick test bench dispatch through desktopActionDispatcher", async () => {
      // Setup socket reply
      mockSocketEmit.mockImplementation((event: string, payload: unknown) => {
        if (event === "os:action_request") {
          const req = payload as { actionId: string; type: string };
          // Trigger result via registered handler
          const registeredHandler = mockSocketOn.mock.calls.find((call) => call[0] === "os:action_result")?.[1];
          if (registeredHandler) {
            registeredHandler({
              actionId: req.actionId,
              type: req.type,
              success: true,
              message: "System info retrieved successfully",
              durationMs: 12,
              timestamp: Date.now(),
              data: { platform: "win32", cpus: 16 },
            });
          }
        }
      });

      const result = await desktopActionDispatcher.dispatch({ type: "get_system_info", params: {} }, { speakConfirmation: false });

      expect(result.success).toBe(true);
      expect(result.durationMs).toBe(12);
      expect(useActionStore.getState().history.length).toBe(1);
      expect(useActionStore.getState().history[0].status).toBe("success");
    });
  });
});
