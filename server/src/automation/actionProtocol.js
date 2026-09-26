/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Action Protocol & Payload Validation
 *
 * @file actionProtocol.js
 * @description Validates incoming action requests and formats standard execution results
 * across the Socket.IO IPC bridge.
 */

import { randomUUID } from "crypto";

export const VALID_ACTION_TYPES = Object.freeze(new Set([
  "open_app",
  "close_app",
  "search_web",
  "open_url",
  "navigate",
  "adjust_volume",
  "mute_volume",
  "unmute_volume",
  "lock_workstation",
  "lock_screen",
  "take_screenshot",
  "get_system_info",
  "click_target",
  "type_text",
]));

export const VALID_SOURCES = Object.freeze(new Set([
  "intent",
  "llm_tool",
  "manual_ui",
  "unknown",
]));

/**
 * Validates and normalizes an inbound DesktopActionRequest payload.
 * @param {any} payload
 * @returns {{ isValid: boolean, error?: string, request?: object }}
 */
export function validateActionRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { isValid: false, error: "Action payload must be a non-null object" };
  }

  const { type, actionId, target, params = {}, source = "unknown", timestamp } = payload;

  if (!type || typeof type !== "string") {
    return { isValid: false, error: "Missing required field: 'type' must be a string" };
  }

  const normalizedType = type.trim().toLowerCase();
  if (!VALID_ACTION_TYPES.has(normalizedType)) {
    return { isValid: false, error: `Unsupported action type: '${type}'` };
  }

  // Ensure unique actionId
  const finalActionId = (typeof actionId === "string" && actionId.trim())
    ? actionId.trim()
    : `act_${randomUUID()}`;

  // Ensure normalized params with top-level target fallback
  const normalizedParams = (params && typeof params === "object" && !Array.isArray(params))
    ? { ...params }
    : {};

  if (target && typeof target === "string" && !normalizedParams.target) {
    normalizedParams.target = target.trim();
  }

  const validSource = typeof source === "string" && VALID_SOURCES.has(source.trim())
    ? source.trim()
    : "unknown";

  return {
    isValid: true,
    request: {
      actionId: finalActionId,
      type: normalizedType,
      target: normalizedParams.target || (typeof target === "string" ? target.trim() : undefined),
      params: normalizedParams,
      source: validSource,
      timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
    },
  };
}

/**
 * Creates a standardized DesktopActionResult payload.
 * @param {object} options
 * @param {string} options.actionId
 * @param {string} options.type
 * @param {boolean} options.success
 * @param {string} options.message
 * @param {number} [options.durationMs=0]
 * @param {object} [options.data]
 * @param {string} [options.error]
 * @returns {object} DesktopActionResult
 */
export function createActionResult({
  actionId,
  type,
  success,
  message,
  durationMs = 0,
  data = undefined,
  error = undefined,
}) {
  const result = {
    actionId: actionId || `act_${randomUUID()}`,
    type: type || "unknown",
    success: Boolean(success),
    message: message || (success ? "Action executed successfully" : "Action execution failed"),
    durationMs: Math.max(0, Number(durationMs) || 0),
    timestamp: Date.now(),
  };

  if (data !== undefined) {
    result.data = data;
  }

  if (error !== undefined) {
    result.error = String(error);
  }

  return result;
}
