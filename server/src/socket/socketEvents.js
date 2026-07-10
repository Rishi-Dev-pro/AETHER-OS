import { logger } from "../utils/logger.js";
import { roomManager } from "./roomManager.js";
import { visionService } from "../services/vision.service.js";
import { validateVisionPayload } from "../utils/visionValidator.js";
import { pythonBridge } from "../vision/pythonBridge.js";

export const registerSocketEvents = (io, socket) => {
  logger.info(`New client connection established: ${socket.id}`);

  // Helper to broadcast server status updates
  const broadcastStatus = () => {
    io.emit("server:status", {
      status: "online",
      clientsConnected: io.engine.clientsCount,
      timestamp: new Date().toISOString(),
    });
  };

  // Broadcast status on new client connection
  broadcastStatus();



  // Handle client connected event (with acknowledgment)
  socket.on("client:connected", (data, callback) => {
    logger.info(`client:connected event received from ${socket.id}`);
    if (typeof callback === "function") {
      callback({
        connected: true,
        serverTime: new Date().toISOString(),
      });
    }
  });

  // Handle heartbeat ping
  socket.on("socket:ping", () => {
    socket.emit("socket:pong");
  });

  // Bind to session room
  socket.on("session:join", (data) => {
    const { sessionId } = data;
    roomManager.joinRoom(socket, `session_${sessionId}`);
    socket.emit("session:joined", { success: true, sessionId });
  });

  // Handle image frame streaming
  socket.on("vision:stream_frame", async (data) => {
    try {
      const response = await visionService.processFrame(data.frame);
      socket.emit("vision:targets_detected", response);
    } catch (error) {
      logger.error(`Socket frame processing error: ${error.message}`);
      socket.emit("vision:error", { message: "Frame processing failed" });
    }
  });

  // ── Camera Lifecycle Events ──────────────────────────────────────────

  /**
   * camera:start — Spawn the Python Vision Engine on demand.
   * Ignores duplicate requests if Python is already running.
   */
  socket.on("camera:start", async () => {
    logger.info(`✓ Camera Start Requested (from client ${socket.id})`);

    if (pythonBridge.isRunning() && !pythonBridge.isBusy()) {
      logger.warn("✓ Camera Start Ignored (Python already running)");
      return;
    }

    await pythonBridge.start({
      onCrash: (exitCode) => {
        logger.error(`Python Vision Engine crashed (exit code: ${exitCode}). Notifying clients.`);
        io.emit("camera:crashed", {
          reason: "Python Vision Engine exited unexpectedly",
          exitCode,
          timestamp: new Date().toISOString(),
        });
      },
    });
  });

  /**
   * camera:stop — Gracefully stop the Python Vision Engine.
   * Ignores duplicate requests if Python is not running.
   */
  socket.on("camera:stop", async () => {
    logger.info(`✓ Camera Stop Requested (from client ${socket.id})`);

    if (!pythonBridge.isRunning()) {
      logger.warn("✓ Camera Stop Ignored (Python not running)");
      return;
    }

    await pythonBridge.stop();
    socket.emit("camera:stopped", {
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  // ────────────────────────────────────────────────────────────────────

  // Broadcaster for HUD toggles
  socket.on("os:state_update", (data) => {
    logger.info(`OS config update received: ${JSON.stringify(data)}`);
    socket.broadcast.emit("os:state_changed", data);
  });

  // Relay voice telemetry to other clients
  socket.on("voice:telemetry", (data) => {
    socket.broadcast.emit("voice:telemetry", data);
  });

  // Client disconnected
  socket.on("disconnect", () => {
    logger.info(`Websocket client disconnected: ${socket.id}`);
    broadcastStatus();

    // If no clients remain, stop Python to release the camera hardware
    // Use setTimeout(0) to let Socket.IO finish updating clientsCount
    setTimeout(() => {
      const remainingClients = io.engine.clientsCount;
      if (remainingClients === 0 && pythonBridge.isRunning()) {
        logger.info("✓ Last client disconnected — stopping Python Vision Engine");
        pythonBridge.stop();
      }
    }, 0);
  });
};
