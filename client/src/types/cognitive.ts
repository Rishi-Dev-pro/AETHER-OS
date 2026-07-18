import type { VisionPointer } from "./vision";

export type TriggerType =
  | "speech_final"
  | "click"
  | "pinch_release"
  | "socket_update"
  | "passive_timer"
  | "explicit";

export interface SnapshotMetadata {
  snapshotId: string;
  schemaVersion: string;
  builderVersion: string;
  timestamp: number;
  triggerType: TriggerType;
}

export interface SnapshotSession {
  sessionId: string;
  socketId: string;
}

export interface SnapshotVisionFace {
  id: string | number;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
  looking?: string;
  dominantEmotion?: string;
}

export interface SnapshotVisionHand {
  id: string | number;
  handedness: string;
  gesture?: string;
  pinchActive: boolean;
  pinchStrength: number;
}

export interface SnapshotVision {
  cameraActive: boolean;
  fps: number;
  faceCount: number;
  emotionSummary: string;
  faces: SnapshotVisionFace[];
  handCount: number;
  hands: SnapshotVisionHand[];
  pointer: VisionPointer;
}

export interface SnapshotVoice {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface SnapshotInteraction {
  hoveredElementId: string | null;
  pressedElementId: string | null;
  virtualPointer: { x: number; y: number };
  lastInteractionType: string | null;
}

export interface SnapshotEnvironment {
  latency: number | null;
  systemFps: number;
  resolution: string;
}

export interface PerceptionSnapshot {
  metadata: SnapshotMetadata;
  session: SnapshotSession;
  vision: SnapshotVision;
  voice: SnapshotVoice;
  interaction: SnapshotInteraction;
  environment: SnapshotEnvironment;
}

export interface StructuredContext {
  snapshotId: string;
  timestamp: number;
  triggerType: TriggerType;
  
  // Semantic Summarized States
  systemStateSummary: string;
  visualFocusText: string;
  userExpression: string;
  userHandsText: string;
  voiceInputText: string;
  
  // Raw voice data for deterministic intent classification
  voice: {
    transcript: string;
    isListening: boolean;
    isSpeaking: boolean;
    isFinal: boolean;
    confidence: number;
  };
  
  // Cleaned telemetry structures
  contextMetadata: {
    builderVersion: string;
    schemaVersion: string;
    timeOffsetMs: number;
  };
}
