import { logger } from "../utils/logger.js";

class RoomManager {
  constructor() {
    this.activeRooms = new Map();
  }

  joinRoom(socket, roomName) {
    socket.join(roomName);
    logger.info(`Socket [${socket.id}] joined room: ${roomName}`);
  }

  leaveRoom(socket, roomName) {
    socket.leave(roomName);
    logger.info(`Socket [${socket.id}] left room: ${roomName}`);
  }

  broadcastToRoom(io, roomName, event, data) {
    io.to(roomName).emit(event, data);
  }
}

export const roomManager = new RoomManager();
