import { useEffect, useRef, useState } from "react";
import { useConversation, useRuntime, useDiagnostics, useProvider } from "../../runtime/frontend";
import { useConversationStore } from "../../runtime/frontend/conversation-store";
import { runtimeController } from "../../runtime/frontend/runtime-controller";
import {
  Bot,
  User,
  Cpu,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  Plus,
  ChevronDown,
  MessageSquare,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { setTTSEnabled, isTTSEnabled } from "../../runtime/frontend/speech-runtime";

export default function ConversationWidget() {
  const { messages, isThinking, isStreaming, streamProgress, cancelStreaming, clearConversation } =
    useConversation();
  const { runtimeReady, currentQueueLength } = useRuntime();
  const { latency, totalTokens, estimatedCost } = useDiagnostics();
  const { currentProvider, currentModel } = useProvider();

  // Multi-session state from Zustand store
  const sessions = useConversationStore((state) => state.sessions);
  const activeSessionId = useConversationStore((state) => state.activeSessionId);
  const activeSessionTitle = useConversationStore((state) => state.activeSessionTitle);

  const [ttsActive, setTtsActive] = useState<boolean>(() => isTTSEnabled());
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking, isStreaming, streamProgress]);

  const toggleTts = () => {
    const next = !ttsActive;
    setTtsActive(next);
    setTTSEnabled(next);
  };

  const getProviderBadge = (provider: string) => {
    if (provider.includes("groq")) return "GROQ LLAMA-3.3";
    if (provider.includes("nvidia")) return "NVIDIA LLAMA-3.1";
    if (provider.includes("openai")) return "OPENAI GPT-4O";
    if (provider.includes("ollama")) return "OLLAMA LOCAL";
    return provider.toUpperCase();
  };

  const handleCreateNewSession = async () => {
    setShowSessionDrawer(false);
    await runtimeController.createSession("New Conversation");
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    setShowSessionDrawer(false);
    await runtimeController.switchSession(sessionId);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await runtimeController.deleteSession(sessionId);
  };

  const handleSaveRename = () => {
    if (editingTitleText.trim() && activeSessionId) {
      runtimeController.renameSession(activeSessionId, editingTitleText.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      className="
      w-[260px]
      xl:w-[280px]
      rounded-2xl
      border
      border-white/[0.08]
      bg-[#07090f]/85
      backdrop-blur-2xl
      p-3.5
      shadow-[0_16px_48px_rgba(0,0,0,0.7)]
      transition-all
      duration-300
      hover:border-white/[0.15]
      hover:bg-[#07090f]/90
      flex
      flex-col
      h-[280px]
      xl:h-[300px]
      select-none
      relative
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400">
            <Cpu size={11} />
          </div>

          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editingTitleText}
                  onChange={(e) => setEditingTitleText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                  autoFocus
                  className="bg-black/60 border border-purple-500/40 rounded px-1 text-[8px] font-mono text-purple-200 outline-none w-24"
                />
                <button
                  onClick={handleSaveRename}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Check size={10} />
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSessionDrawer(!showSessionDrawer)}
                  className="flex items-center gap-1 hover:text-purple-300 transition-colors text-left truncate group"
                  title="Switch Conversation Session"
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-200 truncate max-w-[90px]">
                    {activeSessionTitle || "CONVERSATION"}
                  </span>
                  <ChevronDown
                    size={9}
                    className={`text-slate-400 transition-transform ${
                      showSessionDrawer ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => {
                    setEditingTitleText(activeSessionTitle || "New Conversation");
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-500 hover:text-purple-300 p-0.5 transition-opacity"
                  title="Rename Session"
                >
                  <Edit2 size={8} />
                </button>
              </div>
            )}
            <span className="text-[7px] font-mono text-purple-400 uppercase tracking-wider block truncate">
              {getProviderBadge(currentProvider)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCreateNewSession}
            className="p-1 rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all text-[8px]"
            title="New Chat Session"
          >
            <Plus size={11} />
          </button>

          {isStreaming && (
            <button
              onClick={cancelStreaming}
              className="px-1.5 py-0.5 rounded-md border border-rose-500/30 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all font-mono text-[7px] uppercase tracking-wider animate-pulse"
              title="Cancel Active Generation"
            >
              CANCEL
            </button>
          )}

          <button
            onClick={toggleTts}
            className={`p-1 rounded-md border transition-all text-[8px] ${
              ttsActive
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-slate-800/40 text-slate-500"
            }`}
            title={ttsActive ? "Speech Synthesis Enabled" : "Speech Synthesis Disabled"}
          >
            {ttsActive ? <Volume2 size={11} /> : <VolumeX size={11} />}
          </button>

          <button
            onClick={clearConversation}
            className="p-1 rounded-md border border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-pink-400 hover:border-pink-500/20 transition-all text-[8px]"
            title="Clear Conversation History"
          >
            <Trash2 size={11} />
          </button>

          <div
            className={`h-1.5 w-1.5 rounded-full ${
              runtimeReady
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse"
                : "bg-amber-500"
            }`}
          />
        </div>
      </div>

      {/* Session Drawer Overlay */}
      {showSessionDrawer && (
        <div className="absolute inset-x-3.5 top-12 bottom-10 z-20 bg-[#07090f]/95 border border-purple-500/30 rounded-xl p-2 shadow-2xl backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 mb-1.5">
            <span className="text-[8px] font-mono text-purple-300 uppercase tracking-widest flex items-center gap-1">
              <MessageSquare size={9} /> Saved Sessions ({sessions.length})
            </span>
            <button
              onClick={() => setShowSessionDrawer(false)}
              className="text-slate-400 hover:text-white text-[8px]"
            >
              <X size={10} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
            {sessions.map((s) => {
              const isActive = s.sessionId === activeSessionId;
              return (
                <div
                  key={s.sessionId}
                  onClick={() => handleSwitchSession(s.sessionId)}
                  className={`flex items-center justify-between p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isActive
                      ? "bg-purple-950/50 border-purple-500/40 text-purple-200"
                      : "bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.05] hover:border-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-[8px] font-medium truncate">{s.title || "Untitled"}</p>
                    <span className="text-[6px] font-mono text-slate-500 block">
                      {new Date(s.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {s.messageCount || 0} msgs
                    </span>
                  </div>

                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteSession(e, s.sessionId)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0"
      >
        {messages.length === 0 && !isThinking && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-2">
            <Sparkles size={16} className="text-purple-400/40 mb-1.5 animate-pulse" />
            <p className="text-[9px] font-mono text-slate-400 tracking-wider uppercase">
              NEURAL CONSOLE READY
            </p>
            <p className="text-[7px] font-mono text-slate-600 mt-0.5">
              Speak or query to initiate streaming runtime
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isLatestAssistant =
              msg.role === "assistant" && idx === messages.length - 1 && isStreaming;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } animate-fadeIn`}
              >
                <div
                  className={`flex items-center gap-1 mb-0.5 font-mono text-[7px] uppercase tracking-wider ${
                    msg.role === "user" ? "text-pink-400" : "text-purple-400"
                  }`}
                >
                  {msg.role === "user" ? (
                    <>
                      <span>USER</span>
                      <User size={8} />
                    </>
                  ) : (
                    <>
                      <Bot size={8} />
                      <span>AETHER ({currentModel.split("/").pop()})</span>
                    </>
                  )}
                </div>

                <div
                  className={`p-2 rounded-lg text-[9px] leading-relaxed font-sans max-w-[92%] break-words shadow-sm border ${
                    msg.role === "user"
                      ? "bg-pink-500/10 border-pink-500/20 text-slate-200 rounded-tr-none"
                      : "bg-purple-950/40 border-purple-500/20 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                  {isLatestAssistant && (
                    <span className="inline-block w-1.5 h-3 ml-0.5 bg-purple-400 animate-pulse align-middle" />
                  )}
                </div>
                <span className="text-[6px] font-mono text-slate-600 mt-0.5">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}

        {/* Thinking / Streaming Status Indicator */}
        {isThinking && !isStreaming && (
          <div className="flex flex-col items-start animate-fadeIn">
            <div className="flex items-center gap-1 mb-0.5 font-mono text-[7px] uppercase tracking-wider text-purple-400">
              <Bot size={8} />
              <span>AETHER AI</span>
            </div>
            <div className="p-2 rounded-lg text-[9px] leading-relaxed font-sans bg-purple-950/40 border border-purple-500/30 text-purple-300 rounded-tl-none flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="font-mono text-[8px] tracking-widest uppercase animate-pulse">
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Diagnostics Telemetry */}
      <div className="mt-1.5 pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[8px] font-mono text-slate-500 shrink-0">
        <div>
          <span>LAT: </span>
          <span className="text-slate-300 font-semibold">{latency > 0 ? `${latency}ms` : "--"}</span>
        </div>
        <div>
          <span>TOKENS: </span>
          <span className="text-slate-300 font-semibold">{totalTokens}</span>
        </div>
        <div>
          <span>COST: </span>
          <span className="text-emerald-400 font-semibold">
            ${estimatedCost > 0 ? estimatedCost.toFixed(5) : "0.00000"}
          </span>
        </div>
        {currentQueueLength > 0 && (
          <div className="text-amber-400">
            <span>Q: {currentQueueLength}</span>
          </div>
        )}
      </div>
    </div>
  );
}
