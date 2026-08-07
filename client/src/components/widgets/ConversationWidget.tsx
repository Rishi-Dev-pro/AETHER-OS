import { useEffect, useRef } from "react";
import { useConversation, useRuntime, useDiagnostics, useProvider } from "../../runtime/frontend";
import { Bot, User, Cpu, Sparkles, Volume2, VolumeX, Trash2 } from "lucide-react";
import { setTTSEnabled, isTTSEnabled } from "../../runtime/frontend/speech-runtime";
import { useState } from "react";

export default function ConversationWidget() {
  const { messages, isThinking, clearConversation } = useConversation();
  const { runtimeReady, currentQueueLength } = useRuntime();
  const { latency, totalTokens, estimatedCost } = useDiagnostics();
  const { currentProvider, currentModel } = useProvider();



  const [ttsActive, setTtsActive] = useState<boolean>(() => isTTSEnabled());
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

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

  return (
    <div
      className="
      w-[240px]
      xl:w-[260px]
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
      h-[260px]
      xl:h-[280px]
      select-none
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400">
            <Cpu size={12} />
          </div>
          <div>
            <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300 leading-tight">
              AETHER RUNTIME
            </h3>
            <span className="text-[7px] font-mono text-purple-400 uppercase tracking-wider block">
              {getProviderBadge(currentProvider)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Messages List */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0"
      >
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-2">
            <Sparkles size={16} className="text-purple-400/40 mb-1.5 animate-pulse" />
            <p className="text-[9px] font-mono text-slate-400 tracking-wider uppercase">
              NEURAL CONSOLE READY
            </p>
            <p className="text-[7px] font-mono text-slate-600 mt-0.5">
              Speak or query to initiate runtime
            </p>
          </div>
        ) : (
          messages.map((msg) => (
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
              </div>
              <span className="text-[6px] font-mono text-slate-600 mt-0.5">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          ))
        )}

        {/* Thinking Indicator */}
        {isThinking && (
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
      <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[8px] font-mono text-slate-500 shrink-0">
        <div>
          <span>LATENCY: </span>
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
