import { cn } from "../../lib/utils";

interface GlowBadgeProps {
  children: React.ReactNode;
  color?: "cyan" | "purple" | "pink" | "green" | "amber" | "slate";
  pulse?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const colorMap = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    text: "text-cyan-300",
    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)]",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    text: "text-purple-300",
    dot: "bg-purple-400 shadow-[0_0_8px_rgba(124,58,237,0.6)]",
  },
  pink: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/25",
    text: "text-pink-300",
    dot: "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.6)]",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    text: "text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    text: "text-amber-300",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  },
  slate: {
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    text: "text-slate-400",
    dot: "bg-slate-500",
  },
};

const sizeMap = {
  xs: "px-1.5 py-0.5 text-[8px] gap-1",
  sm: "px-2 py-0.5 text-[9px] gap-1.5",
  md: "px-2.5 py-1 text-[10px] gap-2",
};

export default function GlowBadge({
  children,
  color = "cyan",
  pulse = false,
  size = "sm",
  className,
}: GlowBadgeProps) {
  const c = colorMap[color];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-mono font-semibold tracking-wider uppercase",
        c.bg,
        c.border,
        c.text,
        sizeMap[size],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          c.dot,
          pulse && "animate-pulse"
        )}
      />
      {children}
    </span>
  );
}
