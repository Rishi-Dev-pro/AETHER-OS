import { create } from "zustand";

export interface TargetBox {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

interface CameraState {
  isCameraEnabled: boolean;
  cameraStatus: "OFFLINE" | "READY" | "ACTIVE";
  detectedItems: {
    faces: number;
    hands: number;
    objects: number;
    emotion: string;
  };
  targetBoxes: TargetBox[];
  
  // Frame streaming states
  frame: string | null;
  cameraConnected: boolean;
  fps: number;
  resolution: string;
  lastFrameTime: number | null;

  toggleCamera: () => void;
  setCameraEnabled: (enabled: boolean) => void;
  setCameraStatus: (status: "OFFLINE" | "READY" | "ACTIVE") => void;
  updateDetectedItems: (items: Partial<CameraState["detectedItems"]>) => void;
  setTargetBoxes: (boxes: TargetBox[]) => void;
  updateCameraFeed: (
    frame: string | null,
    cameraConnected: boolean,
    fps: number,
    width: number,
    height: number
  ) => void;
  resetCameraFeed: () => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  isCameraEnabled: false,
  cameraStatus: "READY",
  detectedItems: {
    faces: 0,
    hands: 0,
    objects: 0,
    emotion: "None",
  },
  targetBoxes: [],
  
  // Initial frame states
  frame: null,
  cameraConnected: false,
  fps: 0,
  resolution: "0x0",
  lastFrameTime: null,

  toggleCamera: () =>
    set((state) => {
      const nextEnabled = !state.isCameraEnabled;
      return {
        isCameraEnabled: nextEnabled,
        cameraStatus: nextEnabled ? "ACTIVE" : "READY",
      };
    }),
  setCameraEnabled: (enabled) =>
    set({
      isCameraEnabled: enabled,
      cameraStatus: enabled ? "ACTIVE" : "READY",
    }),
  setCameraStatus: (status) => set({ cameraStatus: status }),
  updateDetectedItems: (items) =>
    set((state) => ({
      detectedItems: { ...state.detectedItems, ...items },
    })),
  setTargetBoxes: (boxes) => set({ targetBoxes: boxes }),
  updateCameraFeed: (frame, cameraConnected, fps, width, height) =>
    set(() => ({
      frame,
      cameraConnected,
      fps,
      resolution: `${width}x${height}`,
      lastFrameTime: frame ? Date.now() : null,
      cameraStatus: cameraConnected ? "ACTIVE" : "OFFLINE"
    })),

  /**
   * Resets all camera feed state back to defaults.
   * Called when the camera is stopped or Python crashes.
   */
  resetCameraFeed: () =>
    set(() => ({
      frame: null,
      cameraConnected: false,
      fps: 0,
      resolution: "0x0",
      lastFrameTime: null,
      cameraStatus: "READY",
      targetBoxes: [],
      detectedItems: {
        faces: 0,
        hands: 0,
        objects: 0,
        emotion: "None",
      },
    })),
}));
