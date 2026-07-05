import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(env.nodeEnv === "development" ? { stack: error.stack } : {}),
  };

  logger.error(`${req.method} ${req.originalUrl} - Status ${error.statusCode} - Error: ${error.message}`);
  
  if (env.nodeEnv === "development" && error.statusCode === 500) {
    console.error(err);
  }

  return res.status(error.statusCode).json(response);
};
