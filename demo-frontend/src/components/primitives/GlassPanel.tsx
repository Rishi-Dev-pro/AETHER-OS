import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  glow?: "primary" | "secondary" | "warm" | "none";
  intensity?: "subtle" | "medium" | "strong";
}

const glowMap = {
  primary: "shadow-[0_0_30px_rgba(0,229,255,0.06)]",
  secondary: "shadow-[0_0_30px_rgba(124,58,237,0.06)]",
  warm: "shadow-[0_0_30px_rgba(244,114,182,0.06)]",
  none: "",
};

const intensityBorder = {
  subtle: "border-white/[0.04]",
  medium: "border-white/[0.06]",
  strong: "border-white/[0.1]",
};

export default function GlassPanel({
  children,
  className,
  glow = "primary",
  intensity = "medium",
  ...props
}: GlassPanelProps) {
  return (
    <motion.div
      className={cn(
        "rounded-[var(--radius-lg)] backdrop-blur-2xl",
        "bg-[rgba(8,14,28,0.55)]",
        intensityBorder[intensity],
        glowMap[glow],
        "transition-all duration-500",
        className
      )}
      whileHover={{ scale: 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
