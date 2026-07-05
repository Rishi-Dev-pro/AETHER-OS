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
}

export interface VisionHand {
  id: string | number;
  side: "left" | "right";
  confidence?: number;
  landmarks?: Array<{ x: number; y: number; z: number }>;
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

export interface VisionPayload {
  timestamp: string;
  camera: boolean;
  fps: number;
  frameWidth: number;
  frameHeight: number;

  faces: VisionFace[];
  hands: VisionHand[];
  pose: VisionPose[];
  objects: VisionObject[];
  emotions: VisionEmotion[];
  ocr: VisionOCR[];

  status: string;
  warnings?: string[];
}
