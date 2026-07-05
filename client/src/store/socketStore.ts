import { create } from "zustand";

interface SocketState {
  socketConnected: boolean;
  backendConnected: boolean;
  lastPing: number | null;
  latency: number | null;
  setSocketConnected: (connected: boolean) => void;
  setBackendConnected: (connected: boolean) => void;
  updateLatency: (latency: number) => void;
  setLastPing: (time: number) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socketConnected: false,
  backendConnected: false,
  lastPing: null,
  latency: null,
  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setBackendConnected: (connected) => set({ backendConnected: connected }),
  updateLatency: (latency) => set({ latency }),
  setLastPing: (time) => set({ lastPing: time }),
}));
