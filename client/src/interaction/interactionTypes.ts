export interface PointerState {
  x: number; // Normalized x coord [0, 1] relative to viewport
  y: number; // Normalized y coord [0, 1] relative to viewport
  windowX: number; // Computed pixel x coord relative to the browser window
  windowY: number; // Computed pixel y coord relative to the browser window
  visible: boolean;
  pinching: boolean;
}

export interface InteractiveElement {
  id: string;
  element: HTMLElement;
  metadata?: any;
}

export type InteractionEventType =
  | "pointermove"
  | "hoverstart"
  | "hoverend"
  | "pressstart"
  | "pressend"
  | "click";

export interface InteractionEvent {
  type: InteractionEventType;
  targetId: string | null;
  timestamp: number;
  pointer: PointerState;
}

export interface InteractionConfig {
  sensitivity: number;        // Overall gain coefficient
  horizontalGain: number;     // Multiplier for X-axis delta
  verticalGain: number;       // Multiplier for Y-axis delta
  deadZone: number;           // Tremor cut-off displacement
  accelerationEnabled: boolean;
  accelerationMinGain: number; // Bottom acceleration floor
  accelerationMaxGain: number; // Top speed ceiling
  accelerationThreshold: number; // Speed threshold for sigmoid curve center
  accelerationCurve: number;   // Sigmoid scale curve factor
}
