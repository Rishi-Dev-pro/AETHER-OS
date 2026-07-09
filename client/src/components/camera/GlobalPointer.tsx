import { useEffect, useState } from "react";
import { useInteractionStore } from "../../store/interactionStore";

/**
 * GlobalPointer Component
 *
 * Promotes the stabilized pointer to a global browser-level viewport overlay.
 * Renders fixed at the top of the interface, converting normalized coordinate telemetry
 * from the camera stream to window-relative pixels based on current screen dimensions.
 */
export default function GlobalPointer() {
  const pointer = useInteractionStore((state) => state.pointer);

  // Monitor window dimensions dynamically for scale calculations
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!pointer || !pointer.visible) return null;

  // Map normalized 0.0 - 1.0 to actual browser viewport boundaries
  const px = pointer.x * dimensions.width;
  const py = pointer.y * dimensions.height;

  const isPinching = pointer.pinching;
  
  // Custom theme colors matching AETHER OS style: Cyan for hover, Red for pinch
  const activeColor = isPinching ? "rgba(239, 68, 68, 0.95)" : "rgba(6, 182, 212, 0.95)";
  const outerGlowColor = isPinching ? "rgba(239, 68, 68, 0.3)" : "rgba(6, 182, 212, 0.3)";
  const size = isPinching ? 12 : 20;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      style={{ width: "100vw", height: "100vh" }}
    >
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: 0,
          top: 0,
          transform: `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`,
        }}
      >
        {/* Outer dashed concentric ring */}
        <div
          className="absolute rounded-full border border-dashed transition-all duration-200 ease-out"
          style={{
            borderColor: activeColor,
            width: `${size + 8}px`,
            height: `${size + 8}px`,
            transform: isPinching ? "scale(0.85)" : "scale(1)",
          }}
        />

        {/* Glowing border ring */}
        <div
          className="absolute rounded-full border-2 transition-all duration-200 ease-out"
          style={{
            borderColor: outerGlowColor,
            width: `${size}px`,
            height: `${size}px`,
            boxShadow: `0 0 10px ${outerGlowColor}`,
          }}
        />

        {/* Central target core dot */}
        <div
          className="h-1.5 w-1.5 rounded-full transition-colors duration-200"
          style={{ backgroundColor: activeColor }}
        />

        {/* Concentric crosshair ticks */}
        {/* Left */}
        <div
          className="absolute bg-current transition-all duration-200"
          style={{
            color: activeColor,
            width: isPinching ? "4px" : "6px",
            height: "1px",
            left: isPinching ? "-3px" : "-5px",
          }}
        />
        {/* Right */}
        <div
          className="absolute bg-current transition-all duration-200"
          style={{
            color: activeColor,
            width: isPinching ? "4px" : "6px",
            height: "1px",
            right: isPinching ? "-3px" : "-5px",
          }}
        />
        {/* Top */}
        <div
          className="absolute bg-current transition-all duration-200"
          style={{
            color: activeColor,
            width: "1px",
            height: isPinching ? "4px" : "6px",
            top: isPinching ? "-3px" : "-5px",
          }}
        />
        {/* Bottom */}
        <div
          className="absolute bg-current transition-all duration-200"
          style={{
            color: activeColor,
            width: "1px",
            height: isPinching ? "4px" : "6px",
            bottom: isPinching ? "-3px" : "-5px",
          }}
        />

        {/* Telemetry data label card */}
        <div
          className="absolute left-8 text-[8px] font-bold font-mono tracking-widest transition-colors duration-200 whitespace-nowrap bg-black/85 px-2 py-0.5 rounded border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          style={{ color: activeColor }}
        >
          PTR: ({Math.round(pointer.x * 100)}, {Math.round(pointer.y * 100)})
          {isPinching ? " [PINCH]" : ""}
        </div>
      </div>
    </div>
  );
}
