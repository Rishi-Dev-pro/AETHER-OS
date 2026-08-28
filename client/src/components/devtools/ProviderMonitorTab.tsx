import React from "react";
import { ShieldCheck, ShieldAlert, Cpu } from "lucide-react";
import type { ProviderMonitorData } from "../../runtime/devtools/devtools-types";

interface Props {
  providers: ReadonlyArray<ProviderMonitorData>;
}

export const ProviderMonitorTab: React.FC<Props> = ({ providers }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Provider & Adapter Matrix</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Observability across primary (Groq) and fallback adapters (NVIDIA, OpenAI, Ollama). Zero credential exposure.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400" /> CLOSED (Healthy)
          <span className="w-2 h-2 rounded-full bg-amber-400 ml-2" /> HALF_OPEN (Probe)
          <span className="w-2 h-2 rounded-full bg-rose-400 ml-2" /> OPEN (Isolated)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isCircuitOpen = p.circuitState === "OPEN";
          const isCircuitHalf = p.circuitState === "HALF_OPEN";

          return (
            <div
              key={p.adapterId}
              className={`p-5 rounded-2xl border transition-all ${
                p.isActive
                  ? "border-cyan-500/50 bg-[#0c1220]/90 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  : "border-white/[0.08] bg-[#07090f]/70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black tracking-wide text-white">{p.vendor}</span>
                    {p.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        ACTIVE PRIMARY
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.adapterId}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1 border ${
                      isCircuitOpen
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : isCircuitHalf
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    {isCircuitOpen ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    CIRCUIT: {p.circuitState}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-center">
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Requests</div>
                  <div className="text-sm font-bold text-white mt-0.5">{p.requestCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Retries</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">{p.retryCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Failovers</div>
                  <div className="text-sm font-bold text-purple-300 mt-0.5">{p.failoverCount}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.02]">
                  <div className="text-[10px] text-slate-400">Latency</div>
                  <div className="text-sm font-bold text-cyan-300 mt-0.5">{p.averageLatencyMs}ms</div>
                </div>
              </div>

              {/* Supported Models List */}
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> Supported Models Catalog
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.supportedModels.map((m) => (
                    <span
                      key={m}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        m === p.currentModel
                          ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/40 font-bold"
                          : "bg-white/[0.03] text-slate-400 border-white/[0.05]"
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
