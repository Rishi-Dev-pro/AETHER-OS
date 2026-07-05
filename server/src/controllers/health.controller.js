import mongoose from "mongoose";
import { getIO } from "../socket/socketManager.js";

export const getHealth = async (req, res, next) => {
  try {
    let socket = false;
    try {
      socket = !!getIO();
    } catch (error) {
      // Socket.IO has not been initialized or error raised
    }

    const database = mongoose.connection.readyState === 1;

    return res.status(200).json({
      success: true,
      message: "AETHER Backend Running",
      socket,
      database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

