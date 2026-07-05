import { create } from "zustand";
import type { VisionPayload } from "../types/vision";

export type VisionMode = "standard" | "thermal" | "cyber" | "sonar";

interface VisionState {
  // Mode-related UI states
  visionMode: VisionMode;
  setVisionMode: (mode: VisionMode) => void;
  showGrid: boolean;
  toggleGrid: () => void;

  // Real-time Vision Data Protocol states (Phase 3.3)
  cameraStatus: boolean;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  faceCount: number;
  handCount: number;
  objectCount: number;
  poseStatus: boolean;
  ocrStatus: boolean;
  emotionStatus: string;
  lastUpdate: number | null;

  // Update action
  updateVisionData: (data: VisionPayload) => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  visionMode: "standard",
  setVisionMode: (mode) => set({ visionMode: mode }),
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  // Initial protocol values
  cameraStatus: false,
  fps: 0,
  frameWidth: 0,
  frameHeight: 0,
  faceCount: 0,
  handCount: 0,
  objectCount: 0,
  poseStatus: false,
  ocrStatus: false,
  emotionStatus: "None",
  lastUpdate: null,

  updateVisionData: (data) =>
    set(() => {
      let detectedEmotion = "None";
      if (Array.isArray(data.emotions) && data.emotions.length > 0) {
        const first = data.emotions[0];
        detectedEmotion = typeof first === "object" ? (first as any).label : first;
      }

      return {
        cameraStatus: data.camera,
        fps: data.fps,
        frameWidth: data.frameWidth,
        frameHeight: data.frameHeight,
        faceCount: Array.isArray(data.faces) ? data.faces.length : 0,
        handCount: Array.isArray(data.hands) ? data.hands.length : 0,
        objectCount: Array.isArray(data.objects) ? data.objects.length : 0,
        poseStatus: Array.isArray(data.pose) ? data.pose.length > 0 : false,
        ocrStatus: Array.isArray(data.ocr) ? data.ocr.length > 0 : false,
        emotionStatus: detectedEmotion,
        lastUpdate: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
      };
    }),
}));

