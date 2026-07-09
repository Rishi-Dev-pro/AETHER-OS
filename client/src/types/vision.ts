export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface VisionFace {
  id: string | number;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  emotions?: string[];
  landmarks?: FaceLandmark[];
  eyes?: {
    leftOpen: boolean;
    rightOpen: boolean;
  };
  blink?: boolean;
  mouth?: {
    open: boolean;
    ratio: number;
  };
  smile?: number;
  head?: {
    yaw: number;
    pitch: number;
    roll: number;
  };
  looking?: "left" | "right" | "center" | "up" | "down" | string;
}

export interface VisionHand {
  id: string | number;
  side?: "left" | "right";
  handedness: "left" | "right" | string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  center: {
    x: number;
    y: number;
  };
  landmarks: Array<{ x: number; y: number; z: number }>;
  gesture?: string;
  pinch?: {
    active: boolean;
    state: "start" | "hold" | "release" | "inactive";
    strength: number;
    distance: number;
  };
}

export interface VisionPose {
  id: string | number;
  landmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
}

export interface VisionObject {
  id?: string | number;
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface VisionEmotion {
  label: string;
  confidence?: number;
}

export interface VisionOCR {
  text: string;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface VisionGesture {
  handId: string | number;
  gesture: string;
  confidence: number;
}

export interface VisionPinch {
  handId: string | number;
  active: boolean;
  state: "start" | "hold" | "release" | "inactive";
  strength: number;
  distance: number;
}

export interface VisionPointer {
  x: number;
  y: number;
  visible: boolean;
  pinching: boolean;
  raw?: {
    x: number;
    y: number;
  };
  stable?: {
    x: number;
    y: number;
  };
}

export interface VisionPayload {
  timestamp: string;
  camera: boolean;
  fps: number;
  frameWidth: number;
  frameHeight: number;

  faces: VisionFace[];
  hands: VisionHand[];
  gestures?: VisionGesture[];
  pinches?: VisionPinch[];
  pointer?: VisionPointer;
  pose: VisionPose[];
  objects: VisionObject[];
  emotions: VisionEmotion[];
  ocr: VisionOCR[];

  status: string;
  warnings?: string[];
  metrics?: {
    cameraFps: number;
    detectionFps: number;
    streamingFps: number;
    avgDetectionTime: number;
  };
}
