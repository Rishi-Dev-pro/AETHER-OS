import { spawn } from "child_process";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { validateVisionPayload } from "../utils/visionValidator.js";
import { detectionManager } from "./detectionManager.js";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";

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
    this.lastEmitTime = 0;
    
    // Throttling and drop tracking variables
    this.latestLine = null;
    this.isProcessing = false;
    this.droppedFramesCount = 0;
  }

  /**
   * Returns true if the Python vision subprocess is currently running
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
      this.pythonProcess = spawn("python", ["-u", scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      logger.success("✓ Python Started");

      this._rl = readline.createInterface({
        input: this.pythonProcess.stdout,
        terminal: false
      });

      this.latestLine = null;
      this.isProcessing = false;
      this.droppedFramesCount = 0;

      this._rl.on("line", (line) => {
        if (this.isStopping) return;

        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith("{")) {
          this.latestLine = trimmed;
          if (!this.isProcessing) {
            this.isProcessing = true;
            setImmediate(() => {
              const lineToProcess = this.latestLine;
              this.latestLine = null;
              this.isProcessing = false;
              if (lineToProcess) {
                this.processLine(lineToProcess);
              }
            });
          } else {
            this.droppedFramesCount++;
          }
        } else {
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
   * Stops the Python Vision Engine gracefully by killing the process.
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
      try {
        if (proc.stdin && !proc.stdin.destroyed) {
          proc.stdin.write("STOP\n");
          logger.info("Sent STOP command to Python stdin");
        }
      } catch (err) {
        logger.warn(`Could not write STOP to stdin: ${err.message}`);
      }

      const killTimer = setTimeout(() => {
        if (this.pythonProcess && this.pythonProcess === proc) {
          logger.warn("Python did not exit in time, force killing...");
          try {
            proc.kill("SIGKILL");
          } catch (e) {
            // ignore
          }
          this._cleanup();
          resolve();
        }
      }, 3000);

      proc.once("close", () => {
        clearTimeout(killTimer);
        resolve();
      });
    }).finally(() => {
      this._stopPromise = null;
    });

    return this._stopPromise;
  }

  processLine(line) {
    const tNodeReceive = Date.now();
    try {
      const startParse = performance.now();
      const data = JSON.parse(line);
      const tJsonParse = performance.now() - startParse;

      const payload = data.payload;
      const frame = data.frame;
      const profile = data.profile || {};

      // Pipeline Age Throttling (Drop stale frames older than 100ms before broadcasting)
      if (profile.tPythonStart) {
        const age = tNodeReceive - profile.tPythonStart;
        if (age > 100) {
          this.droppedFramesCount++;
          logger.warn(`✓ Frame Dropped in Node (Stale: ${age}ms)`);
          return;
        }
      }

      const validation = validateVisionPayload(payload);
      
      if (validation.isValid) {
        logger.info("✓ Payload Received");
        
        profile.tNodeReceive = tNodeReceive;
        profile.tJsonParse = tJsonParse;
        profile.tNodeEmitTimestamp = Date.now();
        profile.tNodeEmit = this.lastEmitTime;
        profile.droppedFramesNode = this.droppedFramesCount;

        const startEmit = performance.now();
        detectionManager.handlePayload({ frame, payload, profile });
        this.lastEmitTime = performance.now() - startEmit;
      } else {
        logger.warn(`Invalid Python payload: ${validation.errors.join(", ")}`);
      }
    } catch (error) {
      logger.warn(`Failed to parse Python line as JSON: ${error.message}`);
    }
  }

  _cleanup() {
    if (this._rl) {
      try { this._rl.close(); } catch (e) { /* ignore */ }
      this._rl = null;
    }
    this.pythonProcess = null;
    this.isStopping = false;
    this.latestLine = null;
    this.isProcessing = false;
    this.droppedFramesCount = 0;
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
