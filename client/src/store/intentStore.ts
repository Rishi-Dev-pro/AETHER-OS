import { create } from "zustand";
import type { IntentResult } from "../types/intent";

export type ClassificationStatus = "idle" | "classifying" | "success" | "error";

interface IntentState {
  latestIntent: IntentResult | null;
  classificationStatus: ClassificationStatus;
  setIntentResult: (result: IntentResult) => void;
  setClassificationStatus: (status: ClassificationStatus) => void;
  clearIntent: () => void;
}

export const useIntentStore = create<IntentState>((set) => ({
  latestIntent: null,
  classificationStatus: "idle",
  setIntentResult: (result) => set({ latestIntent: result, classificationStatus: "success" }),
  setClassificationStatus: (status) => set({ classificationStatus: status }),
  clearIntent: () => set({ latestIntent: null, classificationStatus: "idle" }),
}));
