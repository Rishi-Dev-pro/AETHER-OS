import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { morganMiddleware } from "./middleware/logger.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import apiRouter from "./routes/index.routes.js";
import { ApiError } from "./utils/ApiError.js";
import { env } from "./config/env.js";
import { getHealth } from "./controllers/health.controller.js";

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

// Gzip compression
app.use(compression());

// Request parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Morgan middleware integration
app.use(morganMiddleware);

// Health check endpoint
app.get("/api/health", getHealth);

// API Routing
app.use("/api/v1", apiRouter);

// Catch 404 errors
app.use("*", (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Global error middleware
app.use(errorHandler);

export { app };
