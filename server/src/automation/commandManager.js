/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Command & Action Execution Manager
 *
 * @file commandManager.js
 * @description Manages desktop action lifecycle, execution timeouts, error isolation,
 * and result formatting for Socket.IO IPC requests.
 */

import { logger } from "../utils/logger.js";
import { executeAction } from "./desktopActions.js";
import { validateActionRequest, createActionResult } from "./actionProtocol.js";

const DEFAULT_ACTION_TIMEOUT_MS = 5000;

class CommandManager {
  /**
   * Executes a desktop action request safely with timeout protection.
   * @param {any} rawRequest - Unchecked action request payload
   * @param {object} [options]
   * @param {number} [options.timeoutMs=5000] - Max allowed execution duration
   * @returns {Promise<object>} Standardized DesktopActionResult
   */
  async handleAction(rawRequest, options = {}) {
    const startTime = Date.now();
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : DEFAULT_ACTION_TIMEOUT_MS;
    const executor = typeof options.executor === "function" ? options.executor : executeAction;

    const validation = validateActionRequest(rawRequest);
    if (!validation.isValid) {
      logger.warn(`[CommandManager] Invalid action request: ${validation.error}`);
      return createActionResult({
        actionId: rawRequest?.actionId,
        type: rawRequest?.type || "unknown",
        success: false,
        message: validation.error,
        error: validation.error,
        durationMs: Date.now() - startTime,
      });
    }

    const { actionId, type, params } = validation.request;
    logger.info(`[CommandManager] Starting action '${type}' [${actionId}]`);

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Action '${type}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const executionPromise = executor(type, params);
      const actionResult = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      logger.info(
        `[CommandManager] Action '${type}' [${actionId}] completed in ${durationMs}ms with success=${actionResult.success}`
      );

      return createActionResult({
        actionId,
        type,
        success: actionResult.success,
        message: actionResult.message,
        durationMs,
        data: actionResult.data,
        error: actionResult.error,
      });
    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const isTimeout = err.message && err.message.includes("timed out");

      logger.error(
        `[CommandManager] Action '${type}' [${actionId}] failed (${durationMs}ms): ${err.message}`
      );

      return createActionResult({
        actionId,
        type,
        success: false,
        message: isTimeout ? `Action timed out after ${timeoutMs}ms` : err.message || "Execution error",
        durationMs,
        error: err.message,
      });
    }
  }

  /**
   * Legacy text/voice command handler (backwards compatibility).
   * @param {string} voiceCommandText
   * @returns {Promise<object>}
   */
  async handleCommand(voiceCommandText) {
    if (!voiceCommandText || typeof voiceCommandText !== "string") {
      return createActionResult({
        type: "unknown",
        success: false,
        message: "Invalid voice command string",
      });
    }

    const clean = voiceCommandText.toLowerCase().trim();
    if (clean.includes("click") || clean.includes("press")) {
      return this.handleAction({ type: "click_target", params: { label: "ui_element" } });
    }
    if (clean.includes("type") || clean.includes("write")) {
      return this.handleAction({ type: "type_text", params: { text: "AetherOS Input" } });
    }

    return createActionResult({
      type: "unknown",
      success: false,
      message: `Command action matches no triggers: "${voiceCommandText}"`,
    });
  }
}

export const commandManager = new CommandManager();
export { CommandManager };
