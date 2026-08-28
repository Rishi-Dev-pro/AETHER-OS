import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, DollarSign, Layers } from "lucide-react";
import type { ExecutionTraceDetail } from "../../runtime/devtools/devtools-types";

interface Props {
  traces: ReadonlyArray<ExecutionTraceDetail>;
}

export const ExecutionTraceTab: React.FC<Props> = ({ traces }) => {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(
    traces.length > 0 ? traces[0].executionId : null
  );

  const activeTrace = traces.find((t) => t.executionId === selectedTraceId) || traces[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: Traces List */}
      <div className="md:col-span-1 space-y-2 max-h-[580px] overflow-y-auto pr-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Execution History ({traces.length})
        </h3>
        {traces.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs font-mono">No execution turns recorded yet.</div>
        ) : (
          traces.map((trace) => {
            const isSelected = activeTrace?.executionId === trace.executionId;
            const isSuccess = trace.status === "COMPLETED";

            return (
              <div
                key={trace.executionId}
                onClick={() => setSelectedTraceId(trace.executionId)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "border-white/[0.06] bg-[#07090f]/70 hover:bg-[#0c1220]"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-white flex items-center gap-1.5">
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {trace.executionId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(trace.startedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate font-mono">{trace.userPromptSnippet}</div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-mono">
                  <span>{trace.providerId}</span>
                  <span>•</span>
                  <span>{trace.durationMs}ms</span>
                  <span>•</span>
                  <span className="text-purple-300">{trace.totalTokens} tok</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Right: Active Trace Deep Dive */}
      <div className="md:col-span-2 p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/90 backdrop-blur-xl">
        {!activeTrace ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">Select an execution trace to inspect.</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">Execution Deep Dive</span>
                <h2 className="text-base font-black text-white font-mono mt-0.5">{activeTrace.executionId}</h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${
                  activeTrace.status === "COMPLETED"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}
              >
                {activeTrace.status}
              </span>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> Duration
                </div>
                <div className="text-sm font-bold text-white mt-1">{activeTrace.durationMs}ms</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Layers className="w-3 h-3 text-purple-400" /> Prompt Tokens
                </div>
                <div className="text-sm font-bold text-purple-300 mt-1">{activeTrace.promptTokens}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Layers className="w-3 h-3 text-teal-400" /> Completion
                </div>
                <div className="text-sm font-bold text-teal-300 mt-1">{activeTrace.completionTokens}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-400" /> Est. Cost
                </div>
                <div className="text-sm font-bold text-emerald-300 mt-1">${activeTrace.estimatedCostUSD}</div>
              </div>
            </div>

            {/* Provider & Model Specs */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Resolved Provider:</span>
                <span className="text-cyan-300 font-bold">{activeTrace.providerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Resolved Model:</span>
                <span className="text-white font-bold">{activeTrace.modelId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Streaming Protocol:</span>
                <span className="text-emerald-400 font-bold">SSE (Server-Sent Events)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retries / Failovers:</span>
                <span className="text-slate-200">
                  {activeTrace.retries} retries / {activeTrace.failovers} failovers
                </span>
              </div>
            </div>

            {/* Message Payloads */}
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1">User Prompt Snippet</div>
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-200 font-mono">
                  {activeTrace.userPromptSnippet}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-1">Assistant Response Snippet</div>
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-slate-200 font-mono max-h-[140px] overflow-y-auto">
                  {activeTrace.assistantSnippet || (activeTrace.error ? `Error: ${activeTrace.error}` : "No response generated.")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
