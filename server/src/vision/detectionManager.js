import { logger } from "../utils/logger.js";
import { getIO } from "../socket/socketManager.js";

class DetectionManager {
  constructor() {
    this.latestPayload = null;
  }

  handlePayload(data) {
    this.latestPayload = data.payload;
    try {
      const io = getIO();
      io.emit("vision:update", {
        frame: data.frame,
        payload: data.payload
      });
      logger.success("✓ Payload Broadcast");
    } catch (error) {
      logger.warn(`Could not broadcast vision:update payload: ${error.message}`);
    }
  }

  getLatest() {
    return this.latestPayload;
  }
}

export const detectionManager = new DetectionManager();
