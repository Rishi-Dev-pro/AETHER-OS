import morgan from "morgan";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

const stream = {
  write: (message) => logger.info(message.trim()),
};

export const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream }
);
