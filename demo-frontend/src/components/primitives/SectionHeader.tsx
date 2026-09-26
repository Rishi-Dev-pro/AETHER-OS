import { cn } from "../../lib/utils";

interface SectionHeaderProps {
  label: string;
  tag?: string;
  className?: string;
}

export default function SectionHeader({ label, tag, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      {tag && (
        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">
          {tag}
        </span>
      )}
    </div>
  );
}
