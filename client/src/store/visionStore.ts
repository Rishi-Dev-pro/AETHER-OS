import { create } from "zustand";
import type { VisionPayload, VisionFace } from "../types/vision";

export type VisionMode = "standard" | "thermal" | "cyber" | "sonar";

export interface FrameProfile {
  tCameraCapture: number;
  tFaceDetect: number;
  tFaceMesh: number;
  tFaceIntel: number;
  tJpegEncode: number;
  tBase64Encode: number;
  tPythonWrite: number;
  tNodeReceive: number;
  tJsonParse: number;
  tNodeEmit: number;
  tBrowserReceive: number;
  tImageDecode: number;
  tReactRender: number;
  tOverlayRender: number;
  tEndToEnd: number;
}

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
  activeFaces: VisionFace[];
  cameraFps: number;
  detectionFps: number;
  streamingFps: number;
  avgDetectionTime: number;

  // Profiler state
  profileQueue: FrameProfile[];
  currentProfile: Partial<FrameProfile> & { tPythonStart?: number; tPythonEnd?: number; tNodeEmitTimestamp?: number } | null;
  droppedFrames: number;

  // Actions
  updateVisionData: (data: VisionPayload) => void;
  updateProfile: (profile: any) => void;
  updateRenderTime: (key: "tReactRender" | "tOverlayRender" | "tEndToEnd" | "tImageDecode", duration: number) => void;
  getProfileStats: () => Record<keyof FrameProfile, { avg: number; min: number; max: number }> | null;
  incrementDroppedFrames: (count?: number) => void;
}

export const useVisionStore = create<VisionState>((set, get) => {
  let lastQueue: FrameProfile[] = [];
  let cachedStats: Record<keyof FrameProfile, { avg: number; min: number; max: number }> | null = null;

  return {
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
    activeFaces: [],
    cameraFps: 0,
    detectionFps: 0,
    streamingFps: 0,
    avgDetectionTime: 0,

    // Initial Profiler state
    profileQueue: [],
    currentProfile: null,
    droppedFrames: 0,

    incrementDroppedFrames: (count = 1) => set((state) => ({ droppedFrames: (state.droppedFrames ?? 0) + count })),

    updateVisionData: (data) =>
      set(() => {
        let detectedEmotion = "None";
        if (data && Array.isArray(data.emotions) && data.emotions.length > 0) {
          const first = data.emotions[0];
          detectedEmotion = typeof first === "object" ? (first as any).label : first;
        }

        return {
          cameraStatus: data?.camera ?? false,
          fps: data?.fps ?? 0,
          frameWidth: data?.frameWidth ?? 0,
          frameHeight: data?.frameHeight ?? 0,
          faceCount: data && Array.isArray(data.faces) ? data.faces.length : 0,
          handCount: data && Array.isArray(data.hands) ? data.hands.length : 0,
          objectCount: data && Array.isArray(data.objects) ? data.objects.length : 0,
          poseStatus: data && Array.isArray(data.pose) ? data.pose.length > 0 : false,
          ocrStatus: data && Array.isArray(data.ocr) ? data.ocr.length > 0 : false,
          emotionStatus: detectedEmotion,
          lastUpdate: data?.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
          activeFaces: data && Array.isArray(data.faces) ? data.faces : [],
          cameraFps: data?.metrics?.cameraFps ?? 0,
          detectionFps: data?.metrics?.detectionFps ?? 0,
          streamingFps: data?.metrics?.streamingFps ?? 0,
          avgDetectionTime: data?.metrics?.avgDetectionTime ?? 0,
        };
      }),

    updateProfile: (profile) =>
      set(() => ({
        currentProfile: profile,
      })),

    updateRenderTime: (key, duration) =>
      set((state) => {
        if (!state.currentProfile) return {};
        
        const updatedProfile = {
          ...state.currentProfile,
          [key]: duration,
        };

        let newQueue = state.profileQueue;
        if (key === "tEndToEnd") {
          const fullProfile: FrameProfile = {
            tCameraCapture: updatedProfile.tCameraCapture ?? 0,
            tFaceDetect: updatedProfile.tFaceDetect ?? 0,
            tFaceMesh: updatedProfile.tFaceMesh ?? 0,
            tFaceIntel: updatedProfile.tFaceIntel ?? 0,
            tJpegEncode: updatedProfile.tJpegEncode ?? 0,
            tBase64Encode: updatedProfile.tBase64Encode ?? 0,
            tPythonWrite: updatedProfile.tPythonWrite ?? 0,
            tNodeReceive: updatedProfile.tNodeReceive ?? 0,
            tJsonParse: updatedProfile.tJsonParse ?? 0,
            tNodeEmit: updatedProfile.tNodeEmit ?? 0,
            tBrowserReceive: updatedProfile.tBrowserReceive ?? 0,
            tImageDecode: updatedProfile.tImageDecode ?? 0,
            tReactRender: updatedProfile.tReactRender ?? 0,
            tOverlayRender: updatedProfile.tOverlayRender ?? 0,
            tEndToEnd: duration,
          };

          newQueue = [...state.profileQueue, fullProfile];
          if (newQueue.length > 100) {
            newQueue = newQueue.slice(1);
          }
        }

        return {
          currentProfile: updatedProfile,
          profileQueue: newQueue,
        };
      }),

    getProfileStats: () => {
      const queue = get()?.profileQueue ?? [];
      if (queue.length === 0) return null;
      if (queue === lastQueue && cachedStats) {
        return cachedStats;
      }

      const stats: any = {};
      const keys: Array<keyof FrameProfile> = [
        "tCameraCapture", "tFaceDetect", "tFaceMesh", "tFaceIntel",
        "tJpegEncode", "tBase64Encode", "tPythonWrite", "tNodeReceive",
        "tJsonParse", "tNodeEmit", "tBrowserReceive", "tImageDecode",
        "tReactRender", "tOverlayRender", "tEndToEnd"
      ];

      keys.forEach((key) => {
        const values = queue.map((p) => p?.[key] ?? 0).filter((v) => v !== undefined && v !== null && !isNaN(v));
        if (values.length === 0) {
          stats[key] = { avg: 0, min: 0, max: 0 };
          return;
        }
        const sum = values.reduce((a, b) => a + b, 0);
        stats[key] = {
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });

      lastQueue = queue;
      cachedStats = stats;
      return stats;
    },
  };
});
