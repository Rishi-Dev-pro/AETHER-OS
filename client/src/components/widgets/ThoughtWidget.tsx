import { useAssistantStore } from "../../store/assistantStore";
import type { LogEntry } from "../../store/assistantStore";
import { useEffect, useRef } from "react";

export default function ThoughtWidget() {
  const { logs } = useAssistantStore();
  const listEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs container to bottom when new logs stream in
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div
      className="
      w-[220px]
      xl:w-[260px]
      rounded-2xl
      border
      border-white/[0.05]
      bg-[#07090f]/75
      backdrop-blur-2xl
      p-5
      shadow-[0_12px_40px_rgba(0,0,0,0.6)]
      transition-all
      duration-300
      hover:border-white/[0.1]
      hover:bg-[#07090f]/80
      "
    >
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2 select-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-2">
          EVENT STREAMS
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase shrink-0">
          LOGS
        </span>
      </div>

      <div className="h-[105px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-w-0">
        {logs.slice(-4).map((log) => (
          <LogItem key={log.id} log={log} />
        ))}
        {/* Animated typewriter line */}
        <div className="flex items-start gap-1 font-mono text-[9px] text-slate-500 pl-1 min-w-0">
          <span className="truncate">&gt;_ ready</span>
          <span className="terminal-cursor shrink-0" />
        </div>
        <div ref={listEndRef} />
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  const typeColors = {
    INFO: {
      text: "text-slate-305 text-slate-300",
      prefix: "text-slate-500",
      bg: "bg-white/[0.01] border-white/[0.02]",
    },
    WARN: {
      text: "text-pink-300",
      prefix: "text-pink-500",
      bg: "bg-pink-505/[0.02] bg-pink-500/[0.02] border-pink-500/10",
    },
    SUCCESS: {
      text: "text-emerald-300 text-slate-200",
      prefix: "text-emerald-500",
      bg: "bg-emerald-505/[0.02] bg-emerald-500/[0.02] border-emerald-500/10",
    },
    AI: {
      text: "text-purple-300 font-medium",
      prefix: "text-purple-405 text-purple-400",
      bg: "bg-purple-505/[0.02] bg-purple-500/[0.02] border-purple-500/10",
    },
  };

  const colors = typeColors[log.type] || typeColors.INFO;

  return (
    <div
      className={`
      p-1.5
      rounded-lg
      border
      ${colors.bg}
      font-mono
      text-[9px]
      leading-relaxed
      transition-all
      duration-200
      animate-fadeIn
      break-words
      overflow-hidden
      min-w-0
      `}
    >
      <span className="text-slate-600 mr-1 text-[8px] select-none shrink-0">
        [{log.timestamp}]
      </span>
      <span className={`${colors.prefix} mr-1 font-bold select-none shrink-0`}>
        {log.type}:
      </span>
      <span className={`${colors.text} break-all`}>
        {log.text}
      </span>
    </div>
  );
}