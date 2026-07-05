import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/aether_os",
  jwtSecret: process.env.JWT_SECRET || "aether_os_jwt_secret_key_change_me_in_production",
  jwtExpire: process.env.JWT_EXPIRE || "24h",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};

// Validate environment variables on startup
if (isNaN(env.port) || env.port <= 0 || env.port > 65535) {
  throw new Error("Invalid PORT environment variable. Must be a number between 1 and 65535.");
}

if (!env.mongodbUri) {
  throw new Error("MONGODB_URI environment variable is required.");
}

if (env.nodeEnv === "production" && env.jwtSecret === "aether_os_jwt_secret_key_change_me_in_production") {
  logger.warn("WARNING: JWT_SECRET has not been changed from default in production!");
}

logger.success("✓ Environment Loaded");

