import { useRef } from "react";
import { useCursorRenderer } from "./useCursorRenderer";

/**
 * GlobalPointer Component (Phase 6.0)
 *
 * Promotes the stabilized pointer to a global browser-level viewport overlay.
 * Renders fixed at the top of the interface, converting normalized coordinate
 * telemetry from the camera stream to window-relative pixels.
 *
 * Phase 6.0 changes:
 *   - Position updates driven by requestAnimationFrame (60fps interpolation)
 *   - All DOM mutations happen via refs (no React re-render per frame)
 *   - Visual state machine: idle / hover / press / pinchLock
 *   - Hover magnetism toward interactive element centers (visual-only)
 *
 * Critical constraints preserved:
 *   - Never writes to interactionStore or cameraStore
 *   - Never modifies hit testing coordinates
 *   - Pinch Lock logic remains in InteractionEngine (untouched)
 */
export default function GlobalPointer() {
  const cursorRef = useRef<HTMLDivElement>(null);

  const {
    outerRingRef,
    ringRef,
    dotRef,
    tickRefs,
    labelRef,
  } = useCursorRenderer(cursorRef);

  // The entire visual state is driven by the rAF loop in useCursorRenderer.
  // React only renders the static DOM skeleton once — all dynamic updates
  // happen through direct style mutations on the refs below.

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Cursor Container — positioned by rAF loop via cursorRef */}
      <div
        ref={cursorRef}
        className="absolute flex items-center justify-center"
        style={{
          left: 0,
          top: 0,
          willChange: "transform, opacity",
          opacity: 0,
        }}
      >
        {/* Outer concentric ring */}
        <div
          ref={outerRingRef}
          className="absolute rounded-full border transition-none"
          style={{
            width: "38px",
            height: "38px",
            borderWidth: "1px",
            borderStyle: "dashed",
            borderColor: "rgba(6, 182, 212, 0.9)",
          }}
        />

        {/* Glowing inner ring */}
        <div
          ref={ringRef}
          className="absolute rounded-full transition-none"
          style={{
            width: "28px",
            height: "28px",
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: "rgba(6, 182, 212, 0.2)",
            boxShadow: "0 0 10px rgba(6, 182, 212, 0.2)",
          }}
        />

        {/* Central target dot */}
        <div
          ref={dotRef}
          className="rounded-full transition-none"
          style={{
            width: "6px",
            height: "6px",
            backgroundColor: "rgba(6, 182, 212, 0.9)",
          }}
        />

        {/* Crosshair ticks — Left */}
        <div
          ref={(el) => { tickRefs.current[0] = el; }}
          className="absolute transition-none"
          style={{
            height: "1px",
            width: "7px",
            left: "-9px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(6, 182, 212, 0.9)",
          }}
        />
        {/* Crosshair ticks — Right */}
        <div
          ref={(el) => { tickRefs.current[1] = el; }}
          className="absolute transition-none"
          style={{
            height: "1px",
            width: "7px",
            right: "-9px",
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(6, 182, 212, 0.9)",
          }}
        />
        {/* Crosshair ticks — Top */}
        <div
          ref={(el) => { tickRefs.current[2] = el; }}
          className="absolute transition-none"
          style={{
            width: "1px",
            height: "7px",
            top: "-9px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(6, 182, 212, 0.9)",
          }}
        />
        {/* Crosshair ticks — Bottom */}
        <div
          ref={(el) => { tickRefs.current[3] = el; }}
          className="absolute transition-none"
          style={{
            width: "1px",
            height: "7px",
            bottom: "-9px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(6, 182, 212, 0.9)",
          }}
        />

        {/* Telemetry data label */}
        <div
          ref={labelRef}
          className="absolute left-12 text-[8px] font-bold font-mono tracking-widest whitespace-nowrap bg-black/85 px-2 py-0.5 rounded border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-none"
          style={{ color: "rgba(6, 182, 212, 0.9)" }}
        >
          PTR: (50, 50)
        </div>
      </div>
    </div>
  );
}
