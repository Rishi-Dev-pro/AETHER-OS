/**
 * AETHER OS — Cursor Phase State Machine (Phase 6.0)
 *
 * Pure function that derives the current cursor visual phase
 * from interaction state. No side effects, no store writes.
 *
 * This module is a rendering concern only — it determines
 * HOW the cursor looks, never WHERE it is or WHAT it does.
 */

// ── Phase Definitions ────────────────────────────────────────────────

export type CursorPhase = "hidden" | "idle" | "hover" | "press" | "pinchLock";

export interface CursorVisuals {
  /** Outer ring diameter in px */
  ringSize: number;
  /** Inner dot diameter in px */
  dotSize: number;
  /** Crosshair tick length in px */
  tickLength: number;
  /** Primary color (ring, ticks, dot) */
  primaryColor: string;
  /** Outer glow color (ring shadow) */
  glowColor: string;
  /** Ring border style */
  ringBorderStyle: "solid" | "dashed";
  /** Ring border width in px */
  ringBorderWidth: number;
  /** Overall opacity [0, 1] */
  opacity: number;
  /** CSS animation class name (from animations.css) or null */
  animationClass: string | null;
  /** Whether the telemetry label shows a status badge */
  statusBadge: string | null;
}

// ── Phase Derivation ─────────────────────────────────────────────────

/**
 * Derives cursor phase from current interaction state.
 * Pure function — no side effects.
 */
export function deriveCursorPhase(
  visible: boolean,
  hoveredId: string | null,
  pressedId: string | null,
  pinching: boolean
): CursorPhase {
  if (!visible) return "hidden";
  if (pinching && pressedId) return "press";
  if (pinching && !pressedId) return "pinchLock";
  if (hoveredId) return "hover";
  return "idle";
}

// ── Visual Property Maps ─────────────────────────────────────────────

const PHASE_VISUALS: Record<CursorPhase, CursorVisuals> = {
  hidden: {
    ringSize: 0,
    dotSize: 0,
    tickLength: 0,
    primaryColor: "transparent",
    glowColor: "transparent",
    ringBorderStyle: "solid",
    ringBorderWidth: 1,
    opacity: 0,
    animationClass: null,
    statusBadge: null,
  },

  idle: {
    ringSize: 28,
    dotSize: 6,
    tickLength: 7,
    primaryColor: "rgba(6, 182, 212, 0.9)",
    glowColor: "rgba(6, 182, 212, 0.2)",
    ringBorderStyle: "solid",
    ringBorderWidth: 1.5,
    opacity: 1,
    animationClass: null,
    statusBadge: null,
  },

  hover: {
    ringSize: 36,
    dotSize: 5,
    tickLength: 9,
    primaryColor: "rgba(56, 229, 255, 0.95)",
    glowColor: "rgba(56, 229, 255, 0.35)",
    ringBorderStyle: "solid",
    ringBorderWidth: 2,
    opacity: 1,
    animationClass: "cursor-hover-pulse",
    statusBadge: "TARGET",
  },

  press: {
    ringSize: 18,
    dotSize: 8,
    tickLength: 4,
    primaryColor: "rgba(244, 63, 94, 0.95)",
    glowColor: "rgba(244, 63, 94, 0.4)",
    ringBorderStyle: "solid",
    ringBorderWidth: 2.5,
    opacity: 1,
    animationClass: null,
    statusBadge: "PRESS",
  },

  pinchLock: {
    ringSize: 22,
    dotSize: 5,
    tickLength: 5,
    primaryColor: "rgba(251, 191, 36, 0.9)",
    glowColor: "rgba(251, 191, 36, 0.25)",
    ringBorderStyle: "dashed",
    ringBorderWidth: 1.5,
    opacity: 0.9,
    animationClass: null,
    statusBadge: "LOCKED",
  },
};

/**
 * Returns the target visual properties for a given cursor phase.
 */
export function getCursorVisuals(phase: CursorPhase): CursorVisuals {
  return PHASE_VISUALS[phase];
}
