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

let execFileFn = execFile;

/**
 * Test hook to mock process execution boundary in unit tests.
 * @param {Function|null} fn
 */
export const _setExecFile = (fn) => {
  execFileFn = fn || execFile;
};

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
 * Requests normal application shutdown for a registered application via PowerShell CloseMainWindow.
 * Escalates to non-forced process stop only if MainWindowHandle is unavailable.
 * Surfaces any termination failures to the rejection callback.
 * @param {object} resolvedApp
 * @returns {Promise<void>}
 */
function terminateApplication(resolvedApp) {
  return new Promise((resolve, reject) => {
    if (resolvedApp.id === "explorer") {
      return reject(new Error("Closing File Explorer / Windows Shell is restricted for system stability"));
    }

    const processNames = resolvedApp.processNames || [resolvedApp.target];
    if (!processNames.length) {
      return resolve();
    }

    const namesArgs = processNames
      .map((name) => `'${name.replace(/'/g, "''")}'`)
      .join(", ");

    // Request normal application shutdown; exclude current helper ($PID); wait on shared deadline and surface remaining running processes
    const psScript = `$ErrorActionPreference = 'Stop'; $procs = @(Get-Process -Name ${namesArgs} -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID }); if ($procs.Count -gt 0) { $toWait = @(); foreach ($p in $procs) { if ($p.MainWindowHandle -ne 0) { $closed = $p.CloseMainWindow(); if ($closed) { $toWait += $p; } else { Stop-Process -Id $p.Id -ErrorAction Stop; } } else { Stop-Process -Id $p.Id -ErrorAction Stop; } } if ($toWait.Count -gt 0) { $deadline = [DateTime]::UtcNow.AddMilliseconds(3000); foreach ($p in $toWait) { $remaining = [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds; if ($remaining -gt 0) { $null = $p.WaitForExit($remaining); } } $failed = @($toWait | Where-Object { -not $_.HasExited }); if ($failed.Count -gt 0) { $failedIds = ($failed | ForEach-Object { $_.Id }) -join ', '; throw "Process(es) $failedIds failed to exit within timeout"; } } }`;

    execFileFn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript],
      { timeout: 5000 },
      (err, _stdout, stderr) => {
        if (err) {
          const detail = stderr?.trim() || err.message;
          logger.error(`[DesktopAutomation] Close application failed for ${resolvedApp.id}: ${detail}`);
          return reject(new Error(`Failed to close ${resolvedApp.displayName}: ${detail}`));
        }
        resolve();
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

      // ── 1b. Application Closer (Registry Only) ───────────────────────
      case "close_app": {
        const rawTarget = params.target || params.app || "";
        const sanitized = assertSafeText(rawTarget, "Application name");
        const resolved = resolveApplication(sanitized, { exactMatchOnly: true });

        if (!resolved) {
          const durationMs = Date.now() - startTime;
          return {
            success: false,
            message: `Application '${sanitized}' is not in the approved application registry`,
            durationMs,
          };
        }

        try {
          await terminateApplication(resolved);
          const durationMs = Date.now() - startTime;
          return {
            success: true,
            message: `Closed ${resolved.displayName}`,
            durationMs,
            data: { app: resolved.displayName, target: resolved.target },
          };
        } catch (termErr) {
          const durationMs = Date.now() - startTime;
          return {
            success: false,
            message: termErr.message,
            durationMs,
          };
        }
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
