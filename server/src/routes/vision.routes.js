import { Router } from "express";
import multer from "multer";
import { analyzeFrame, getDetections } from "../controllers/vision.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
const router = Router();

router.post("/analyze", protect, upload.single("frame"), analyzeFrame);
router.get("/detections", protect, getDetections);

export default router;
