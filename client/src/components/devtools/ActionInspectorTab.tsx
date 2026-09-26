/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 5 Component: DevTools Tab 12 (`ActionInspectorTab.tsx`)
 *
 * @file ActionInspectorTab.tsx
 * @description Comprehensive DevTools inspector tab monitoring desktop automation actions,
 * live execution telemetry, parameter payloads, success/failure states, and interactive dispatch triggers.
 */

import React, { useState, useMemo } from "react";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  ExternalLink,
  Search,
  Globe,
  Volume2,
  VolumeX,
  Lock,
  Cpu,
  Camera,
  MousePointer,
  Type,
  Play,
  Copy,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { useActionStore } from "../../store/actionStore";
import { desktopActionDispatcher } from "../../services/desktopActionDispatcher";
import type { DesktopActionType, ActionHistoryEntry } from "../../types/desktopAction";

const ACTION_ICONS: Record<DesktopActionType, React.ReactNode> = {
  open_app: <ExternalLink className="w-3.5 h-3.5" />,
  close_app: <X className="w-3.5 h-3.5" />,
  search_web: <Search className="w-3.5 h-3.5" />,
  open_url: <Globe className="w-3.5 h-3.5" />,
  navigate: <Globe className="w-3.5 h-3.5" />,
  adjust_volume: <Volume2 className="w-3.5 h-3.5" />,
  mute_volume: <VolumeX className="w-3.5 h-3.5" />,
  unmute_volume: <Volume2 className="w-3.5 h-3.5" />,
  lock_workstation: <Lock className="w-3.5 h-3.5" />,
  lock_screen: <Lock className="w-3.5 h-3.5" />,
  get_system_info: <Cpu className="w-3.5 h-3.5" />,
  take_screenshot: <Camera className="w-3.5 h-3.5" />,
  click_target: <MousePointer className="w-3.5 h-3.5" />,
  type_text: <Type className="w-3.5 h-3.5" />,
};

export const ActionInspectorTab: React.FC = () => {
  const history = useActionStore((state) => state.history);
  const activeAction = useActionStore((state) => state.activeAction);
  const isExecuting = useActionStore((state) => state.isExecuting);
  const clearHistory = useActionStore((state) => state.clearHistory);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTestDispatching, setIsTestDispatching] = useState<boolean>(false);

  // Computed KPIs
  const totalActions = history.length;
  const completedEntries = useMemo(
    () => history.filter((h) => h.status !== "pending" && h.result !== undefined),
    [history]
  );
  const successCount = useMemo(
    () => completedEntries.filter((h) => h.status === "success").length,
    [completedEntries]
  );
  const successRate = completedEntries.length > 0
    ? Math.round((successCount / completedEntries.length) * 100)
    : 100;

  const averageLatency = useMemo(() => {
    if (completedEntries.length === 0) return 0;
    const totalMs = completedEntries.reduce(
      (sum, h) => sum + (h.result?.durationMs ?? 0),
      0
    );
    return Math.round(totalMs / completedEntries.length);
  }, [completedEntries]);

  // Filtered entries
  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      if (statusFilter !== "ALL" && entry.status !== statusFilter.toLowerCase()) {
        return false;
      }
      if (typeFilter !== "ALL" && entry.request.type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const actionId = entry.request.actionId.toLowerCase();
        const type = entry.request.type.toLowerCase();
        const params = JSON.stringify(entry.request.params || {}).toLowerCase();
        const target = (entry.request.target || "").toLowerCase();
        const message = (entry.result?.message || "").toLowerCase();
        if (
          !actionId.includes(query) &&
          !type.includes(query) &&
          !params.includes(query) &&
          !target.includes(query) &&
          !message.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [history, statusFilter, typeFilter, searchQuery]);

  const handleCopyJson = async (entry: ActionHistoryEntry) => {
    if (!navigator?.clipboard?.writeText) {
      return;
    }
    try {
      const jsonStr = JSON.stringify(entry, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopiedId(entry.request.actionId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard write failure without showing "Copied!" or unhandled rejection
    }
  };

  const triggerTestAction = async (
    type: DesktopActionType,
    params: Record<string, unknown>,
    target?: string
  ) => {
    setIsTestDispatching(true);
    try {
      await desktopActionDispatcher.dispatch(
        { type, params, target },
        { speakConfirmation: true }
      );
    } catch {
      // Errors are already tracked in useActionStore
    } finally {
      setIsTestDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Desktop Action Inspector
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              Tab 12 (Phase 10)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inspection of OS automation actions, command execution telemetry, parameters, and results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border flex items-center gap-1.5 ${
              isExecuting
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40 animate-pulse"
                : "bg-slate-500/20 text-slate-300 border-slate-500/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isExecuting ? "bg-cyan-400 animate-ping" : "bg-slate-400"
              }`}
            />
            STATUS: {isExecuting ? "ACTION EXECUTING" : "IDLE"}
          </span>

          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
              Total Dispatched
            </span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">{totalActions}</div>
          <div className="text-[10px] text-slate-400 mt-1">Actions across session</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              Success Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300 font-mono">
            {successRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {successCount} of {completedEntries.length} succeeded
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">
              Average Latency
            </span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-teal-300 font-mono">
            {averageLatency} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Roundtrip execution time</div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">
              Active In-Flight
            </span>
            <Play className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-base font-bold text-purple-300 font-mono truncate">
            {activeAction ? activeAction.type : "None"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isExecuting ? "Executing on host OS" : "Ready for next trigger"}
          </div>
        </div>
      </div>

      {/* Interactive Quick Dispatch Test Bench */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#070a12]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Quick Test Bench Triggers
          </span>
          <span className="text-[10px] text-slate-400">
            Manual simulation via desktopActionDispatcher
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={isExecuting || isTestDispatching}
            onClick={() => triggerTestAction("get_system_info", {})}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Get System Info
          </button>
          <button
            disabled={isExecuting || isTestDispatching}
            onClick={() => triggerTestAction("adjust_volume", { direction: "up", percent: 5 })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Volume Up (+5%)
          </button>
          <button
            disabled={isExecuting || isTestDispatching}
            onClick={() => triggerTestAction("adjust_volume", { direction: "down", percent: 5 })}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Volume Down (-5%)
          </button>
          <button
            disabled={isExecuting || isTestDispatching}
            onClick={() => triggerTestAction("search_web", { query: "AETHER OS Quantum AI", engine: "google" }, "AETHER OS Quantum AI")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            Search Web (Google)
          </button>
          <button
            disabled={isExecuting || isTestDispatching}
            onClick={() => triggerTestAction("open_app", { app: "notepad" }, "notepad")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-cyan-500/20 border border-white/[0.08] hover:border-cyan-500/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            Open Notepad
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.06] bg-black/40">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#0b0e17] border border-white/[0.1] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="PENDING">Pending Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-[#0b0e17] border border-white/[0.1] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Action Types</option>
            <option value="open_app">open_app</option>
            <option value="close_app">close_app</option>
            <option value="search_web">search_web</option>
            <option value="open_url">open_url</option>
            <option value="navigate">navigate</option>
            <option value="adjust_volume">adjust_volume</option>
            <option value="mute_volume">mute_volume</option>
            <option value="unmute_volume">unmute_volume</option>
            <option value="lock_workstation">lock_workstation</option>
            <option value="lock_screen">lock_screen</option>
            <option value="get_system_info">get_system_info</option>
            <option value="take_screenshot">take_screenshot</option>
            <option value="click_target">click_target</option>
            <option value="type_text">type_text</option>
          </select>
        </div>

        {/* Text Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search action ID, app, params..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 text-xs bg-[#0b0e17] border border-white/[0.1] rounded-lg pl-3 pr-8 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Action History Log Table */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Action History Log ({filteredHistory.length})
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            Showing latest {filteredHistory.length} entries
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            No desktop actions recorded matching current filters. Trigger an action via Voice, Chat, or Quick Test Bench.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((entry) => {
              const isExpanded = expandedActionId === entry.request.actionId;
              const typeIcon = ACTION_ICONS[entry.request.type] || <Zap className="w-3.5 h-3.5" />;
              const isSuccess = entry.status === "success";
              const isFailed = entry.status === "failed";

              return (
                <div
                  key={entry.request.actionId}
                  className="rounded-xl border border-white/[0.06] bg-black/40 overflow-hidden transition-all duration-200 hover:border-white/[0.12]"
                >
                  {/* Collapsed Row */}
                  <div
                    onClick={() =>
                      setExpandedActionId(isExpanded ? null : entry.request.actionId)
                    }
                    className="p-3 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button className="text-slate-400 hover:text-white">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {/* Type Badge */}
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-cyan-300 font-bold shrink-0">
                        {typeIcon}
                        {entry.request.type}
                      </span>

                      {/* Action ID */}
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {entry.request.actionId}
                      </span>

                      {/* Target Summary */}
                      <span className="text-xs text-slate-300 truncate">
                        {entry.result?.message ||
                          entry.request.target ||
                          JSON.stringify(entry.request.params) ||
                          "Executing..."}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                      {/* Latency */}
                      {entry.result && (
                        <span className="text-[10px] text-slate-400">
                          {entry.result.durationMs}ms
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        {new Date(entry.request.timestamp).toLocaleTimeString()}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1 ${
                          isSuccess
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isFailed
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse"
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isFailed ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3 animate-spin" />
                        )}
                        {entry.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Expanded JSON Inspector Drawer */}
                  {isExpanded && (
                    <div className="p-4 border-t border-white/[0.06] bg-[#05070d]/90 font-mono text-xs space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Payload & Telemetry Inspector
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyJson(entry);
                          }}
                          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedId === entry.request.actionId ? "Copied!" : "Copy JSON"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Request Details */}
                        <div className="p-3 rounded-lg border border-white/[0.04] bg-black/50">
                          <div className="text-[10px] font-bold text-cyan-400 mb-1">
                            Request Parameters
                          </div>
                          <pre className="text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(
                              {
                                target: entry.request.target,
                                params: entry.request.params,
                                source: entry.request.source,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>

                        {/* Result Details */}
                        <div className="p-3 rounded-lg border border-white/[0.04] bg-black/50">
                          <div className="text-[10px] font-bold text-emerald-400 mb-1">
                            Execution Result
                          </div>
                          {entry.result ? (
                            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(entry.result, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-slate-500 italic text-[11px]">
                              Execution in progress...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default ActionInspectorTab;
