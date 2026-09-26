/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Windows Native System Controls
 *
 * @file systemControls.js
 * @description Native operating system utilities (volume, mute, workstation lock,
 * and system telemetry) using Node.js standard libraries and Windows native hooks.
 */

import { execFile, spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.js";

/**
 * Adjusts system audio volume (up, down, or mute toggle).
 * Uses lightweight native PowerShell WScript.Shell SendKeys without external dependencies.
 * @param {'up' | 'down' | 'mute'} action
 * @param {number} [steps=2] Number of increments/decrements
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export function controlVolume(action, steps = 2) {
  return new Promise((resolve) => {
    let keyCode;
    let label;

    switch (action) {
      case "up":
        keyCode = 175; // VK_VOLUME_UP
        label = "Volume increased";
        break;
      case "down":
        keyCode = 174; // VK_VOLUME_DOWN
        label = "Volume decreased";
        break;
      case "mute":
      case "unmute":
        keyCode = 173; // VK_VOLUME_MUTE
        label = action === "mute" ? "Volume muted" : "Volume unmuted";
        steps = 1; // Toggle only once
        break;
      default:
        return resolve({ success: false, message: `Unknown volume action: ${action}` });
    }

    // PowerShell command that presses the media volume keys
    const psScript = `$w = New-Object -ComObject WScript.Shell; for($i=0; $i -lt ${steps}; $i++){ $w.SendKeys([char]${keyCode}) }`;

    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], (err) => {
      if (err) {
        logger.error(`Volume control failed: ${err.message}`);
        return resolve({ success: false, message: `Failed to adjust volume: ${err.message}` });
      }
      resolve({ success: true, message: label });
    });
  });
}

/**
 * Locks the Windows workstation session.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export function lockWorkstation() {
  return new Promise((resolve) => {
    execFile("rundll32.exe", ["user32.dll,LockWorkStation"], (err) => {
      if (err) {
        logger.error(`Workstation lock failed: ${err.message}`);
        return resolve({ success: false, message: `Failed to lock screen: ${err.message}` });
      }
      resolve({ success: true, message: "Workstation locked successfully" });
    });
  });
}

/**
 * Captures a screenshot of the primary screen and saves it as a PNG image.
 * @param {string} outputDir
 * @returns {Promise<{ success: boolean, message: string, filePath?: string }>}
 */
export function captureScreenshot(outputDir = os.tmpdir()) {
  return new Promise((resolve) => {
    const filename = `aether_screenshot_${Date.now()}.png`;
    const targetPath = path.join(outputDir, filename);

    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('${targetPath.replace(/\\/g, "/")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], (err) => {
      if (err || !fs.existsSync(targetPath)) {
        logger.warn(`Screenshot capture failed: ${err?.message || "File not saved"}`);
        return resolve({
          success: false,
          message: `Screenshot capture failed: ${err?.message || "Unknown error"}`,
        });
      }

      resolve({
        success: true,
        message: "Screenshot captured successfully",
        filePath: targetPath,
      });
    });
  });
}

/**
 * Gathers system hardware & OS telemetry using Node stdlib.
 * @returns {object}
 */
export function getSystemInfo() {
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
  const usedMemMb = totalMemMb - freeMemMb;
  const memoryUsagePercent = Math.round((usedMemMb / totalMemMb) * 100);

  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || "Unknown",
    totalMemoryMb: totalMemMb,
    freeMemoryMb: freeMemMb,
    memoryUsagePercent,
    uptimeSeconds: Math.round(os.uptime()),
  };
}
