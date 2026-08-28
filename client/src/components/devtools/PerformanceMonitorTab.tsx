import React from "react";
import { Activity, Clock, CheckCircle2, XCircle, Zap } from "lucide-react";
import type { RuntimeDiagnosticsMetricsSnapshot } from "../../runtime/conversation/conversation-types";
import type { ResilienceMetricsSnapshot } from "../../runtime/resilience/resilience-types";

interface Props {
  diagnostics?: RuntimeDiagnosticsMetricsSnapshot;
  resilience?: ResilienceMetricsSnapshot | null;
}

export const PerformanceMonitorTab: React.FC<Props> = ({ diagnostics, resilience }) => {
  const total = diagnostics?.totalRequests ?? 0;
  const success = diagnostics?.successfulRequests ?? 0;
  const failed = diagnostics?.failedRequests ?? 0;
  const avgLatency = diagnostics?.averageLatencyMs ?? 0;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Runtime Latency & Performance</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          End-to-end execution throughput, network round-trip latency, and request resolution telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Average Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">{avgLatency}ms</div>
          <div className="text-[10px] text-slate-400 mt-1">End-to-end turn resolution</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Success Ratio</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-300 font-mono">{successRate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">{success} completed / {total} total</div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Streaming Protocols</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black text-purple-300 font-mono">SSE Active</div>
          <div className="text-[10px] text-slate-400 mt-1">Chunked token pipeline</div>
        </div>

        <div className="p-4 rounded-xl border border-pink-500/20 bg-pink-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-pink-400">Failed / Rejections</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-xl font-black text-rose-300 font-mono">{failed}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {resilience?.offlineRejections ?? 0} offline drops
          </div>
        </div>
      </div>

      {/* Latency Benchmarks */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4" /> Latency Telemetry Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-slate-400 mb-1">Estimated Min Latency</div>
            <div className="text-lg font-bold text-emerald-400">~180ms</div>
            <div className="text-[10px] text-slate-500 mt-1">Groq LPU Acceleration</div>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-slate-400 mb-1">Average Turn Latency</div>
            <div className="text-lg font-bold text-cyan-300">{avgLatency}ms</div>
            <div className="text-[10px] text-slate-500 mt-1">Including streaming initial TTFT</div>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04]">
            <div className="text-slate-400 mb-1">Max Execution Timeout</div>
            <div className="text-lg font-bold text-purple-300">15,000ms</div>
            <div className="text-[10px] text-slate-500 mt-1">Unary deadline (30s streaming)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
