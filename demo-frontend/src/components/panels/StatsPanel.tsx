import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Activity, Gauge, HardDrive, Wifi, Binary } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import SectionHeader from "../primitives/SectionHeader";
import AnimatedCounter from "../primitives/AnimatedCounter";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  decimals?: number;
  color: string;
  bg: string;
  delay: number;
}

function StatCard({ icon, label, value, suffix, decimals = 0, color, bg, delay }: StatCardProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // Simulate fluctuation
  useEffect(() => {
    if (label === "FPS") {
      const id = setInterval(() => {
        setCurrent((v) => Math.max(45, Math.min(62, v + (Math.random() - 0.5) * 4)));
      }, 1500);
      return () => clearInterval(id);
    }
  }, [label]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.001, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.03, y: -1 }}
      className={`relative p-3 rounded-xl border border-white/[0.03] ${bg} transition-all duration-300 overflow-hidden group cursor-default`}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`${color} opacity-50`}>{icon}</span>
          <span className="text-[7px] font-mono uppercase tracking-wider text-slate-600">
            {label}
          </span>
        </div>
        <div className={`text-[16px] font-mono font-black ${color} tabular-nums`}>
          <AnimatedCounter value={current} suffix={suffix} decimals={decimals} duration={0.6} />
        </div>
      </div>
    </motion.div>
  );
}

export default function StatsPanel() {
  return (
    <GlassPanel glow="primary" className="w-[240px] p-4">
      <SectionHeader label="Performance" tag="DIAG" />

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Gauge size={11} />}
          label="FPS"
          value={58}
          suffix=""
          color="text-cyan-300"
          bg="bg-white/[0.01]"
          delay={100}
        />
        <StatCard
          icon={<Wifi size={11} />}
          label="LATENCY"
          value={12}
          suffix="ms"
          color="text-emerald-300"
          bg="bg-white/[0.01]"
          delay={150}
        />
        <StatCard
          icon={<Activity size={11} />}
          label="CPU"
          value={34}
          suffix="%"
          color="text-purple-300"
          bg="bg-white/[0.01]"
          delay={200}
        />
        <StatCard
          icon={<HardDrive size={11} />}
          label="RAM"
          value={62}
          suffix="%"
          color="text-amber-300"
          bg="bg-white/[0.01]"
          delay={250}
        />
        <StatCard
          icon={<Zap size={11} />}
          label="GPU"
          value={48}
          suffix="%"
          color="text-pink-300"
          bg="bg-white/[0.01]"
          delay={300}
        />
        <StatCard
          icon={<Binary size={11} />}
          label="THREADS"
          value={1847}
          suffix=""
          color="text-slate-300"
          bg="bg-white/[0.01]"
          delay={350}
        />
      </div>
    </GlassPanel>
  );
}
