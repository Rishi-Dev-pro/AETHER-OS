import { getIO } from "../socket/socketManager.js";
import { logger } from "../utils/logger.js";

class SocketService {
  emitToUser(userId, event, data) {
    logger.info(`Emitting event '${event}' to user ${userId}`);
    try {
      const io = getIO();
      io.to(`user_${userId}`).emit(event, data);
    } catch (error) {
      logger.error(`Error emitting socket event to user: ${error.message}`);
    }
  }

  broadcast(event, data) {
    logger.info(`Broadcasting event '${event}' to all clients`);
    try {
      const io = getIO();
      io.emit(event, data);
    } catch (error) {
      logger.error(`Error broadcasting socket event: ${error.message}`);
    }
  }
}

export const socketService = new SocketService();
