import { Server } from "socket.io";
import { socketConfig } from "../config/socket.js";
import { registerSocketEvents } from "./socketEvents.js";
import { logger } from "../utils/logger.js";

let io;

export const initializeSocket = (server) => {
  logger.info("Initializing Socket.IO server...");
  io = new Server(server, socketConfig);

  io.use((socket, next) => {
    // Authentication handshake can go here in the future
    const token = socket.handshake.auth?.token;
    next();
  });

  io.on("connection", (socket) => {
    registerSocketEvents(io, socket);
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet!");
  }
  return io;
};
