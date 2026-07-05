import { visionService } from "../services/vision.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const analyzeFrame = async (req, res, next) => {
  try {
    const frame = req.file || req.body.frame;
    const result = await visionService.processFrame(frame);
    res.status(200).json(new ApiResponse(200, result, "Frame analysis triggered successfully"));
  } catch (error) {
    next(error);
  }
};

export const getDetections = async (req, res, next) => {
  try {
    const result = await visionService.getLatestDetections();
    res.status(200).json(new ApiResponse(200, result, "Detections fetched successfully"));
  } catch (error) {
    next(error);
  }
};
