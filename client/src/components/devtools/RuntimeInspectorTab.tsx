import React from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Layers,
  Radio,
  Server,
  Wifi,
  WifiOff,
  Database,
} from "lucide-react";
import type { RuntimeInspectorData } from "../../runtime/devtools/devtools-types";

interface Props {
  data: RuntimeInspectorData;
  onRecover: () => void;
}

export const RuntimeInspectorTab: React.FC<Props> = ({ data, onRecover }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Runtime Health</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                data.health === "HEALTHY"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : data.health === "DEGRADED"
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              }`}
            />
            <span className="text-lg font-black tracking-wider text-white">{data.health}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Uptime: {data.uptimeSeconds}s</div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Active Engine</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-white truncate">{data.activeProvider}</div>
          <div className="text-[10px] text-purple-300 font-mono mt-1 truncate">{data.activeModel}</div>
        </div>

        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Queue State</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {data.queueLength} <span className="text-xs font-normal text-slate-400">tasks</span>
          </div>
          <div className="text-[10px] text-teal-300 mt-1">
            Status: {data.isProcessingQueue ? "PROCESSING" : "IDLE"}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-pink-500/20 bg-pink-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-pink-400">Network / State</span>
            {data.isOffline ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-sm font-bold ${data.isOffline ? "text-rose-400" : "text-emerald-400"}`}>
              {data.isOffline ? "OFFLINE (Fast-Fail)" : "ONLINE (Connected)"}
            </span>
          </div>
          <div className="text-[10px] text-pink-300 mt-1">
            Thinking: {data.isThinking ? "YES" : "NO"} | Stream: {data.isStreaming ? "YES" : "NO"}
          </div>
        </div>
      </div>

      {/* Detailed Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 mb-4">
            <Server className="w-4 h-4" /> Core Runtime Identity & Status
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Runtime Container</span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Singleton Active (v1.0.0)
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Runtime Lifecycle Status</span>
              <span className="text-cyan-300 font-mono font-bold">{data.runtimeStatus}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Active Session ID</span>
              <span className="text-purple-300 font-mono font-semibold truncate max-w-[200px]">
                {data.activeSessionId}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Active Session Title</span>
              <span className="text-white font-medium">{data.activeSessionTitle}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Total Conversations</span>
              <span className="text-slate-200 font-bold">{data.totalSessions} sessions</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4" /> Live Execution & Latency Telemetry
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Turn Message Count</span>
              <span className="text-white font-bold">{data.totalMessages} turns</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Average Response Latency</span>
              <span className="text-cyan-300 font-mono font-bold">{data.lastLatencyMs}ms</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Context Budgeting & Pruning</span>
              <span className="text-emerald-400 font-mono font-semibold">Enabled (Max 4096 tokens)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Persistence Store</span>
              <span className="text-purple-300 font-mono font-semibold flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> IndexedDB (v1.0.0)
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Self-Healing Recovery</span>
              <button
                onClick={onRecover}
                className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 rounded text-[11px] font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:scale-105"
              >
                Trigger Runtime Recover()
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
