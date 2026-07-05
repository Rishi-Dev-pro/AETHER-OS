interface StatusChipProps {
  label: string;
}

export default function StatusChip({
  label,
}: StatusChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1">

      <div className="h-2 w-2 rounded-full bg-cyan-400 glow" />

      <span className="text-xs tracking-wide text-cyan-300">
        {label}
      </span>

    </div>
  );
}