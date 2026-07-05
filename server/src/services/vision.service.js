import { logger } from "../utils/logger.js";

class VisionService {
  async processFrame(frameData) {
    // Stub: To be integrated with frameProcessor / pythonBridge
    logger.info("Vision service processing frame data...");
    return {
      success: true,
      detections: [],
      timestamp: Date.now(),
    };
  }

  async getLatestDetections() {
    logger.info("Fetching latest camera vision spatial detections...");
    return {
      faces: 0,
      hands: 0,
      objects: 0,
      emotion: "None",
    };
  }
}

export const visionService = new VisionService();
