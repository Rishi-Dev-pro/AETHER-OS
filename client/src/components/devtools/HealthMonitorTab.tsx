import React from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import type { RuntimeHealthReport } from "../../runtime/devtools/devtools-types";

interface Props {
  report: RuntimeHealthReport;
}

export const HealthMonitorTab: React.FC<Props> = ({ report }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">AETHER System Health Matrix</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic rule-based health evaluator verifying core subsystem stability, network connectivity, and provider health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Health Index</div>
            <div className="text-lg font-black text-cyan-300 font-mono">{report.scorePercent}%</div>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 border ${
              report.status === "HEALTHY"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                : report.status === "DEGRADED"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
            }`}
          >
            <Activity className="w-4 h-4" />
            {report.status}
          </span>
        </div>
      </div>

      {/* Health Evaluation Checks */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Subsystem Integrity Checks
        </h3>

        <div className="space-y-3">
          {report.checks.map((check) => {
            const isPass = check.status === "PASS";
            const isWarn = check.status === "WARN";

            return (
              <div
                key={check.name}
                className="p-3.5 rounded-xl border border-white/[0.04] bg-black/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <div>
                    <span className="font-bold text-white tracking-wide">{check.name}</span>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{check.details}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    isPass
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : isWarn
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {check.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Rules Explanation */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl text-xs text-slate-300 font-mono">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider mb-2">Deterministic Health Rules:</h3>
        <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
          <li>
            <strong className="text-emerald-300">HEALTHY:</strong> Online, core runtime singleton active, zero open circuit breakers, low queue backlog.
          </li>
          <li>
            <strong className="text-amber-300">DEGRADED:</strong> At least one provider circuit breaker is OPEN or failover cascade was triggered.
          </li>
          <li>
            <strong className="text-rose-300">OFFLINE:</strong> Browser network interface disconnected; runtime operating in fast-fail mode.
          </li>
          <li>
            <strong className="text-cyan-300">RECOVERING:</strong> Active self-healing recovery routine executing.
          </li>
        </ul>
      </div>
    </div>
  );
};
