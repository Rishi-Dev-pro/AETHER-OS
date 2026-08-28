import React from "react";
import { DollarSign, Layers, Zap, PieChart, TrendingUp } from "lucide-react";
import type { RuntimeDiagnosticsMetricsSnapshot } from "../../runtime/conversation/conversation-types";
import type { SessionMetadata } from "../../runtime/conversation/session-types";

interface Props {
  diagnostics?: RuntimeDiagnosticsMetricsSnapshot;
  activeSession?: SessionMetadata;
}

export const TokenUsageTab: React.FC<Props> = ({ diagnostics, activeSession }) => {
  const promptTokens = diagnostics?.totalPromptTokens ?? 0;
  const completionTokens = diagnostics?.totalCompletionTokens ?? 0;
  const totalTokens = diagnostics?.totalTokens ?? (promptTokens + completionTokens);
  const totalCostUSD = diagnostics?.estimatedTotalCostUSD ?? 0;

  const sessionTokens = activeSession?.tokenUsage?.totalTokens ?? 0;
  const sessionCost = activeSession?.tokenUsage?.estimatedCostUSD ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Token & Cost Telemetry</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time token utilization and cost estimation calculated directly from runtime provider usage metrics.
          </p>
        </div>
      </div>

      {/* Global Runtime Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Total Prompt Tokens</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">{promptTokens.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Ingested context</div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Completion Tokens</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black text-purple-300 font-mono">
            {completionTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Generated output</div>
        </div>

        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Total Aggregated</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl font-black text-teal-300 font-mono">{totalTokens.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-1">Global runtime session</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Estimated Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-300 font-mono">
            ${totalCostUSD.toFixed(6)} <span className="text-xs font-normal text-slate-400">USD</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Calculated per model rates</div>
        </div>
      </div>

      {/* Breakdown Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4" /> Active Session Token Budget
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Session Prompt Tokens</span>
              <span className="text-white font-mono font-bold">
                {activeSession?.tokenUsage?.promptTokens ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Session Completion Tokens</span>
              <span className="text-purple-300 font-mono font-bold">
                {activeSession?.tokenUsage?.completionTokens ?? 0}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/[0.04]">
              <span className="text-slate-400">Session Total Tokens</span>
              <span className="text-cyan-300 font-mono font-bold">{sessionTokens}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Session Estimated Cost</span>
              <span className="text-emerald-300 font-mono font-bold">${sessionCost.toFixed(6)} USD</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" /> Token Optimization & Pruning Rules
          </h3>
          <div className="space-y-3 text-xs text-slate-300 font-mono leading-relaxed">
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
              <div className="text-cyan-400 font-bold mb-1">Max Context Budget: 4,096 Tokens</div>
              <div className="text-[11px] text-slate-400">
                Turns exceeding threshold are pruned using FIFO linear decay, pinning the system prompt and latest 4 conversational turns.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
              <div className="text-emerald-400 font-bold mb-1">Zero Mock Billing Guarantee</div>
              <div className="text-[11px] text-slate-400">
                Usage calculations strictly mirror canonical provider usage payloads received over HTTP responses.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
