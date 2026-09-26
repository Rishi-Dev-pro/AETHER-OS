import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Sparkles, Volume2, Trash2, Plus } from "lucide-react";
import GlassPanel from "../primitives/GlassPanel";
import GlowBadge from "../primitives/GlowBadge";
import { MOCK_CONVERSATION } from "../../lib/mockData";

export default function AIPanel() {
  const [messages, setMessages] = useState(MOCK_CONVERSATION.messages);
  const [isThinking, setIsThinking] = useState(false);
  const [streamText, setStreamText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate a new AI response arriving periodically
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsThinking(true);
      const fullResponse =
        "Affirmative. I have completed the spatial analysis. Additional telemetry indicates thermal signatures consistent with two biological entities. Ambient temperature stable at 22°C. No anomalous activity detected in the observation perimeter. Recommend maintaining current scanning posture.";

      let idx = 0;
      const streamId = setInterval(() => {
        idx++;
        setStreamText(fullResponse.slice(0, idx));
        if (idx >= fullResponse.length) {
          clearInterval(streamId);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              role: "assistant",
              content: fullResponse,
              timestamp: Date.now(),
            },
          ]);
          setIsThinking(false);
          setStreamText("");
        }
      }, 20);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  return (
    <GlassPanel glow="secondary" className="w-[260px] flex flex-col h-[300px]">
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 border-b border-white/[0.04] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 flex items-center justify-center rounded-md border border-purple-500/25 bg-purple-500/10">
            <Bot size={10} className="text-purple-400" />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200">
              Neural Console
            </span>
            <span className="text-[7px] font-mono text-purple-400 ml-1.5">
              {MOCK_CONVERSATION.provider} / {MOCK_CONVERSATION.model}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-1 rounded-md border border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-white transition-colors">
            <Plus size={10} />
          </button>
          <button className="p-1 rounded-md border border-white/[0.04] bg-white/[0.02] text-slate-400 hover:text-pink-400 transition-colors">
            <Volume2 size={10} />
          </button>
          <GlowBadge color="green" pulse size="xs">
            READY
          </GlowBadge>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2.5 min-h-0">
        {messages.length === 0 && !isThinking && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles size={16} className="text-purple-400/30 mb-2" />
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              Neural link active
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <span
              className={`text-[7px] font-mono uppercase tracking-wider mb-0.5 ${
                msg.role === "user" ? "text-pink-400" : "text-purple-400"
              }`}
            >
              {msg.role === "user" ? (
                <span className="flex items-center gap-1">
                  You <User size={7} />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Bot size={7} /> AETHER
                </span>
              )}
            </span>
            <div
              className={`px-2.5 py-1.5 rounded-xl text-[9px] leading-relaxed max-w-[88%] border ${
                msg.role === "user"
                  ? "bg-pink-500/8 border-pink-500/15 text-slate-200 rounded-tr-sm"
                  : "bg-purple-500/8 border-purple-500/15 text-slate-200 rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}

        {/* Streaming text */}
        <AnimatePresence>
          {isThinking && streamText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-start"
            >
              <span className="text-[7px] font-mono uppercase tracking-wider text-purple-400 mb-0.5 flex items-center gap-1">
                <Bot size={7} /> AETHER
              </span>
              <div className="px-2.5 py-1.5 rounded-xl rounded-tl-sm text-[9px] leading-relaxed bg-purple-500/8 border border-purple-500/15 text-slate-200">
                {streamText}
                <span className="inline-block w-[3px] h-3 ml-0.5 bg-purple-400 animate-typing align-middle" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        {isThinking && !streamText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-start"
          >
            <span className="text-[7px] font-mono uppercase tracking-wider text-purple-400 mb-0.5 flex items-center gap-1">
              <Bot size={7} /> AETHER
            </span>
            <div className="px-3 py-1.5 rounded-xl rounded-tl-sm bg-purple-500/8 border border-purple-500/15 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[8px] font-mono text-purple-300 uppercase tracking-widest animate-pulse">
                Thinking
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer diagnostics */}
      <div className="px-3.5 py-2 border-t border-white/[0.04] flex items-center justify-between text-[7px] font-mono text-slate-500 shrink-0">
        <span>
          LAT: <span className="text-slate-300">{MOCK_CONVERSATION.latency}ms</span>
        </span>
        <span>
          TOKENS: <span className="text-slate-300">{MOCK_CONVERSATION.totalTokens.toLocaleString()}</span>
        </span>
        <span>
          COST: <span className="text-emerald-400">${MOCK_CONVERSATION.cost.toFixed(5)}</span>
        </span>
      </div>
    </GlassPanel>
  );
}
