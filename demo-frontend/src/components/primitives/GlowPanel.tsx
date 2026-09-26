import React from "react";
import { cn } from "../../lib/utils";

interface GlowPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: "primary" | "secondary" | "warm" | "none";
  intensity?: "subtle" | "medium" | "strong";
}

const glowStyles = {
  primary: "shadow-[inset_0_0_40px_rgba(0,229,255,0.02),0_0_30px_rgba(0,229,255,0.04)]",
  secondary: "shadow-[inset_0_0_40px_rgba(124,58,237,0.02),0_0_30px_rgba(124,58,237,0.04)]",
  warm: "shadow-[inset_0_0_40px_rgba(244,114,182,0.02),0_0_30px_rgba(244,114,182,0.04)]",
  none: "",
};

const borderStyles = {
  subtle: "border-white/[0.03]",
  medium: "border-white/[0.05]",
  strong: "border-white/[0.08]",
};

export default function GlowPanel({
  children,
  className,
  glow = "primary",
  intensity = "medium",
}: GlowPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-xl)] overflow-hidden",
        "bg-[rgba(6,10,20,0.6)] backdrop-blur-xl",
        borderStyles[intensity],
        glowStyles[glow],
        className
      )}
    >
      {children}
    </div>
  );
}
