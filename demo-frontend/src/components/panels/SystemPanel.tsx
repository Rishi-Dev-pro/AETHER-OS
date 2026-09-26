import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Activity, Thermometer, Server, Cpu, HardDrive } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import SectionHeader from "../primitives/SectionHeader";
import AnimatedCounter from "../primitives/AnimatedCounter";
import { MOCK_SYSTEM } from "../../lib/mockData";

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  delay?: number;
}

function MetricRow({ icon, label, value, max, unit, color, delay = 0 }: MetricRowProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.025] hover:bg-white/[0.03] transition-all duration-200 group"
    >
      <div
        className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors duration-300 ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-200 tabular-nums">
            <AnimatedCounter value={current} suffix={unit} duration={0.8} />
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(current / max) * 100}%` }}
            transition={{ delay: delay / 1000, duration: 1, ease: "easeOut" }}
            style={{
              background:
                current / max > 0.8
                  ? "linear-gradient(90deg, #f87171, #ef4444)"
                  : current / max > 0.5
                  ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                  : "linear-gradient(90deg, #00e5ff, #7c3aed)",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function SystemPanel() {
  const [cpu, setCpu] = useState(MOCK_SYSTEM.cpu);
  const [mem, setMem] = useState(MOCK_SYSTEM.memory);
  const [temp, setTemp] = useState(MOCK_SYSTEM.temperature);

  useEffect(() => {
    const id = setInterval(() => {
      setCpu((c) => Math.max(10, Math.min(85, c + (Math.random() - 0.5) * 10)));
      setMem((m) => Math.max(30, Math.min(90, m + (Math.random() - 0.5) * 5)));
      setTemp((t) => Math.max(35, Math.min(70, t + (Math.random() - 0.5) * 3)));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <GlassPanel glow="primary" className="w-[240px] p-4">
      <SectionHeader label="System Core" tag={`v${MOCK_SYSTEM.osVersion}`} />

      <div className="space-y-2">
        <MetricRow
          icon={<Cpu size={14} className="text-cyan-400" />}
          label="CPU Load"
          value={cpu}
          max={100}
          unit="%"
          color="border-cyan-500/15 bg-cyan-500/5 text-cyan-400"
          delay={100}
        />
        <MetricRow
          icon={<HardDrive size={14} className="text-purple-400" />}
          label="Memory"
          value={mem}
          max={100}
          unit="%"
          color="border-purple-500/15 bg-purple-500/5 text-purple-400"
          delay={200}
        />
        <MetricRow
          icon={<Thermometer size={14} className="text-amber-400" />}
          label="Temperature"
          value={temp}
          max={100}
          unit="°C"
          color="border-amber-500/15 bg-amber-500/5 text-amber-400"
          delay={300}
        />
        <MetricRow
          icon={<Server size={14} className="text-emerald-400" />}
          label="Processes"
          value={MOCK_SYSTEM.processes}
          max={500}
          unit=""
          color="border-emerald-500/15 bg-emerald-500/5 text-emerald-400"
          delay={400}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-mono">
          <Shield size={9} className="text-emerald-500" />
          STATUS: <span className="text-emerald-400 font-semibold">SECURE</span>
        </div>
        <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-mono">
          <Activity size={9} className="text-cyan-500 animate-pulse" />
          UPTIME: {Math.floor(MOCK_SYSTEM.uptime / 3600)}h
        </div>
      </div>
    </GlassPanel>
  );
}
