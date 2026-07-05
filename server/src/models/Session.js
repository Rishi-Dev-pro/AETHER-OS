import mongoose from "mongoose";
import { SESSION_STATUS } from "../utils/constants.js";

const SessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional for guest logins
    },
    socketId: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.ACTIVE,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    osState: {
      isCameraEnabled: { type: Boolean, default: false },
      isVoiceListening: { type: Boolean, default: false },
      visionMode: { type: String, default: "standard" },
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.model("Session", SessionSchema);
