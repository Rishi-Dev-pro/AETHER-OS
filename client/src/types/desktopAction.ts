/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Action Types & Schemas
 *
 * @file desktopAction.ts
 * @description Types for desktop action requests, results, and execution state.
 */

export type DesktopActionType =
  | "open_app"
  | "close_app"
  | "search_web"
  | "open_url"
  | "navigate"
  | "adjust_volume"
  | "mute_volume"
  | "unmute_volume"
  | "lock_workstation"
  | "lock_screen"
  | "take_screenshot"
  | "get_system_info"
  | "click_target"
  | "type_text";

export type DesktopActionSource = "intent" | "llm_tool" | "manual_ui" | "unknown";

export interface DesktopActionRequest {
  actionId: string;
  type: DesktopActionType;
  target?: string;
  params?: Record<string, unknown>;
  source: DesktopActionSource;
  timestamp: number;
}

export interface DesktopActionResult {
  actionId: string;
  type: DesktopActionType;
  success: boolean;
  message: string;
  durationMs: number;
  timestamp: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ActionHistoryEntry {
  request: DesktopActionRequest;
  result?: DesktopActionResult;
  status: "pending" | "success" | "failed";
}
