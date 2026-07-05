import { Router } from "express";
import authRoutes from "./auth.routes.js";
import visionRoutes from "./vision.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/vision", visionRoutes);
router.use("/health", healthRoutes);

export default router;
