/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 4 Unit Tests: Desktop Tools Schema & Execution (`desktop-tools.test.ts`)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDesktopToolDefinitions, executeDesktopTool, DESKTOP_TOOLS } from "../desktop-tools";
import { desktopActionDispatcher } from "../../../services/desktopActionDispatcher";
import type { DesktopActionResult } from "../../../types/desktopAction";

describe("Milestone 4: Desktop Tools Schema & Execution Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should define all 10 canonical desktop automation tools with OpenAI schemas", () => {
    const tools = getDesktopToolDefinitions();
    expect(tools.length).toBe(10);

    const toolNames = DESKTOP_TOOLS.map((t) => t.function.name);
    expect(toolNames).toContain("open_app");
    expect(toolNames).toContain("close_app");
    expect(toolNames).toContain("search_web");
    expect(toolNames).toContain("open_url");
    expect(toolNames).toContain("adjust_volume");
    expect(toolNames).toContain("mute_volume");
    expect(toolNames).toContain("unmute_volume");
    expect(toolNames).toContain("lock_screen");
    expect(toolNames).toContain("take_screenshot");
    expect(toolNames).toContain("get_system_info");

    for (const tool of DESKTOP_TOOLS) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.description).toBeTruthy();
      expect(tool.function.parameters.type).toBe("object");
    }
  });

  it("should execute 'open_app' tool call via desktopActionDispatcher", async () => {
    const mockResult: DesktopActionResult = {
      actionId: "act_test_1",
      type: "open_app",
      success: true,
      message: "Application 'chrome' launched successfully",
      durationMs: 45,
      timestamp: Date.now(),
    };

    const dispatchSpy = vi.spyOn(desktopActionDispatcher, "dispatch").mockResolvedValue(mockResult);

    const toolCall = {
      id: "call_open_1",
      type: "function" as const,
      name: "open_app",
      arguments: { app: "chrome" },
    };

    const outcome = await executeDesktopTool(toolCall);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "open_app",
      target: "chrome",
      params: { target: "chrome", app: "chrome" },
      source: "llm_tool",
    });

    expect(outcome.success).toBe(true);
    const parsed = JSON.parse(outcome.content);
    expect(parsed.success).toBe(true);
    expect(parsed.message).toContain("chrome");
  });

  it("should execute 'search_web' with JSON string arguments", async () => {
    const mockResult: DesktopActionResult = {
      actionId: "act_test_2",
      type: "search_web",
      success: true,
      message: "Searched web for 'quantum computing'",
      durationMs: 30,
      timestamp: Date.now(),
    };

    const dispatchSpy = vi.spyOn(desktopActionDispatcher, "dispatch").mockResolvedValue(mockResult);

    const toolCall = {
      id: "call_search_1",
      type: "function" as const,
      name: "search_web",
      arguments: JSON.stringify({ query: "quantum computing", engine: "google" }),
    };

    const outcome = await executeDesktopTool(toolCall);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "search_web",
      target: "quantum computing",
      params: { query: "quantum computing", engine: "google" },
      source: "llm_tool",
    });

    expect(outcome.success).toBe(true);
  });

  it("should execute 'adjust_volume' with directional params", async () => {
    const mockResult: DesktopActionResult = {
      actionId: "act_test_3",
      type: "adjust_volume",
      success: true,
      message: "Volume increased by 2 steps",
      durationMs: 25,
      timestamp: Date.now(),
    };

    const dispatchSpy = vi.spyOn(desktopActionDispatcher, "dispatch").mockResolvedValue(mockResult);

    const toolCall = {
      id: "call_vol_1",
      type: "function" as const,
      name: "adjust_volume",
      arguments: { direction: "up", steps: 2 },
    };

    const outcome = await executeDesktopTool(toolCall);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: "adjust_volume",
      target: undefined,
      params: { direction: "up", steps: 2 },
      source: "llm_tool",
    });

    expect(outcome.success).toBe(true);
  });

  it("should handle unsupported tool gracefully without throwing", async () => {
    const outcome = await executeDesktopTool({
      id: "call_bad_1",
      type: "function",
      name: "non_existent_tool",
      arguments: {},
    });

    expect(outcome.success).toBe(false);
    expect(outcome.content).toContain("Unsupported tool call");
  });

  it("should handle dispatcher exceptions and return formatted failure content", async () => {
    vi.spyOn(desktopActionDispatcher, "dispatch").mockRejectedValue(new Error("Connection terminated"));

    const outcome = await executeDesktopTool({
      id: "call_err_1",
      type: "function",
      name: "take_screenshot",
      arguments: {},
    });

    expect(outcome.success).toBe(false);
    expect(outcome.content).toContain("Connection terminated");
  });
});
