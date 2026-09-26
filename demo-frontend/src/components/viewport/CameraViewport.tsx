import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Zap } from "lucide-react";
import GlowBadge from "../primitives/GlowBadge";
import GlowPanel from "../primitives/GlowPanel";

export default function CameraViewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated offline canvas — particle network + radar sweep
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let frame: number;

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle network
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    for (let i = 0; i < 40; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    let radarAngle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Subtle radial gradient background
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.5);
      grad.addColorStop(0, "rgba(0, 229, 255, 0.015)");
      grad.addColorStop(0.5, "rgba(124, 58, 237, 0.008)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Radar sweep
      radarAngle += 0.008;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.38;

      // Concentric rings
      for (let r = maxR * 0.25; r <= maxR; r += maxR * 0.25) {
        ctx.strokeStyle = "rgba(0, 229, 255, 0.04)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sweep arc
      const sweepGrad = ctx.createConicGradient(radarAngle, cx, cy);
      sweepGrad.addColorStop(0, "rgba(0, 229, 255, 0.06)");
      sweepGrad.addColorStop(0.15, "rgba(0, 229, 255, 0.02)");
      sweepGrad.addColorStop(0.16, "transparent");
      sweepGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Sweep line
      ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(radarAngle) * maxR, cy + Math.sin(radarAngle) * maxR);
      ctx.stroke();

      // Blips
      const blips = [
        { x: cx + maxR * 0.4, y: cy - maxR * 0.3, r: 3, angle: -0.5 },
        { x: cx - maxR * 0.3, y: cy + maxR * 0.35, r: 2.5, angle: 2.2 },
        { x: cx + maxR * 0.15, y: cy + maxR * 0.25, r: 2, angle: 1.1 },
      ];
      blips.forEach((b) => {
        let diff = Math.abs((radarAngle % (Math.PI * 2)) - (b.angle + Math.PI * 2) % (Math.PI * 2));
        diff = Math.min(diff, Math.PI * 2 - diff);
        const opacity = Math.max(0.05, 1 - diff / (Math.PI * 2));
        ctx.fillStyle = `rgba(0, 229, 255, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particle network
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        ctx.fillStyle = "rgba(124, 58, 237, 0.35)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.2;
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <GlowPanel className="relative h-full w-full overflow-hidden" glow="primary" intensity="strong">
      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD overlays */}
      {/* Top center status */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-none">
        <GlowBadge color="purple" size="xs">
          MODE: NEURAL
        </GlowBadge>
        <GlowBadge color="cyan" size="xs" pulse>
          60 FPS
        </GlowBadge>
        <GlowBadge color="green" size="xs">
          TRACKING
        </GlowBadge>
      </div>

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            className="h-24 w-24 rounded-full border border-cyan-500/10"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner ring */}
          <motion.div
            className="absolute inset-3 rounded-full border border-purple-500/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          {/* Cross lines */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.4)]" />
        </div>
      </div>

      {/* Scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <motion.div
          className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent"
          animate={{ y: ["-100%", "100vh"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Corner frames */}
      {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => {
        const borderClasses: Record<string, string> = {
          "top-left": "top-4 left-4 border-t border-l",
          "top-right": "top-4 right-4 border-t border-r",
          "bottom-left": "bottom-4 left-4 border-b border-l",
          "bottom-right": "bottom-4 right-4 border-b border-r",
        };
        return (
          <motion.div
            key={pos}
            className={`absolute w-6 h-6 border-cyan-500/20 ${borderClasses[pos]}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
        );
      })}

      {/* Center content — standby message */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col items-center text-center"
        >
          {/* Animated camera icon */}
          <div className="relative mb-4">
            <motion.div
              className="h-20 w-20 rounded-full border border-white/[0.04] flex items-center justify-center"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Camera size={28} className="text-slate-500/60" />
            </motion.div>
            {/* Orbiting dot */}
            <motion.div
              className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-cyan-400/60"
              style={{ marginTop: -3, marginLeft: -3 }}
              animate={{
                x: [0, 40, 0, -40, 0],
                y: [-40, 0, 40, 0, -40],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-amber-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-slate-300">
              Awaiting Sensor Feed
            </span>
          </div>
          <p className="text-[8px] font-mono text-slate-600 max-w-[280px] leading-relaxed uppercase tracking-wider">
            AETHER vision system requires active camera input to initialize tracking overlays
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <Zap size={9} className="text-cyan-500" />
            <span className="text-[7px] font-mono text-cyan-400/60 uppercase tracking-widest">
              Vector engine ready
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom HUD labels */}
      <div className="absolute bottom-4 left-5 z-10 pointer-events-none">
        <div className="text-[7px] font-mono text-slate-500/60 uppercase tracking-wider">
          FILTER: <span className="text-cyan-400/60">NEURAL</span>
        </div>
        <div className="text-[7px] font-mono text-slate-500/60 uppercase tracking-wider">
          TARGET: <span className="text-purple-400/60">NONE</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-5 z-10 pointer-events-none">
        <div className="text-[7px] font-mono text-slate-500/60 uppercase tracking-wider text-right">
          RES: <span className="text-cyan-400/60">1920×1080</span>
        </div>
        <div className="text-[7px] font-mono text-slate-500/60 uppercase tracking-wider text-right">
          ENGINE: <span className="text-emerald-400/60">STANDBY</span>
        </div>
      </div>
    </GlowPanel>
  );
}
