import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wifi,
  Camera,
  Mic,
  Cpu,
  Clock,
  Zap,
  Settings,
} from "lucide-react";
import GlowBadge from "../primitives/GlowBadge";
import AnimatedCounter from "../primitives/AnimatedCounter";
import { MOCK_SYSTEM } from "../../lib/mockData";

function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function TopBar() {
  const time = useTime();
  const [cpu, setCpu] = useState(MOCK_SYSTEM.cpu);

  // Simulate CPU fluctuation
  useEffect(() => {
    const id = setInterval(() => {
      setCpu((c) => Math.max(15, Math.min(75, c + (Math.random() - 0.5) * 8)));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-0 left-0 right-0 z-50 h-[56px] flex items-center justify-between px-6 border-b border-white/[0.04] bg-[rgba(4,7,16,0.8)] backdrop-blur-xl"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* Left: Brand + Status */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative h-7 w-7 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/20 border border-cyan-500/20" />
            <Zap size={13} className="text-cyan-300 relative z-10" />
          </div>
          <div>
            <h1 className="text-[13px] font-black tracking-[0.35em] text-gradient leading-none">
              AETHER
            </h1>
            <p className="text-[7px] font-semibold uppercase tracking-[0.4em] text-slate-500 leading-none mt-0.5">
              AI OS
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-white/[0.06]" />

        {/* Status badges */}
        <div className="flex items-center gap-3">
          <GlowBadge color="green" pulse size="xs">
            <Wifi size={9} /> CONNECTED
          </GlowBadge>
          <GlowBadge color="cyan" pulse size="xs">
            <Camera size={9} /> CAMERA
          </GlowBadge>
          <GlowBadge color="pink" size="xs">
            <Mic size={9} /> VOICE
          </GlowBadge>
          <GlowBadge color="purple" size="xs">
            NEURAL
          </GlowBadge>
        </div>
      </div>

      {/* Right: Metrics */}
      <div className="flex items-center gap-5">
        <MetricItem
          icon={<Cpu size={12} />}
          label="CPU"
          value={<AnimatedCounter value={cpu} suffix="%" decimals={0} duration={0.8} />}
          color="text-cyan-400"
        />
        <MetricItem
          icon={<Wifi size={12} />}
          label="PING"
          value={<AnimatedCounter value={MOCK_SYSTEM.network.latency} suffix="ms" decimals={0} />}
          color="text-emerald-400"
        />
        <MetricItem
          icon={<Clock size={12} />}
          label="TIME"
          value={
            <span className="tabular-nums">
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          }
          color="text-purple-400"
        />

        <button className="p-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200">
          <Settings size={14} />
        </button>
      </div>
    </motion.header>
  );
}

function MetricItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${color} opacity-60`}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-[7px] font-semibold uppercase tracking-[0.15em] text-slate-500 leading-none">
          {label}
        </span>
        <span className={`text-[11px] font-mono font-bold ${color} leading-none mt-0.5`}>
          {value}
        </span>
      </div>
    </div>
  );
}
