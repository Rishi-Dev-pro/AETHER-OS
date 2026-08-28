import React, { useState } from "react";
import { Trash2, Search, Download } from "lucide-react";
import type { DebugLogEntry } from "../../runtime/devtools/devtools-types";

interface Props {
  logs: ReadonlyArray<DebugLogEntry>;
  onClear: () => void;
}

export const DebugConsoleTab: React.FC<Props> = ({ logs, onClear }) => {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredLogs = logs.filter((log) => {
    if (severityFilter !== "ALL" && log.level !== severityFilter) {
      return false;
    }
    if (categoryFilter !== "ALL" && log.category !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.category.toLowerCase().includes(q) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aether-runtime-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Console Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Severity Filters */}
          <div className="flex items-center gap-1">
            {["ALL", "INFO", "SUCCESS", "WARN", "ERROR"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSeverityFilter(lvl)}
                className={`px-2 py-1 rounded text-[10px] font-bold font-mono transition-all ${
                  severityFilter === lvl
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/[0.1]" />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1 rounded bg-black/60 border border-white/[0.1] text-[10px] text-slate-300 font-mono focus:outline-none"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="RUNTIME">RUNTIME</option>
            <option value="PROVIDER">PROVIDER</option>
            <option value="STREAMING">STREAMING</option>
            <option value="RESILIENCE">RESILIENCE</option>
            <option value="SESSION">SESSION</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search console logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            onClick={exportLogs}
            title="Export Logs JSON"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            title="Clear Console"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#030407]/95 backdrop-blur-xl font-mono text-xs max-h-[560px] overflow-y-auto space-y-1.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-600">Console buffer empty.</div>
        ) : (
          filteredLogs.map((log) => {
            const levelClass = {
              INFO: "text-cyan-300",
              SUCCESS: "text-emerald-400",
              WARN: "text-amber-400",
              ERROR: "text-rose-400 font-bold",
              DEBUG: "text-slate-400",
            }[log.level];

            return (
              <div key={log.id} className="flex items-start gap-2 hover:bg-white/[0.02] py-0.5 px-1 rounded">
                <span className="text-[10px] text-slate-500 shrink-0">[{log.timeFormatted}]</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                    log.level === "ERROR"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : log.level === "WARN"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : log.level === "SUCCESS"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-[10px] text-purple-400 shrink-0">[{log.category}]</span>
                <span className={`text-[11px] ${levelClass} break-all`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
