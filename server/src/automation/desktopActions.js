/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Native Desktop Actions Dispatcher
 *
 * @file desktopActions.js
 * @description Unified execution engine executing validated OS commands on Windows:
 * launching applications, opening URLs, executing web searches, adjusting volume,
 * and querying system telemetry.
 */

import { execFile, spawn } from "child_process";
import { logger } from "../utils/logger.js";
import {
  assertSafeText,
  assertSafeUrl,
  assertSafeQuery,
  SecurityValidationError,
} from "./securityValidator.js";
import { resolveApplication } from "./appRegistry.js";
import {
  controlVolume,
  lockWorkstation,
  captureScreenshot,
  getSystemInfo,
} from "./systemControls.js";

/**
 * Spawns a background Windows process via `cmd.exe /c start` in detached mode.
 * Waits for the process to successfully spawn before resolving.
 * @param {string} target - Executable name, file, or protocol URI
 * @param {string[]} [args=[]]
 * @returns {Promise<void>}
 */
function launchDetachedProcess(target, args = []) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn("cmd.exe", ["/c", "start", "", target, ...args], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });

      child.on("error", (err) => {
        reject(err);
      });

      // Wait for OS spawn event before reporting success
      child.on("spawn", () => {
        child.unref();
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Opens a validated URL in the default web browser via PowerShell Start-Process.
 * Avoids cmd.exe shell interpretation of '&', '?', and '%' in URLs.
 * Waits for PowerShell execution to complete with exit code 0 before reporting success.
 * @param {string} url
 * @returns {Promise<void>}
 */
function openUrlSafely(url) {
  return new Promise((resolve, reject) => {
    // Single quotes inside PowerShell single-quoted string are escaped by doubling them ('')
    const escapedUrl = url.replace(/'/g, "''");
    const psScript = `Start-Process -FilePath '${escapedUrl}'`;

    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript],
      { timeout: 5000 },
      (err, _stdout, stderr) => {
        if (err) {
          const detail = stderr?.trim() || err.message;
          reject(new Error(`Failed to open URL via PowerShell: ${detail}`));
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Main dispatcher executing requested desktop action with validation and profiling.
 *
 * @param {string} actionType - One of: open_app, close_app, search_web, open_url, adjust_volume, mute_volume, lock_workstation, take_screenshot, get_system_info
 * @param {object} [params={}] - Action parameters (target, query, url, direction, etc.)
 * @returns {Promise<{ success: boolean, message: string, durationMs: number, data?: any, error?: string }>}
 */
export const executeAction = async (actionType, params = {}) => {
  const startTime = Date.now();
  logger.info(`[DesktopAutomation] Executing action '${actionType}' with params: ${JSON.stringify(params)}`);

  try {
    switch (actionType) {
      // ── 1. Application Launcher (Registry Only) ──────────────────────
      case "open_app": {
        const rawTarget = params.target || params.app || "";
        const sanitized = assertSafeText(rawTarget, "Application name");
        const resolved = resolveApplication(sanitized);

        if (!resolved) {
          const durationMs = Date.now() - startTime;
          return {
            success: false,
            message: `Application '${sanitized}' is not in the approved application registry`,
            durationMs,
          };
        }

        await launchDetachedProcess(resolved.target);

        const durationMs = Date.now() - startTime;
        return {
          success: true,
          message: `Opened ${resolved.displayName}`,
          durationMs,
          data: { app: resolved.displayName, target: resolved.target },
        };
      }

      // ── 2. Web Search ────────────────────────────────────────────────
      case "search_web": {
        const rawQuery = params.query || "";
        const query = assertSafeQuery(rawQuery);
        const engine = (params.engine || "google").toLowerCase();

        let searchUrl;
        if (engine === "youtube" || query.toLowerCase().startsWith("youtube ")) {
          const cleanQ = query.replace(/^youtube\s+/i, "");
          searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`;
        } else if (engine === "github") {
          searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
        } else {
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }

        await openUrlSafely(searchUrl);

        const durationMs = Date.now() - startTime;
        return {
          success: true,
          message: `Searching web for "${query}"`,
          durationMs,
          data: { query, url: searchUrl },
        };
      }

      // ── 3. Open URL / Navigation ────────────────────────────────────
      case "open_url":
      case "navigate": {
        const rawUrl = params.url || params.target || "";
        const safeUrl = assertSafeUrl(rawUrl);

        await openUrlSafely(safeUrl);

        const durationMs = Date.now() - startTime;
        return {
          success: true,
          message: `Opened ${safeUrl}`,
          durationMs,
          data: { url: safeUrl },
        };
      }

      // ── 4. Volume Adjustment ─────────────────────────────────────────
      case "adjust_volume": {
        const direction = params.direction || (params.level && params.level > 50 ? "up" : "down");
        const steps = Math.min(Math.max(params.steps || 2, 1), 10);
        const res = await controlVolume(direction, steps);

        const durationMs = Date.now() - startTime;
        return {
          ...res,
          durationMs,
        };
      }

      // ── 5. Mute / Unmute ─────────────────────────────────────────────
      case "mute_volume":
      case "unmute_volume": {
        const res = await controlVolume("mute");
        const durationMs = Date.now() - startTime;
        return {
          ...res,
          durationMs,
        };
      }

      // ── 6. Lock Screen / Workstation ─────────────────────────────────
      case "lock_workstation":
      case "lock_screen": {
        const res = await lockWorkstation();
        const durationMs = Date.now() - startTime;
        return {
          ...res,
          durationMs,
        };
      }

      // ── 7. Screenshot Capture ────────────────────────────────────────
      case "take_screenshot": {
        const res = await captureScreenshot();
        const durationMs = Date.now() - startTime;
        return {
          ...res,
          durationMs,
        };
      }

      // ── 8. System Diagnostics & Telemetry ────────────────────────────
      case "get_system_info": {
        const info = getSystemInfo();
        const durationMs = Date.now() - startTime;
        return {
          success: true,
          message: `CPU: ${info.cpus} cores, Memory Usage: ${info.memoryUsagePercent}%`,
          durationMs,
          data: info,
        };
      }

      // ── Legacy Compatibility ────────────────────────────────────────
      case "click_target":
        return {
          success: true,
          message: "Simulated UI click",
          durationMs: Date.now() - startTime,
        };

      case "type_text":
        return {
          success: true,
          message: `Simulated typing: "${params.text || ""}"`,
          durationMs: Date.now() - startTime,
        };

      default:
        return {
          success: false,
          message: `Unsupported desktop action: '${actionType}'`,
          durationMs: Date.now() - startTime,
        };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error(`[DesktopAutomation] Error executing '${actionType}': ${error.message}`);
    return {
      success: false,
      message: error instanceof SecurityValidationError ? error.message : `Failed to execute ${actionType}`,
      error: error.message,
      durationMs,
    };
  }
};
