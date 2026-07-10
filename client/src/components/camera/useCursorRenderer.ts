/**
 * AETHER OS — Cursor Renderer Hook (Phase 6.0)
 *
 * Custom React hook that drives the GlobalPointer at display refresh rate.
 *
 * Responsibilities:
 *   A. Frame Interpolation — lerps rendered position from 34fps to 60fps+
 *   B. Cursor Phase — derives visual state from interaction store
 *   C. Hover Magnetism — visual-only pull toward hovered element centers
 *
 * Critical design constraints:
 *   - NEVER writes to interactionStore or cameraStore
 *   - ALL position updates happen via direct DOM mutation (ref.style.transform)
 *   - Zustand subscriptions use .subscribe() (not selectors) to avoid React re-renders
 *   - The rAF loop is the single render driver — React render cycle is bypassed
 */

import { useEffect, useRef, useCallback } from "react";
import { useInteractionStore } from "../../store/interactionStore";
import { interactionRegistry } from "../../interaction/interactionRegistry";
import { deriveCursorPhase, getCursorVisuals } from "./cursorPhase";
import type { CursorPhase, CursorVisuals } from "./cursorPhase";

// ── Configuration ────────────────────────────────────────────────────

/** Interpolation factor: higher = more responsive, lower = smoother */
const LERP_FACTOR = 0.38;

/** How strongly visual properties (size, opacity) interpolate between phases */
const VISUAL_LERP_FACTOR = 0.18;

/** Magnetism pull strength toward hovered element centers */
const MAGNET_STRENGTH = 0.2;

/** Distance threshold (px) below which magnetism is at full strength */
const MAGNET_RADIUS = 120;

/** Lerp factor for magnetism offset return-to-zero when unhovered */
const MAGNET_DECAY = 0.12;

// ── Types ────────────────────────────────────────────────────────────

export interface CursorRenderState {
  /** Interpolated pixel X position */
  x: number;
  /** Interpolated pixel Y position */
  y: number;
  /** Currently rendered visual properties (lerped between phases) */
  visuals: {
    ringSize: number;
    dotSize: number;
    tickLength: number;
    opacity: number;
    ringBorderWidth: number;
  };
  /** Current discrete phase (not lerped — used for color/style switches) */
  phase: CursorPhase;
  /** Target visuals from the phase state machine */
  targetVisuals: CursorVisuals;
  /** Whether the cursor should be visible */
  visible: boolean;
  /** Magnetic offset in px */
  magnetX: number;
  magnetY: number;
  /** Normalized pointer coords for telemetry display */
  normalizedX: number;
  normalizedY: number;
  /** Whether currently pinching (for telemetry label) */
  pinching: boolean;
}

// ── Utility ──────────────────────────────────────────────────────────

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Drives the cursor DOM element at display refresh rate.
 * Returns a ref to attach to the cursor container element.
 *
 * @param cursorRef - Ref to the main cursor container DOM element
 */
export function useCursorRenderer(cursorRef: React.RefObject<HTMLDivElement | null>) {
  // ── Mutable state (refs, not React state — no re-renders) ────────

  const rafId = useRef<number>(0);

  // Current render state
  const state = useRef<CursorRenderState>({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    visuals: {
      ringSize: 28,
      dotSize: 6,
      tickLength: 7,
      opacity: 0,
      ringBorderWidth: 1.5,
    },
    phase: "hidden",
    targetVisuals: getCursorVisuals("hidden"),
    visible: false,
    magnetX: 0,
    magnetY: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
    pinching: false,
  });

  // Target position (updated by store subscription)
  const targetX = useRef(window.innerWidth / 2);
  const targetY = useRef(window.innerHeight / 2);

  // Latest store values (updated by subscription, read by rAF)
  const latestPointer = useRef({ x: 0.5, y: 0.5, visible: false, pinching: false, windowX: 0, windowY: 0 });
  const latestHoveredId = useRef<string | null>(null);
  const latestPressedId = useRef<string | null>(null);

  // ── DOM Element Refs for direct mutation ──────────────────────────

  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const tickRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]); // L, R, T, B
  const labelRef = useRef<HTMLDivElement | null>(null);
  const outerRingRef = useRef<HTMLDivElement | null>(null);

  // ── Store Subscription (no re-renders) ───────────────────────────

  useEffect(() => {
    const unsubPointer = useInteractionStore.subscribe((s) => {
      const p = s.pointer;
      latestPointer.current = p;

      if (p.visible) {
        targetX.current = p.x * window.innerWidth;
        targetY.current = p.y * window.innerHeight;
      }
    });

    const unsubHover = useInteractionStore.subscribe((s) => {
      latestHoveredId.current = s.hoveredId;
    });

    const unsubPress = useInteractionStore.subscribe((s) => {
      latestPressedId.current = s.pressedId;
    });

    return () => {
      unsubPointer();
      unsubHover();
      unsubPress();
    };
  }, []);

  // ── rAF Loop ─────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const s = state.current;
    const pointer = latestPointer.current;
    const el = cursorRef.current;

    if (!el) {
      rafId.current = requestAnimationFrame(tick);
      return;
    }

    // 1. Derive cursor phase
    const newPhase = deriveCursorPhase(
      pointer.visible,
      latestHoveredId.current,
      latestPressedId.current,
      pointer.pinching
    );

    if (newPhase !== s.phase) {
      s.phase = newPhase;
      s.targetVisuals = getCursorVisuals(newPhase);
    }

    s.visible = pointer.visible;
    s.normalizedX = pointer.x;
    s.normalizedY = pointer.y;
    s.pinching = pointer.pinching;

    // 2. Interpolate position
    if (pointer.visible) {
      s.x = lerp(s.x, targetX.current, LERP_FACTOR);
      s.y = lerp(s.y, targetY.current, LERP_FACTOR);
    }

    // 3. Compute hover magnetism (visual-only)
    const hovId = latestHoveredId.current;
    if (hovId && pointer.visible && !pointer.pinching) {
      const elements = interactionRegistry.getElements();
      const hoveredEl = elements.get(hovId);
      if (hoveredEl && hoveredEl.isConnected) {
        const rect = hoveredEl.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;

        const dx = elCenterX - s.x;
        const dy = elCenterY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Scale magnetism by proximity (full strength within MAGNET_RADIUS, fades beyond)
        const proximity = Math.max(0, 1 - dist / MAGNET_RADIUS);
        const pull = MAGNET_STRENGTH * proximity;

        s.magnetX = lerp(s.magnetX, dx * pull, VISUAL_LERP_FACTOR);
        s.magnetY = lerp(s.magnetY, dy * pull, VISUAL_LERP_FACTOR);
      } else {
        s.magnetX = lerp(s.magnetX, 0, MAGNET_DECAY);
        s.magnetY = lerp(s.magnetY, 0, MAGNET_DECAY);
      }
    } else {
      // Decay magnetism when not hovering
      s.magnetX = lerp(s.magnetX, 0, MAGNET_DECAY);
      s.magnetY = lerp(s.magnetY, 0, MAGNET_DECAY);
    }

    // 4. Interpolate visual properties
    const tv = s.targetVisuals;
    s.visuals.ringSize = lerp(s.visuals.ringSize, tv.ringSize, VISUAL_LERP_FACTOR);
    s.visuals.dotSize = lerp(s.visuals.dotSize, tv.dotSize, VISUAL_LERP_FACTOR);
    s.visuals.tickLength = lerp(s.visuals.tickLength, tv.tickLength, VISUAL_LERP_FACTOR);
    s.visuals.opacity = lerp(s.visuals.opacity, pointer.visible ? tv.opacity : 0, VISUAL_LERP_FACTOR);
    s.visuals.ringBorderWidth = lerp(s.visuals.ringBorderWidth, tv.ringBorderWidth, VISUAL_LERP_FACTOR);

    // 5. Apply to DOM (direct mutation — bypasses React render cycle)
    const renderX = s.x + s.magnetX;
    const renderY = s.y + s.magnetY;

    // Container position
    el.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) translate(-50%, -50%)`;
    el.style.opacity = s.visuals.opacity > 0.01 ? "1" : "0";
    el.style.pointerEvents = "none";

    // Outer dashed ring
    if (outerRingRef.current) {
      const outerSize = s.visuals.ringSize + 10;
      outerRingRef.current.style.width = `${outerSize}px`;
      outerRingRef.current.style.height = `${outerSize}px`;
      outerRingRef.current.style.borderColor = tv.primaryColor;
      outerRingRef.current.style.borderStyle = tv.ringBorderStyle;
      outerRingRef.current.style.opacity = s.phase === "press" ? "0.5" : "1";
    }

    // Inner ring
    if (ringRef.current) {
      ringRef.current.style.width = `${s.visuals.ringSize}px`;
      ringRef.current.style.height = `${s.visuals.ringSize}px`;
      ringRef.current.style.borderColor = tv.glowColor;
      ringRef.current.style.borderWidth = `${s.visuals.ringBorderWidth}px`;
      ringRef.current.style.boxShadow = `0 0 ${s.phase === "hover" ? 18 : 10}px ${tv.glowColor}`;
    }

    // Central dot
    if (dotRef.current) {
      dotRef.current.style.width = `${s.visuals.dotSize}px`;
      dotRef.current.style.height = `${s.visuals.dotSize}px`;
      dotRef.current.style.backgroundColor = tv.primaryColor;
    }

    // Crosshair ticks [Left, Right, Top, Bottom]
    const ticks = tickRefs.current;
    const tl = s.visuals.tickLength;
    if (ticks[0]) {
      ticks[0].style.width = `${tl}px`;
      ticks[0].style.left = `${-tl - 2}px`;
      ticks[0].style.backgroundColor = tv.primaryColor;
    }
    if (ticks[1]) {
      ticks[1].style.width = `${tl}px`;
      ticks[1].style.right = `${-tl - 2}px`;
      ticks[1].style.backgroundColor = tv.primaryColor;
    }
    if (ticks[2]) {
      ticks[2].style.height = `${tl}px`;
      ticks[2].style.top = `${-tl - 2}px`;
      ticks[2].style.backgroundColor = tv.primaryColor;
    }
    if (ticks[3]) {
      ticks[3].style.height = `${tl}px`;
      ticks[3].style.bottom = `${-tl - 2}px`;
      ticks[3].style.backgroundColor = tv.primaryColor;
    }

    // Telemetry label
    if (labelRef.current) {
      const badge = tv.statusBadge ? ` [${tv.statusBadge}]` : "";
      const pinchLabel = pointer.pinching && !tv.statusBadge ? " [PINCH]" : "";
      labelRef.current.textContent = `PTR: (${Math.round(pointer.x * 100)}, ${Math.round(pointer.y * 100)})${badge}${pinchLabel}`;
      labelRef.current.style.color = tv.primaryColor;
      labelRef.current.style.borderColor = tv.glowColor;
    }

    // Animation class management
    if (outerRingRef.current) {
      const animClass = tv.animationClass;
      if (animClass && !outerRingRef.current.classList.contains(animClass)) {
        // Remove all cursor animation classes first
        outerRingRef.current.classList.remove("cursor-hover-pulse");
        outerRingRef.current.classList.add(animClass);
      } else if (!animClass) {
        outerRingRef.current.classList.remove("cursor-hover-pulse");
      }
    }

    // Schedule next frame
    rafId.current = requestAnimationFrame(tick);
  }, [cursorRef]);

  // ── Lifecycle ────────────────────────────────────────────────────

  useEffect(() => {
    rafId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [tick]);

  // ── Return refs for DOM element binding ──────────────────────────

  return {
    outerRingRef,
    ringRef,
    dotRef,
    tickRefs,
    labelRef,
    state,
  };
}
