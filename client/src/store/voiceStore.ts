import { create } from "zustand";

interface VoiceState {
  isListening: boolean;
  voiceStatus: "OFFLINE" | "ONLINE" | "LISTENING";
  toggleListening: () => void;
  setVoiceStatus: (status: "OFFLINE" | "ONLINE" | "LISTENING") => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  voiceStatus: "ONLINE",
  toggleListening: () =>
    set((state) => {
      const nextListening = !state.isListening;
      return {
        isListening: nextListening,
        voiceStatus: nextListening ? "LISTENING" : "ONLINE",
      };
    }),
  setVoiceStatus: (status) => set({ voiceStatus: status }),
}));
