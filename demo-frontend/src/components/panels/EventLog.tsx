import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import SectionHeader from "../primitives/SectionHeader";
import { MOCK_EVENTS } from "../../lib/mockData";

type EventType = "INFO" | "SUCCESS" | "WARN" | "AI";

interface LogEntry {
  id: number;
  type: EventType;
  text: string;
  time: string;
}

const typeStyles: Record<EventType, { text: string; bg: string; dot: string }> = {
  INFO: { text: "text-slate-300", bg: "bg-white/[0.015]", dot: "bg-slate-500" },
  SUCCESS: { text: "text-emerald-300", bg: "bg-emerald-500/[0.04]", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" },
  WARN: { text: "text-amber-300", bg: "bg-amber-500/[0.04]", dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]" },
  AI: { text: "text-purple-300", bg: "bg-purple-500/[0.04]", dot: "bg-purple-400 shadow-[0_0_6px_rgba(124,58,237,0.4)]" },
};

const extraEvents: LogEntry[] = [
  { id: 100, type: "INFO", text: "Frame pipeline normalized — 60fps lock", time: "" },
  { id: 101, type: "SUCCESS", text: "Hand tracking confidence > 95%", time: "" },
  { id: 102, type: "AI", text: "Context window refreshed", time: "" },
  { id: 103, type: "WARN", text: "Token rate limit approaching", time: "" },
  { id: 104, type: "SUCCESS", text: "Provider failover test passed", time: "" },
  { id: 105, type: "INFO", text: "Vision mode: NEURAL — optimized", time: "" },
];

export default function EventLog() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_EVENTS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  // Periodically inject new events
  useEffect(() => {
    const id = setInterval(() => {
      counterRef.current++;
      const template = extraEvents[counterRef.current % extraEvents.length];
      const newLog: LogEntry = {
        ...template,
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setLogs((prev) => [...prev.slice(-20), newLog]);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <GlassPanel glow="warm" className="w-[260px] p-4 flex flex-col h-[280px]">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <SectionHeader label="Event Stream" className="mb-0 flex-1" />
        <div className="flex items-center gap-1.5 text-[8px] font-mono text-slate-500">
          <Terminal size={9} />
          {logs.length} events
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 min-h-0 scrollbar-thin scrollbar-thumb-white/10"
      >
        <AnimatePresence initial={false}>
          {logs.slice(-15).map((log) => {
            const s = typeStyles[log.type] || typeStyles.INFO;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`p-2 rounded-lg border border-white/[0.02] ${s.bg} text-[8px] font-mono leading-relaxed`}
              >
                <span className="text-slate-600 mr-1.5 tabular-nums">[{log.time}]</span>
                <span className={`font-bold mr-1.5 ${s.text}`}>{log.type}:</span>
                <span className="text-slate-300">{log.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Terminal cursor */}
        <div className="flex items-center gap-1.5 px-1 py-1">
          <span className="text-[9px] font-mono text-slate-600">&gt;_</span>
          <span className="h-3 w-[2px] bg-cyan-400 animate-typing opacity-70" />
        </div>
      </div>
    </GlassPanel>
  );
}
