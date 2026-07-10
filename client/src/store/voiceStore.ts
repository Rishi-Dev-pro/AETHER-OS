import { create } from "zustand";

interface VoiceState {
  // Local Capture Ownership State
  hasMicOwnership: boolean;
  voiceStatus: "OFFLINE" | "ONLINE" | "LISTENING";

  // Visual/Telemetry State (Synchronized across clients)
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  transcript: string;
  isFinal: boolean;
  confidence: number;

  toggleListening: () => void;
  setVoiceStatus: (status: "OFFLINE" | "ONLINE" | "LISTENING") => void;
  updateVoiceTelemetry: (telemetry: Partial<Omit<VoiceState, "toggleListening" | "setVoiceStatus" | "updateVoiceTelemetry" | "resetVoiceTelemetry" | "hasMicOwnership" | "voiceStatus">>) => void;
  resetVoiceTelemetry: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  hasMicOwnership: false,
  voiceStatus: "ONLINE",
  isListening: false,
  isSpeaking: false,
  audioLevel: 0,
  transcript: "",
  isFinal: false,
  confidence: 1.0,

  toggleListening: () =>
    set((state) => {
      const nextListening = !state.isListening;
      return {
        isListening: nextListening,
        hasMicOwnership: nextListening, // Gain/release hardware ownership locally
        voiceStatus: nextListening ? "LISTENING" : "ONLINE",
        // Reset telemetry on toggle
        isSpeaking: false,
        audioLevel: 0,
        transcript: "",
        isFinal: false,
        confidence: 1.0,
      };
    }),

  setVoiceStatus: (status) => set({ voiceStatus: status }),

  updateVoiceTelemetry: (telemetry) =>
    set((state) => {
      // Whitelist only visual/telemetry keys for remote updates
      const allowedKeys: Array<keyof VoiceState> = [
        "isListening",
        "isSpeaking",
        "audioLevel",
        "transcript",
        "isFinal",
        "confidence"
      ];
      
      const filteredTelemetry = Object.keys(telemetry).reduce((acc, key) => {
        if (allowedKeys.includes(key as any)) {
          (acc as any)[key] = (telemetry as any)[key];
        }
        return acc;
      }, {} as Partial<VoiceState>);

      // Render Optimization: Value check to prevent redundant Zustand/React renders
      const hasChanges = Object.keys(filteredTelemetry).some(
        (key) => (state as any)[key] !== (filteredTelemetry as any)[key]
      );
      if (!hasChanges) return state;

      return { ...state, ...filteredTelemetry };
    }),

  resetVoiceTelemetry: () => set({
    isSpeaking: false,
    audioLevel: 0,
    transcript: "",
    isFinal: false,
    confidence: 1.0,
  }),
}));
