import { create } from "zustand";
import type { PromptPackage } from "../types/prompt";

export type CompileStatus = "idle" | "compiling" | "success" | "error";

interface PromptState {
  latestPackage: PromptPackage | null;
  compileStatus: CompileStatus;
  setPromptPackage: (pkg: PromptPackage) => void;
  setCompileStatus: (status: CompileStatus) => void;
  clearPrompt: () => void;
}

export const usePromptStore = create<PromptState>((set) => ({
  latestPackage: null,
  compileStatus: "idle",
  setPromptPackage: (pkg) => set({ latestPackage: pkg, compileStatus: "success" }),
  setCompileStatus: (status) => set({ compileStatus: status }),
  clearPrompt: () => set({ latestPackage: null, compileStatus: "idle" }),
}));
