import { create } from "zustand";
import type { PointerState, InteractionEvent, InteractionConfig } from "../interaction/interactionTypes";

interface InteractionState {
  hoveredId: string | null;
  pressedId: string | null;
  pointer: PointerState;
  events: InteractionEvent[];
  
  // Anchor and relative movement states
  anchor: { x: number; y: number } | null;
  virtualPointer: { x: number; y: number }; // Accumulated coordinates on screen space [0, 1]
  config: InteractionConfig;

  // Actions
  setHoveredId: (id: string | null) => void;
  setPressedId: (id: string | null) => void;
  updatePointer: (pointer: PointerState) => void;
  addEvent: (event: InteractionEvent) => void;
  setAnchor: (anchor: { x: number; y: number } | null) => void;
  setVirtualPointer: (pt: { x: number; y: number }) => void;
  updateConfig: (config: Partial<InteractionConfig>) => void;
  clearInteractionState: () => void;
}

const initialPointerState: PointerState = {
  x: 0.5,
  y: 0.5,
  windowX: 0,
  windowY: 0,
  visible: false,
  pinching: false,
};

const defaultConfig: InteractionConfig = {
  sensitivity: 0.85,          // Reduced overall scale for higher precision
  horizontalGain: 1.1,        // X-axis scale adjustment
  verticalGain: 0.9,          // Y-axis scale stability
  deadZone: 0.003,            // Tremor dead zone
  accelerationEnabled: true,
  accelerationMinGain: 1.0,
  accelerationMaxGain: 3.5,    // Capped speed max ceiling
  accelerationThreshold: 0.15, // Sigmoid threshold speed
  accelerationCurve: 12.0,     // Curve slope factor
};

export const useInteractionStore = create<InteractionState>((set) => ({
  hoveredId: null,
  pressedId: null,
  pointer: initialPointerState,
  events: [],
  anchor: null,
  virtualPointer: { x: 0.5, y: 0.5 },
  config: defaultConfig,

  setHoveredId: (id) => set({ hoveredId: id }),
  setPressedId: (id) => set({ pressedId: id }),
  updatePointer: (pointer) => set({ pointer }),
  
  addEvent: (event) =>
    set((state) => {
      // Keep event log size bounded to avoid memory leaks (max 100 entries)
      const updatedEvents = [...state.events, event].slice(-100);
      return { events: updatedEvents };
    }),

  setAnchor: (anchor) => set({ anchor }),
  setVirtualPointer: (pt) => set({ virtualPointer: pt }),
  updateConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),

  clearInteractionState: () =>
    set({
      hoveredId: null,
      pressedId: null,
      pointer: initialPointerState,
      anchor: null,
      virtualPointer: { x: 0.5, y: 0.5 },
    }),
}));
