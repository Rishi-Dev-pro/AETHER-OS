import { useEffect, useState } from "react";
import {
  Camera,
  Cpu,
  Mic,
  ScanEye,
  Wifi,
  Clock3,
} from "lucide-react";
import { useCameraStore } from "../../store/cameraStore";
import { useVoiceStore } from "../../store/voiceStore";
import { useSystemStore } from "../../store/systemStore";
import { useVisionStore } from "../../store/visionStore";
import { useSocketStore } from "../../store/socketStore";

export default function TopBar() {
  const { isCameraEnabled } = useCameraStore();
  const { voiceStatus } = useVoiceStore();
  const { visionMode } = useVisionStore();
  const { cpu, latency, updateMetrics } = useSystemStore();
  const { socketConnected, latency: socketLatency } = useSocketStore();

  const [timeStr, setTimeStr] = useState("");

  // Clock update
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTimeStr(date.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Telemetry fluctuation loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate natural oscillations
      const cpuDelta = (Math.random() - 0.5) * 3;
      const latDelta = (Math.random() - 0.5) * 4;
      const memDelta = (Math.random() - 0.5) * 2;

      updateMetrics({
        cpu: Math.max(2, Math.min(99, Math.round(cpu + cpuDelta))),
        latency: Math.max(5, Math.min(150, Math.round(latency + latDelta))),
        memory: Math.max(380, Math.min(950, Math.round(420 + memDelta))),
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [cpu, latency, updateMetrics]);

  return (
    <header className="absolute top-0 left-0 right-0 z-50 h-16 shrink-0 px-8 border-b border-white/[0.06] bg-[#080a0f]/90 flex items-center justify-between shadow-lg">
      {/* Top glowing accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-85" />

      {/* Left */}
      <div className="flex items-center gap-8">
        <div className="relative group">
          <h1
            className="
            text-2xl
            font-black
            tracking-[0.3em]
            text-transparent
            bg-clip-text
            bg-gradient-to-r
            from-cyan-400
            via-teal-300
            to-cyan-400
            drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]
            cursor-default
            "
          >
            AETHER
          </h1>
          <p
            className="
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.45em]
            text-slate-400
            "
          >
            AI Operating System
          </p>
        </div>

        <div className="h-8 w-px bg-cyan-500/20" />

        <div className="flex items-center gap-5">
          <Status
            icon={<Wifi size={16} />}
            title="Connection"
            value={socketConnected ? "ONLINE" : "OFFLINE"}
            statusColor={socketConnected ? "green" : "red"}
            pulse={socketConnected}
          />

          <Status
            icon={<Camera size={16} />}
            title="Camera"
            value={isCameraEnabled ? "ACTIVE" : "READY"}
            statusColor={isCameraEnabled ? "cyan" : "slate"}
            pulse={isCameraEnabled}
          />

          <Status
            icon={<Mic size={16} />}
            title="Voice"
            value={voiceStatus}
            statusColor={voiceStatus === "LISTENING" ? "pink" : "cyan"}
            pulse={voiceStatus === "LISTENING"}
          />

          <Status
            icon={<ScanEye size={16} />}
            title="Vision Mode"
            value={visionMode.toUpperCase()}
            statusColor="cyan"
            pulse={isCameraEnabled}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-8">
        <Metric
          icon={<Cpu size={15} className="text-cyan-400 animate-pulse" />}
          label="CPU Core Load"
          value={`${cpu}%`}
        />

        <Metric
          icon={<Wifi size={15} className={socketConnected ? "text-emerald-400" : "text-rose-400"} />}
          label="Signal Latency"
          value={socketConnected && socketLatency !== null ? `${socketLatency}ms` : "OFFLINE"}
        />

        <Metric
          icon={<Clock3 size={15} className="text-purple-400" />}
          label="System Time"
          value={timeStr}
        />
      </div>
    </header>
  );
}

function Status({
  icon,
  title,
  value,
  statusColor,
  pulse = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  statusColor: "cyan" | "pink" | "slate" | "green" | "red";
  pulse?: boolean;
}) {
  const colorMap = {
    cyan: {
      border: "border-cyan-400/30",
      bg: "bg-cyan-500/10",
      text: "text-cyan-300",
      dot: "bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]",
    },
    pink: {
      border: "border-pink-500/30",
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      dot: "bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]",
    },
    slate: {
      border: "border-slate-500/20",
      bg: "bg-slate-500/5",
      text: "text-slate-400",
      dot: "bg-slate-500",
    },
    green: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]",
    },
    red: {
      border: "border-rose-500/30",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]",
    },
  };

  const currentColors = colorMap[statusColor];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
        flex
        h-9
        w-9
        items-center
        justify-center
        rounded-xl
        border
        ${currentColors.border}
        ${currentColors.bg}
        ${currentColors.text}
        transition-all
        duration-300
        `}
      >
        {icon}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 font-medium">
          {title}
        </p>
        <p className={`text-xs font-bold ${currentColors.text} flex items-center gap-1.5`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${currentColors.dot} ${pulse ? 'animate-ping' : ''}`} />
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-right">
      <div className="flex justify-end gap-1.5 items-center text-xs text-slate-400">
        {icon}
        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-black font-mono text-cyan-100 mt-0.5">
        {value}
      </p>
    </div>
  );
}