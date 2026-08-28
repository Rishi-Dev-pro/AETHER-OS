import React, { useState } from "react";
import { User, Bot } from "lucide-react";
import type { ConversationTurn } from "../../runtime/conversation/conversation-types";
import type { SessionMetadata } from "../../runtime/conversation/session-types";

interface Props {
  sessions: ReadonlyArray<SessionMetadata>;
  activeSessionId: string;
  turns: ReadonlyArray<ConversationTurn>;
  onSwitchSession: (sessionId: string) => void;
}

export const ConversationInspectorTab: React.FC<Props> = ({
  sessions,
  activeSessionId,
  turns,
  onSwitchSession,
}) => {
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(
    turns.length > 0 ? turns[0].turnId : null
  );

  const selectedTurn = turns.find((t) => t.turnId === selectedTurnId) || turns[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left: Sessions & Turns Navigator */}
      <div className="md:col-span-1 space-y-4">
        {/* Session Selector */}
        <div className="p-3 rounded-xl border border-white/[0.08] bg-[#07090f]/80">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
            Active Multi-Session
          </label>
          <select
            value={activeSessionId}
            onChange={(e) => onSwitchSession(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-cyan-400"
          >
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.title} ({s.messageCount} msgs)
              </option>
            ))}
          </select>
        </div>

        {/* Turn List */}
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Turns in Session ({turns.length})
          </div>
          {turns.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-mono">No conversation turns recorded.</div>
          ) : (
            turns.map((turn, index) => {
              const isSelected = selectedTurn?.turnId === turn.turnId;
              const isSuccess = turn.status === "COMPLETED";

              return (
                <div
                  key={turn.turnId}
                  onClick={() => setSelectedTurnId(turn.turnId)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-purple-400 bg-purple-950/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                      : "border-white/[0.06] bg-[#07090f]/70 hover:bg-[#0c1220]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-white font-mono">Turn #{index + 1}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isSuccess ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {turn.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate font-mono">
                    {turn.userMessage?.content || "User Turn"}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                    <span>{new Date(turn.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span>{turn.providerId || "groq-adapter"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Selected Turn Message Inspector */}
      <div className="md:col-span-2 p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/90 backdrop-blur-xl">
        {!selectedTurn ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            Select a conversation turn to inspect message details.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">Turn Inspection</span>
                <h2 className="text-base font-black text-white font-mono mt-0.5">{selectedTurn.turnId}</h2>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Timestamp: {new Date(selectedTurn.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {/* User Message Bubble */}
            {selectedTurn.userMessage && (
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-cyan-400" /> USER MESSAGE
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{selectedTurn.userMessage.id}</span>
                </div>
                <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedTurn.userMessage.content}
                </div>
              </div>
            )}

            {/* Assistant Response Bubble */}
            {selectedTurn.assistantMessage ? (
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-purple-400" /> ASSISTANT RESPONSE
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{selectedTurn.assistantMessage.id}</span>
                </div>
                <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
                  {selectedTurn.assistantMessage.content}
                </div>
              </div>
            ) : selectedTurn.error ? (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 font-mono">
                Error during turn execution: {selectedTurn.error}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
