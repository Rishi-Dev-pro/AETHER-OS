import { env } from "./env.js";

export const socketConfig = {
  cors: {
    origin: env.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
};
