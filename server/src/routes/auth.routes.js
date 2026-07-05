import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validation.middleware.js";

const router = Router();

router.post("/register", validateBody(["username", "email", "password"]), register);
router.post("/login", validateBody(["email", "password"]), login);
router.get("/logout", logout);
router.get("/me", protect, getMe);

export default router;
