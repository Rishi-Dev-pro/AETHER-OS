import { useSystemStore } from "../../store/systemStore";
import { useEffect, useState } from "react";

export default function StatsWidget() {
  const cpu = useSystemStore((state) => state.cpu);
  const latency = useSystemStore((state) => state.latency);
  const memory = useSystemStore((state) => state.memory);
  const [fps, setFps] = useState(60);

  // Measure dynamic FPS locally
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let animationFrameId: number;

    const calculateFps = () => {
      const now = performance.now();
      frames++;
      if (now >= lastTime + 1000) {
        setFps(Math.min(60, Math.round((frames * 1000) / (now - lastTime))));
        frames = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(calculateFps);
    };

    animationFrameId = requestAnimationFrame(calculateFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      className="
      w-[220px]
      xl:w-[260px]
      rounded-2xl
      border
      border-white/[0.05]
      bg-[#07090f]/75
      backdrop-blur-2xl
      p-5
      shadow-[0_12px_40px_rgba(0,0,0,0.6)]
      transition-all
      duration-300
      hover:border-white/[0.1]
      hover:bg-[#07090f]/80
      "
    >
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2 select-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-2">
          OS PERFORMANCE
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase shrink-0">
          DIAG
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono">
        <Metric value={fps.toString()} label="FPS" />
        <Metric value={`${latency}ms`} label="LATENCY" />
        <Metric value={`${cpu}%`} label="CPU" />
        <Metric value={`${memory}MB`} label="RAM" />
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      className="
      rounded-xl
      border
      border-white/[0.02]
      bg-white/[0.01]
      hover:bg-white/[0.03]
      p-2.5
      text-center
      transition-all
      duration-250
      min-w-0
      "
    >
      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500 font-mono font-semibold truncate leading-none">
        {label}
      </p>
      <p className="mt-1.5 text-[13px] font-bold text-slate-200 tracking-wide font-mono truncate leading-none">
        {value}
      </p>
    </div>
  );
}