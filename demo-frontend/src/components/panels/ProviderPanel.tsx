import { motion } from "framer-motion";
import { Server, Zap, AlertTriangle } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import SectionHeader from "../primitives/SectionHeader";
import GlowBadge from "../primitives/GlowBadge";
import { MOCK_PROVIDERS } from "../../lib/mockData";

export default function ProviderPanel() {
  return (
    <GlassPanel glow="primary" className="w-[260px] p-4">
      <SectionHeader label="AI Providers" tag="NEURAL NET" />

      <div className="space-y-2">
        {MOCK_PROVIDERS.map((provider, i) => (
          <motion.div
            key={provider.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
              provider.status === "active"
                ? "bg-cyan-500/[0.04] border-cyan-500/15 hover:bg-cyan-500/[0.07]"
                : provider.status === "error"
                ? "bg-red-500/[0.03] border-red-500/10 hover:bg-red-500/[0.06]"
                : "bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-8 w-8 flex items-center justify-center rounded-lg border shrink-0 ${
                  provider.status === "active"
                    ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                    : provider.status === "error"
                    ? "border-red-500/20 bg-red-500/10 text-red-400"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-500"
                }`}
              >
                {provider.status === "error" ? (
                  <AlertTriangle size={14} />
                ) : (
                  <Server size={14} />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-200 truncate">
                  {provider.name}
                </div>
                <div className="text-[8px] font-mono text-slate-500 truncate">
                  {provider.model}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {provider.status === "active" && provider.latency > 0 && (
                <span className="text-[9px] font-mono text-cyan-400/80 tabular-nums">
                  {provider.latency}ms
                </span>
              )}
              <GlowBadge
                color={
                  provider.status === "active"
                    ? "green"
                    : provider.status === "error"
                    ? "cyan"
                    : "slate"
                }
                pulse={provider.status === "active"}
                size="xs"
              >
                {provider.status === "active" ? (
                  <><Zap size={7} /> ACTIVE</>
                ) : provider.status === "error" ? (
                  "ERROR"
                ) : (
                  "STANDBY"
                )}
              </GlowBadge>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}
