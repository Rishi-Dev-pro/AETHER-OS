import type { ReactNode } from "react";

interface GlowPanelProps {
  children: ReactNode;
  className?: string;
}

export default function GlowPanel({
  children,
  className = "",
}: GlowPanelProps) {
  return (
    <div
      className={`
      relative
      rounded-2xl
      border
      border-white/[0.06]
      bg-[#05060b]/40
      backdrop-blur-xl
      shadow-[0_24px_64px_rgba(0,0,0,0.6)]
      overflow-hidden
      ${className}
    `}
    >
      {children}
    </div>
  );
}