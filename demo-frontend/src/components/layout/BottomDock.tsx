import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Scan,
  Mic,
  Eye,
  Brain,
  Layers,
} from "lucide-react";

interface DockAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: string;
}

const initialActions: DockAction[] = [
  { id: "camera", icon: <Camera size={18} />, label: "Camera Feed", active: true, color: "cyan" },
  { id: "scan", icon: <Scan size={18} />, label: "Object Scan", active: false, color: "cyan" },
  { id: "mic", icon: <Mic size={22} />, label: "Voice Control", active: true, color: "pink", },
  { id: "eye", icon: <Eye size={18} />, label: "Vision Filter", active: false, color: "purple" },
  { id: "brain", icon: <Brain size={18} />, label: "AI Reasoning", active: true, color: "purple" },
  { id: "layers", icon: <Layers size={18} />, label: "Overlay Layers", active: false, color: "cyan" },
];

const colorClasses: Record<string, { active: string; hover: string; glow: string }> = {
  cyan: {
    active: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.1)]",
    hover: "hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-200",
    glow: "shadow-[0_0_25px_rgba(0,229,255,0.2)]",
  },
  pink: {
    active: "border-pink-500/30 bg-pink-500/10 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.1)]",
    hover: "hover:border-pink-400/40 hover:bg-pink-500/15 hover:text-pink-200",
    glow: "shadow-[0_0_25px_rgba(236,72,153,0.2)]",
  },
  purple: {
    active: "border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_20px_rgba(124,58,237,0.1)]",
    hover: "hover:border-purple-400/40 hover:bg-purple-500/15 hover:text-purple-200",
    glow: "shadow-[0_0_25px_rgba(124,58,237,0.2)]",
  },
};

export default function BottomDock() {
  const [actions, setActions] = useState(initialActions);
  const [hovered, setHovered] = useState<string | null>(null);

  const toggle = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/80 border border-white/[0.08] text-[9px] font-mono text-slate-300 whitespace-nowrap backdrop-blur-sm"
          >
            {hovered}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock bar */}
      <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/[0.06] bg-[rgba(6,10,20,0.8)] backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {actions.map((action) => {
          const colors = colorClasses[action.color] || colorClasses.cyan;
          const isCenter = action.id === "mic";
          return (
            <motion.button
              key={action.id}
              onClick={() => toggle(action.id)}
              onMouseEnter={() => setHovered(action.label)}
              onMouseLeave={() => setHovered(null)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={`
                relative flex items-center justify-center rounded-full border transition-all duration-300
                ${isCenter ? "h-14 w-14" : "h-10 w-10"}
                ${
                  action.active
                    ? `${colors.active} ${hovered === action.label ? colors.glow : ""}`
                    : `border-white/[0.04] bg-white/[0.02] text-slate-500 ${colors.hover}`
                }
              `}
            >
              {action.icon}
              {isCenter && action.active && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-pink-400 animate-pulse" />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
