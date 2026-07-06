import { useEffect, useRef, useCallback, useState, memo } from "react";
import GlowPanel from "../ui/GlowPanel";
import ViewportHeader from "./ViewportHeader";
import ViewportFooter from "./ViewportFooter";
import VisionHUD from "../hud/VisionHUD";
import { useCameraStore } from "../../store/cameraStore";
import { useVisionStore } from "../../store/visionStore";
import { Camera } from "lucide-react";

/**
 * VisionOverlayContainer
 *
 * A unified coordinate-space container that sits directly on top of the
 * rendered camera image. Every overlay layer (bounding boxes, future face mesh,
 * hand landmarks, pose, OCR, crosshair, scanner) renders inside this container
 * so they all share identical pixel dimensions and can use the same scaleX/scaleY
 * mapping from Python frame coordinates → displayed image coordinates.
 */
const drawBoundingBoxes = (
  ctx: CanvasRenderingContext2D,
  targetBoxes: any[],
  scaleX: number,
  scaleY: number,
  imageRect: { width: number; height: number }
) => {
  (targetBoxes ?? []).forEach((box) => {
    if (!box) return;

    const drawX = ((box.x ?? 0) / 100) * imageRect.width;
    const drawY = ((box.y ?? 0) / 100) * imageRect.height;
    const drawW = (box.w ?? 0) * scaleX;
    const drawH = (box.h ?? 0) * scaleY;

    // Draw box outline (cyan-400/50: #06b6d4)
    ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    // Corner brackets (cyan-300: #67e8f9)
    ctx.strokeStyle = "rgba(103, 232, 249, 1)";
    ctx.lineWidth = 1.5;
    const bracketLen = 10;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(drawX + bracketLen, drawY);
    ctx.lineTo(drawX, drawY);
    ctx.lineTo(drawX, drawY + bracketLen);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(drawX + drawW - bracketLen, drawY);
    ctx.lineTo(drawX + drawW, drawY);
    ctx.lineTo(drawX + drawW, drawY + bracketLen);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(drawX, drawY + drawH - bracketLen);
    ctx.lineTo(drawX, drawY + drawH);
    ctx.lineTo(drawX + bracketLen, drawY + drawH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(drawX + drawW - bracketLen, drawY + drawH);
    ctx.lineTo(drawX + drawW, drawY + drawH);
    ctx.lineTo(drawX + drawW, drawY + drawH - bracketLen);
    ctx.stroke();

    // Box Crosshair (center, length 12, opacity 15%)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.15)";
    ctx.lineWidth = 1;
    const cx = drawX + drawW / 2;
    const cy = drawY + drawH / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    // Text Label Card
    const text = `${box.label ?? "FACE DETECTED"} ${box.confidence ?? 0}%`;
    ctx.font = "bold 8px monospace";
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(text).width;
    const cardW = textWidth + 18;
    const cardH = 15;
    const cardX = drawX;
    const cardY = drawY - 20;

    // Draw background card
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, cardW, cardH, 4);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();

    // Card border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Status indicator dot (red)
    ctx.fillStyle = "rgba(239, 68, 68, 1)";
    ctx.beginPath();
    ctx.arc(cardX + 7, cardY + cardH / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    ctx.fillStyle = "rgba(103, 232, 249, 1)";
    ctx.fillText(text, cardX + 14, cardY + cardH / 2 + 0.5);
  });
};

const drawFaceMesh = (
  ctx: CanvasRenderingContext2D,
  faceLandmarks: any[],
  imageRect: { width: number; height: number }
) => {
  if (!faceLandmarks || faceLandmarks.length === 0) return;

  // Pass 1: Outer glow circles (radius 2.5, low opacity cyan)
  ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
  ctx.beginPath();
  faceLandmarks.forEach((entry) => {
    if (!entry || !Array.isArray(entry.landmarks)) return;
    entry.landmarks.forEach((lm: any) => {
      if (!lm) return;
      const x = (lm.x ?? 0) * imageRect.width;
      const y = (lm.y ?? 0) * imageRect.height;
      ctx.moveTo(x + 2.5, y);
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    });
  });
  ctx.fill();

  // Pass 2: Inner solid core circles (radius 1.25, high opacity cyan)
  ctx.fillStyle = "rgba(0, 229, 255, 0.85)";
  ctx.beginPath();
  faceLandmarks.forEach((entry) => {
    if (!entry || !Array.isArray(entry.landmarks)) return;
    entry.landmarks.forEach((lm: any) => {
      if (!lm) return;
      const x = (lm.x ?? 0) * imageRect.width;
      const y = (lm.y ?? 0) * imageRect.height;
      ctx.moveTo(x + 1.25, y);
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    });
  });
  ctx.fill();
};

const drawHands = (_ctx: CanvasRenderingContext2D) => {};
const drawPose = (_ctx: CanvasRenderingContext2D) => {};
const drawObjects = (_ctx: CanvasRenderingContext2D) => {};
const drawOCR = (_ctx: CanvasRenderingContext2D) => {};

const VisionOverlayContainer = memo(function VisionOverlayContainer({
  imageRect,
  frameWidth,
  frameHeight,
  targetBoxes,
  faceLandmarks,
  isCameraEnabled,
}: {
  imageRect: { width: number; height: number };
  frameWidth: number;
  frameHeight: number;
  targetBoxes: ReturnType<typeof useCameraStore.getState>["targetBoxes"];
  faceLandmarks: ReturnType<typeof useCameraStore.getState>["faceLandmarks"];
  isCameraEnabled: boolean;
}) {
  const startOverlayRender = performance.now();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Coordinate mapping: Python frame pixels → displayed image pixels
  const scaleX = imageRect.width > 0 && frameWidth > 0 ? imageRect.width / frameWidth : 1;
  const scaleY = imageRect.height > 0 && frameHeight > 0 ? imageRect.height / frameHeight : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = imageRect.width * dpr;
    canvas.height = imageRect.height * dpr;
    canvas.style.width = `${imageRect.width}px`;
    canvas.style.height = `${imageRect.height}px`;

    ctx.clearRect(0, 0, imageRect.width, imageRect.height);
    ctx.scale(dpr, dpr);

    if (!isCameraEnabled) return;

    // Draw dynamic overlay layers
    drawBoundingBoxes(ctx, targetBoxes, scaleX, scaleY, imageRect);
    drawFaceMesh(ctx, faceLandmarks, imageRect);

    // Expose drawing placeholders for future compatibility modules
    drawHands(ctx);
    drawPose(ctx);
    drawObjects(ctx);
    drawOCR(ctx);
  }, [targetBoxes, faceLandmarks, imageRect, scaleX, scaleY, isCameraEnabled]);

  useEffect(() => {
    if (!isCameraEnabled) return;
    const endOverlay = performance.now();
    const overlayRenderDuration = endOverlay - startOverlayRender;
    useVisionStore.getState().updateRenderTime("tOverlayRender", overlayRenderDuration);
  });

  if (!isCameraEnabled) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: imageRect.width,
        height: imageRect.height,
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />

      {/* ── Layer 7: Crosshair (center of overlay) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="absolute h-16 w-[0.5px] bg-cyan-500/10" />
        <div className="absolute h-[0.5px] w-16 bg-cyan-500/10" />
        <div className="absolute h-2.5 w-2.5 rounded-full border border-cyan-500/20" />
      </div>

      {/* ── Layer 8: Scanner Effect ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
        <div className="absolute left-0 right-0 h-[1.5px] scan-line bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
      </div>
    </div>
  );
});

export default function CameraViewport() {
  const startReactRender = performance.now();

  const isCameraEnabled = useCameraStore((state) => state?.isCameraEnabled ?? false);
  const targetBoxes = useCameraStore((state) => state?.targetBoxes ?? []);
  const faceLandmarks = useCameraStore((state) => state?.faceLandmarks ?? []);
  const frame = useCameraStore((state) => state?.frame ?? null);

  useEffect(() => {
    if (!isCameraEnabled) return;
    const endRender = performance.now();
    const reactRenderDuration = endRender - startReactRender;
    useVisionStore.getState().updateRenderTime("tReactRender", reactRenderDuration);

    const currentProfile = useVisionStore.getState().currentProfile;
    if (currentProfile && currentProfile.tPythonStart) {
      const tEndToEnd = Date.now() - currentProfile.tPythonStart;
      useVisionStore.getState().updateRenderTime("tEndToEnd", tEndToEnd);
    }
  });

  const visionMode = useVisionStore((state) => state?.visionMode ?? "standard");
  const frameWidth = useVisionStore((state) => state?.frameWidth ?? 0);
  const frameHeight = useVisionStore((state) => state?.frameHeight ?? 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Track the actual rendered image size (accounting for object-contain letterboxing)
  const [imageRect, setImageRect] = useState({ width: 0, height: 0 });

  /**
   * Measures the actual rendered image dimensions inside the <img> element.
   *
   * When using object-fit: contain, the <img> CSS box may be larger than
   * the actual rendered image (the excess is invisible letterbox padding).
   * getBoundingClientRect() returns the CSS box, NOT the rendered image.
   *
   * This function computes the true rendered image size by comparing
   * the element's dimensions with the image's natural aspect ratio.
   */
  const measureImage = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const elementWidth = img.clientWidth;
    const elementHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (naturalWidth === 0 || naturalHeight === 0) return;

    const imageAspect = naturalWidth / naturalHeight;
    const elementAspect = elementWidth / elementHeight;

    let renderedWidth: number;
    let renderedHeight: number;

    if (imageAspect > elementAspect) {
      // Image is wider than container → constrained by width
      renderedWidth = elementWidth;
      renderedHeight = elementWidth / imageAspect;
    } else {
      // Image is taller than container → constrained by height
      renderedHeight = elementHeight;
      renderedWidth = elementHeight * imageAspect;
    }

    setImageRect((prev) => {
      const w = Math.round(renderedWidth);
      const h = Math.round(renderedHeight);
      if (prev.width !== w || prev.height !== h) {
        return { width: w, height: h };
      }
      return prev;
    });
  }, []);

  // Re-measure on every frame update and on window resize
  useEffect(() => {
    measureImage();
  }, [frame, measureImage]);

  useEffect(() => {
    window.addEventListener("resize", measureImage);
    return () => window.removeEventListener("resize", measureImage);
  }, [measureImage]);

  // Canvas Animations for Offline Mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || (isCameraEnabled && frame)) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Nodes particles setup
    const particleCount = 28;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      char?: string;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.8,
        char: Math.random() > 0.5 ? "1" : "0",
      });
    }

    let sonarAngle = 0;
    let thermalTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (visionMode === "sonar") {
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.4;

        ctx.fillStyle = "#030604";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "rgba(57, 255, 20, 0.05)";
        ctx.lineWidth = 1;
        for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy);
        ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius);
        ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        sonarAngle += 0.012;
        const sweepEndX = cx + Math.cos(sonarAngle) * maxRadius;
        const sweepEndY = cy + Math.sin(sonarAngle) * maxRadius;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        grad.addColorStop(0, "rgba(57, 255, 20, 0.02)");
        grad.addColorStop(1, "rgba(57, 255, 20, 0.06)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxRadius, sonarAngle - 0.25, sonarAngle);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(57, 255, 20, 0.6)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sweepEndX, sweepEndY);
        ctx.stroke();

        const blips = [
          { x: cx + maxRadius * 0.4, y: cy - maxRadius * 0.35, size: 4, angle: -0.6 },
          { x: cx - maxRadius * 0.25, y: cy + maxRadius * 0.3, size: 3.5, angle: 2.3 },
        ];

        blips.forEach((blip) => {
          const diff = Math.abs((sonarAngle % (Math.PI * 2)) - (blip.angle + Math.PI * 2) % (Math.PI * 2));
          let opacity = 1 - (diff % (Math.PI * 2)) / (Math.PI * 2);
          if (opacity < 0.05) opacity = 0.05;

          ctx.fillStyle = `rgba(57, 255, 20, ${opacity})`;
          ctx.beginPath();
          ctx.arc(blip.x, blip.y, blip.size, 0, Math.PI * 2);
          ctx.fill();
        });

      } else if (visionMode === "thermal") {
        thermalTime += 0.003;
        ctx.fillStyle = "#010208";
        ctx.fillRect(0, 0, width, height);

        const blobs = [
          { cx: width * 0.5 + Math.sin(thermalTime) * 60, cy: height * 0.5 + Math.cos(thermalTime * 1.2) * 40, r: 150, c1: "rgba(255, 60, 60, 0.25)", c2: "rgba(255, 160, 0, 0.12)", c3: "rgba(0, 40, 180, 0)" },
          { cx: width * 0.38 + Math.cos(thermalTime * 0.7) * 50, cy: height * 0.45 + Math.sin(thermalTime * 0.9) * 30, r: 120, c1: "rgba(255, 100, 0, 0.22)", c2: "rgba(255, 200, 0, 0.1)", c3: "rgba(0, 0, 120, 0)" },
          { cx: width * 0.62 + Math.sin(thermalTime * 1.1) * 40, cy: height * 0.55 + Math.cos(thermalTime * 0.8) * 30, r: 130, c1: "rgba(255, 0, 100, 0.18)", c2: "rgba(160, 0, 220, 0.1)", c3: "rgba(0, 0, 80, 0)" },
        ];

        blobs.forEach((b) => {
          const radial = ctx.createRadialGradient(b.cx, b.cy, b.r * 0.05, b.cx, b.cy, b.r);
          radial.addColorStop(0, b.c1);
          radial.addColorStop(0.4, b.c2);
          radial.addColorStop(1, b.c3);
          ctx.fillStyle = radial;
          ctx.beginPath();
          ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
          ctx.fill();
        });

      } else {
        const pColor = visionMode === "cyber" ? "rgba(255, 0, 127, 0.4)" : "rgba(255, 255, 255, 0.35)";
        const lColor = visionMode === "cyber" ? "rgba(0, 240, 255, 0.08)" : "rgba(255, 255, 255, 0.04)";

        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.fillStyle = pColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          if (visionMode === "cyber" && Math.random() > 0.995) {
            ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
            ctx.font = "8px monospace";
            ctx.fillText(p.char || "0", p.x + 6, p.y + 3);
          }
        });

        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
              const alpha = (1 - dist / 120) * 0.4;
              ctx.strokeStyle = lColor.replace("0.04", alpha.toString()).replace("0.08", alpha.toString());
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCameraEnabled, frame, visionMode]);

  const getCameraFilter = () => {
    if (visionMode === "thermal") {
      return "hue-rotate-[140deg] saturate-[2.2] contrast-[1.05] brightness-[0.85]";
    }
    if (visionMode === "sonar") {
      return "grayscale-100 brightness-[0.7] contrast-[1.35] sepia-100 hue-rotate-[85deg] saturate-[3.5]";
    }
    if (visionMode === "cyber") {
      return "contrast-[1.15] hue-rotate-[-25deg] saturate-[1.25]";
    }
    return "contrast-[1.02] saturate-[1.05] brightness-[0.92]";
  };

  return (
    <GlowPanel
      className={`
      relative
      h-full
      overflow-hidden
      border
      border-white/[0.06]
      bg-[#05060b]/40
      shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]
      transition-all
      duration-500
      `}
    >
      {/* HUD overlays (positioned relative to the GlowPanel, outside the image coordinate space) */}
      <VisionHUD />

      {/* Header */}
      <ViewportHeader />

      {/* Background glow in center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.02),transparent_75%)] pointer-events-none" />

      {/* ═══════════════════════════════════════════════════════════════════
          VIEWPORT CORE — Unified Rendering Container
          The camera image fills ~80% of the available space while maintaining
          its native aspect ratio. All overlay layers share the same coordinate
          space by being absolutely positioned over the rendered image.
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ padding: "48px 24px" }}
      >
        {isCameraEnabled && frame ? (
          /* ── Active Camera Feed ── */
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Camera image — object-contain preserves aspect ratio, fills ~80% */}
            <img
              ref={imgRef}
              src={frame}
              alt="Camera Feed"
              onLoad={measureImage}
              draggable={false}
              className={`
                max-w-full max-h-full
                rounded-xl
                transition-[filter] duration-300
                object-contain
                select-none
                ${getCameraFilter()}
              `}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />

            {/* Vision Overlay Container — matches exact image dimensions */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <VisionOverlayContainer
                imageRect={imageRect}
                frameWidth={frameWidth}
                frameHeight={frameHeight}
                targetBoxes={targetBoxes}
                faceLandmarks={faceLandmarks}
                isCameraEnabled={isCameraEnabled}
              />
            </div>
          </div>
        ) : (
          /* ── Offline Canvas ── */
          <canvas ref={canvasRef} className="w-full h-full block" />
        )}
      </div>

      {/* Standby Camera Placeholder when offline */}
      {(!isCameraEnabled || !frame) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="flex flex-col items-center text-center px-6">
            {/* Camera Lens Indicator */}
            <div className="relative flex items-center justify-center w-36 h-36">
              {/* Outer HUD concentric rings */}
              <div className="absolute inset-0 rounded-full border border-dashed border-white/[0.03] animate-[spin_60s_linear_infinite]" />
              <div className="absolute inset-2 rounded-full border border-white/[0.04] animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-5 rounded-full border border-dashed border-cyan-500/10 animate-[spin_30s_linear_infinite_reverse]" />
              <div className="absolute inset-9 rounded-full border border-white/[0.02]" />
              
              {/* Central Camera Icon */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent shadow-[inset_0_2px_8px_rgba(255,255,255,0.02)] backdrop-blur-md">
                <Camera size={26} className="text-slate-400/70 animate-pulse" style={{ animationDuration: '3s' }} />
              </div>
            </div>

            {/* Waiting Text & Sub-labels */}
            <div className="mt-6 space-y-1.5">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.25em] text-slate-300">
                  Waiting for Camera...
                </span>
              </div>
              <p className="text-[8px] font-medium font-sans uppercase tracking-[0.15em] text-slate-500 max-w-[280px] leading-relaxed">
                AETHER OS requires active sensor capture to overlay vision matrix telemetry
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <ViewportFooter />
    </GlowPanel>
  );
}