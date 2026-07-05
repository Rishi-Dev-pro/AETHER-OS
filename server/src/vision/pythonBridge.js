import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { validateVisionPayload } from "../utils/visionValidator.js";
import { detectionManager } from "./detectionManager.js";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultScriptPath = path.resolve(__dirname, "../../../vision/main.py");

class PythonBridge {
  constructor() {
    this.pythonProcess = null;
    this.isStopping = false;
    this.exitHandlersRegistered = false;
    this._onCrash = null;
    this._rl = null;
    this._stopPromise = null;
  }

  /**
   * Returns true if the Python vision subprocess is currently running
   * (including if it's in the process of stopping).
   */
  isRunning() {
    return this.pythonProcess !== null;
  }

  /**
   * Returns true if a stop is currently in progress.
   */
  isBusy() {
    return this.isStopping;
  }

  /**
   * Starts the Python Vision Engine subprocess.
   * @param {Object} options
   * @param {string} options.scriptPath - Path to the Python script.
   * @param {Function} options.onCrash - Callback invoked if Python exits unexpectedly.
   */
  async start({ scriptPath = defaultScriptPath, onCrash = null } = {}) {
    if (env.nodeEnv === "test") {
      logger.info("PythonBridge in test mode - bypassing child process spawning");
      return;
    }

    // If a stop is in progress, wait for it to finish before starting
    if (this._stopPromise) {
      logger.info("Waiting for previous Python process to fully exit...");
      await this._stopPromise;
    }

    if (this.pythonProcess) {
      logger.warn("✓ Camera Start Ignored (Python already running)");
      return;
    }

    this.isStopping = false;
    this._onCrash = onCrash;

    logger.info("✓ Camera Start Requested");
    logger.info(`Starting Python vision subprocess: python ${scriptPath}`);
    
    try {
      this.pythonProcess = spawn("python", [scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      logger.success("✓ Python Started");

      this._rl = readline.createInterface({
        input: this.pythonProcess.stdout,
        terminal: false
      });

      this._rl.on("line", (line) => {
        // Don't broadcast if we're stopping
        if (this.isStopping) return;

        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith("{")) {
          try {
            const data = JSON.parse(trimmed);
            const payload = data.payload;
            const frame = data.frame;

            const validation = validateVisionPayload(payload);
            
            if (validation.isValid) {
              logger.info("✓ Payload Received");
              detectionManager.handlePayload({ frame, payload });
            } else {
              logger.warn(`Invalid Python payload: ${validation.errors.join(", ")}`);
            }
          } catch (error) {
            // Ignore invalid JSON safely (never crash)
            logger.warn(`Failed to parse Python line as JSON: ${error.message}`);
          }
        } else {
          // Log non-JSON standard print statements
          logger.info(`[Python stdout]: ${trimmed}`);
        }
      });

      this.pythonProcess.stderr.on("data", (data) => {
        logger.warn(`[Python stderr]: ${data.toString().trim()}`);
      });

      this.pythonProcess.on("close", (code) => {
        logger.warn(`Python process closed with exit code: ${code}`);
        const wasStopping = this.isStopping;
        this._cleanup();

        if (!wasStopping) {
          // Unexpected crash — notify via callback, do NOT auto-restart
          logger.error("✓ Python Crashed Unexpectedly");
          if (typeof this._onCrash === "function") {
            this._onCrash(code);
          }
        } else {
          logger.success("✓ Python Exited Cleanly");
        }
      });

      // Register process exit listeners to clean up (once)
      if (!this.exitHandlersRegistered) {
        process.on("exit", () => this.stop());
        process.on("SIGINT", () => {
          this.stop();
          process.exit(0);
        });
        process.on("SIGTERM", () => {
          this.stop();
          process.exit(0);
        });
        this.exitHandlersRegistered = true;
      }

    } catch (error) {
      logger.error(`Could not spawn Python vision subprocess: ${error.message}`);
      this._cleanup();
    }
  }

  /**
   * Stops the Python Vision Engine gracefully.
   * Writes STOP to stdin first, then falls back to kill after a timeout.
   * Returns a Promise that resolves when the process has fully exited.
   */
  stop() {
    if (!this.pythonProcess) {
      logger.info("✓ Camera Stop Ignored (Python not running)");
      return Promise.resolve();
    }

    if (this.isStopping && this._stopPromise) {
      logger.info("✓ Camera Stop Already In Progress");
      return this._stopPromise;
    }

    logger.info("✓ Camera Stop Requested");
    this.isStopping = true;

    const proc = this.pythonProcess;

    this._stopPromise = new Promise((resolve) => {
      // Send STOP command via stdin (cross-platform graceful shutdown)
      try {
        if (proc.stdin && !proc.stdin.destroyed) {
          proc.stdin.write("STOP\n");
          logger.info("Sent STOP command to Python stdin");
        }
      } catch (err) {
        logger.warn(`Could not write STOP to stdin: ${err.message}`);
      }

      // Fallback: force kill after 3 seconds if Python hasn't exited
      const killTimer = setTimeout(() => {
        if (this.pythonProcess && this.pythonProcess === proc) {
          logger.warn("Python did not exit in time, force killing...");
          try {
            proc.kill("SIGKILL");
          } catch (e) {
            // Process may have already exited
          }
          this._cleanup();
          resolve();
        }
      }, 3000);

      // If process exits before the timeout, clear the timer and resolve
      proc.once("close", () => {
        clearTimeout(killTimer);
        resolve();
      });
    }).finally(() => {
      this._stopPromise = null;
    });

    return this._stopPromise;
  }

  /**
   * Cleans up all references after Python process exits.
   */
  _cleanup() {
    if (this._rl) {
      try { this._rl.close(); } catch (e) { /* ignore */ }
      this._rl = null;
    }
    this.pythonProcess = null;
    this.isStopping = false;
  }

  sendFrame(frameBuffer) {
    if (!this.pythonProcess) {
      return;
    }
    try {
      this.pythonProcess.stdin.write(frameBuffer);
    } catch (error) {
      logger.error(`Error piping frame data to Python stdin: ${error.message}`);
    }
  }
}

export const pythonBridge = new PythonBridge();
