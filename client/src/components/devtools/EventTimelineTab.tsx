import React, { useState } from "react";
import { Play, Pause, Trash2, Search, ChevronRight, Terminal } from "lucide-react";
import type { TimelineEventItem } from "../../runtime/devtools/devtools-types";

interface Props {
  events: ReadonlyArray<TimelineEventItem>;
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
}

export const EventTimelineTab: React.FC<Props> = ({ events, isPaused, onTogglePause, onClear }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== "ALL" && e.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.type.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? "RESUME STREAM" : "PAUSE STREAM"}
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Buffer
          </button>
          <span className="text-xs text-slate-400 font-mono">
            {filteredEvents.length} / {events.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1">
            {["ALL", "EXECUTION", "STREAMING", "RESILIENCE", "SESSION", "NETWORK"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-all ${
                  selectedCategory === cat
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                    : "bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No events match the active filters or no runtime events have fired yet.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isExpanded = expandedEventId === evt.id;

            const categoryColor = {
              EXECUTION: "text-cyan-300 border-cyan-500/30 bg-cyan-950/20",
              STREAMING: "text-purple-300 border-purple-500/30 bg-purple-950/20",
              RESILIENCE: "text-amber-300 border-amber-500/30 bg-amber-950/20",
              SESSION: "text-emerald-300 border-emerald-500/30 bg-emerald-950/20",
              NETWORK: "text-pink-300 border-pink-500/30 bg-pink-950/20",
            }[evt.category];

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl border border-white/[0.06] bg-[#07090f]/70 hover:bg-[#0c1220]/80 transition-all cursor-pointer"
                onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-slate-400">{evt.timeFormatted}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider border ${categoryColor}`}>
                      {evt.category}
                    </span>
                    <span className="font-bold text-white tracking-wide">{evt.type}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {evt.durationMs !== undefined && (
                      <span className="text-[11px] font-mono text-cyan-300">{evt.durationMs}ms</span>
                    )}
                    {evt.tokenDelta !== undefined && (
                      <span className="text-[11px] font-mono text-purple-300">+{evt.tokenDelta} tok</span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-300 mt-1 font-mono pl-[90px] truncate">{evt.summary}</div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] pl-2 font-mono text-[11px]">
                    <div className="text-slate-400 mb-1 flex items-center gap-1 font-bold">
                      <Terminal className="w-3 h-3 text-cyan-400" /> Sanitized Payload Envelope:
                    </div>
                    <pre className="p-3 rounded-lg bg-black/60 text-slate-300 overflow-x-auto border border-white/[0.04]">
                      {JSON.stringify(evt.safePayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
