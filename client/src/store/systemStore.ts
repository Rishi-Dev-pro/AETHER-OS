import { create } from "zustand";

interface SystemState {
  cpu: number;
  latency: number;
  memory: number;
  fps: number;
  updateMetrics: (metrics: Partial<Omit<SystemState, "updateMetrics">>) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  cpu: 12,
  latency: 21,
  memory: 420,
  fps: 60,
  updateMetrics: (metrics) => set((state) => ({ ...state, ...metrics })),
}));
