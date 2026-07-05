import { pythonBridge } from "./pythonBridge.js";
import { logger } from "../utils/logger.js";

class FrameProcessor {
  processBase64Frame(base64Data) {
    if (!base64Data) return null;

    try {
      // Clean base64 prefix headers
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      
      // Forward image bytes to subprocess stream
      pythonBridge.sendFrame(buffer);
      
      return buffer;
    } catch (error) {
      logger.error(`Failed to translate base64 frame: ${error.message}`);
      return null;
    }
  }
}

export const frameProcessor = new FrameProcessor();
