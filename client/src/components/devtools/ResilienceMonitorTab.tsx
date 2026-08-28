import React from "react";
import { ShieldCheck, ShieldAlert, RefreshCw, Clock, ArrowRightLeft } from "lucide-react";
import type { ResilienceMetricsSnapshot } from "../../runtime/resilience/resilience-types";
import type { ProviderMonitorData } from "../../runtime/devtools/devtools-types";

interface Props {
  resilience?: ResilienceMetricsSnapshot | null;
  providers: ReadonlyArray<ProviderMonitorData>;
}

export const ResilienceMonitorTab: React.FC<Props> = ({ resilience, providers }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Resilience & Self-Healing Monitor</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time metrics for automatic retry loops, provider circuit breakers, timeout signals, and failover routing.
        </p>
      </div>

      {/* Resilience Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">Total Retries</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">{resilience?.totalRetries ?? 0}</div>
          <div className="text-[10px] text-amber-300 mt-1">
            {resilience?.successfulRetries ?? 0} recovered / {resilience?.failedRetries ?? 0} failed
          </div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Provider Failovers</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black text-purple-300 font-mono">{resilience?.totalFailovers ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Cascaded to secondary adapter</div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">Circuit Breaker Trips</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-300 font-mono">{resilience?.circuitBreakerTrips ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">FSM state transitions to OPEN</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Execution Timeouts</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-cyan-300 font-mono">{resilience?.totalTimeouts ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">AbortSignals triggered</div>
        </div>
      </div>

      {/* Provider Circuit Isolation Grid */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4" /> Provider Circuit Breaker Isolation Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {providers.map((p) => {
            const isClosed = p.circuitState === "CLOSED";
            const isOpen = p.circuitState === "OPEN";

            return (
              <div
                key={p.adapterId}
                className="p-4 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white">{p.vendor}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        isClosed
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : isOpen
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {p.circuitState}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.adapterId}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/[0.04] text-[10px] text-slate-400 flex justify-between">
                  <span>Failures: {p.failureCount}</span>
                  <span>Retries: {p.retryCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
