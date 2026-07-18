import { create } from "zustand";
import type { PerceptionSnapshot, StructuredContext } from "../types/cognitive";

interface CognitiveState {
  latestSnapshot: PerceptionSnapshot | null;
  latestContext: StructuredContext | null;
  setCognitiveData: (snapshot: PerceptionSnapshot, context: StructuredContext) => void;
  clearCognitiveData: () => void;
}

export const useCognitiveStore = create<CognitiveState>((set) => ({
  latestSnapshot: null,
  latestContext: null,
  setCognitiveData: (snapshot, context) => set({ latestSnapshot: snapshot, latestContext: context }),
  clearCognitiveData: () => set({ latestSnapshot: null, latestContext: null }),
}));
