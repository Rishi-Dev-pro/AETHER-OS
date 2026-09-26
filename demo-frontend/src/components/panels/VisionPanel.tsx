import { motion } from "framer-motion";
import { Eye, Scan, Fingerprint, Hand } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import SectionHeader from "../primitives/SectionHeader";
import GlowBadge from "../primitives/GlowBadge";
import { MOCK_VISION } from "../../lib/mockData";

interface DataRowProps {
  label: string;
  value: string | number;
  active?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

function DataRow({ label, value, active = false, delay = 0 }: DataRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.025] transition-all duration-200"
    >
      <span className="text-[10px] font-sans text-slate-400 truncate">{label}</span>
      <span
        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded tabular-nums ${
          active
            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            : "text-slate-500"
        }`}
      >
        {value}
      </span>
    </motion.div>
  );
}

export default function VisionPanel() {
  const face = MOCK_VISION.primaryFace;

  return (
    <GlassPanel glow="secondary" className="w-[240px] p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader label="Neural Vision" className="mb-0 flex-1" />
        <GlowBadge color="cyan" pulse size="xs">
          <Eye size={8} /> LIVE
        </GlowBadge>
      </div>

      {/* Detection counts */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Faces", value: MOCK_VISION.faces, icon: <Fingerprint size={12} />, color: "cyan" },
          { label: "Hands", value: MOCK_VISION.hands, icon: <Hand size={12} />, color: "pink" },
          { label: "Objects", value: MOCK_VISION.objects, icon: <Scan size={12} />, color: "purple" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex flex-col items-center p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.03] hover:bg-white/[0.03] transition-all"
          >
            <span className={`text-${item.color}-400 mb-1 opacity-60`}>{item.icon}</span>
            <span className="text-[14px] font-mono font-bold text-slate-200 tabular-nums">
              {item.value}
            </span>
            <span className="text-[7px] font-mono uppercase tracking-wider text-slate-500">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Face details */}
      <DataRow label="Blink" value={face.blink ? "DETECTED" : "Open"} active={face.blink} delay={0} />
      <DataRow label="Smile" value={`${Math.round(face.smile * 100)}%`} active={face.smile > 0.5} delay={1} />
      <DataRow label="Looking" value={face.looking.toUpperCase()} active={face.looking !== "center"} delay={2} />
      <DataRow label="Head Yaw" value={`${face.headYaw}°`} delay={3} />
      <DataRow label="Eye Open" value={`L:${Math.round(face.eyeOpenness.left * 100)}% R:${Math.round(face.eyeOpenness.right * 100)}%`} delay={4} />

      {/* Pipeline */}
      <div className="mt-3 pt-3 border-t border-white/[0.04]">
        <div className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          Pipeline Latency
        </div>
        <div className="space-y-1">
          {MOCK_VISION.pipeline.map((step, i) => (
            <motion.div
              key={step.stage}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-[8px] font-mono text-slate-500 w-12 shrink-0 truncate">
                {step.stage}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.03] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-purple-500/60"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (step.ms / 15) * 100)}%` }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                />
              </div>
              <span className="text-[8px] font-mono text-slate-400 tabular-nums w-8 text-right">
                {step.ms}ms
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
