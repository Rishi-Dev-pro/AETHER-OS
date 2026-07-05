import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { initializeSocket } from "./socket/socketManager.js";

const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Start listening
server.listen(env.port, () => {
  logger.success("✓ Express Running");
  if (io) {
    logger.success("✓ Socket.IO Running");
  }
  // Connect to Database in the background
  connectDB();

  // Python Vision Engine is NOT started here.
  // It will only start when a client emits "camera:start".
  logger.info("✓ Camera pipeline idle (waiting for camera:start)");
});

// Handle unhandled rejections gracefully
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
