interface HUDLabelProps {
  title: string;
  value: string;
  active?: boolean;
}

export default function HUDLabel({ title, value, active = false }: HUDLabelProps) {
  return (
    <div
      className={`
      rounded-xl
      border
      px-3.5
      py-1.5
      backdrop-blur-md
      transition-all
      duration-300
      max-w-[180px]
      min-w-[120px]
      min-w-0
      ${
        active
          ? "border-pink-500/25 bg-pink-950/15 shadow-[0_4px_12px_rgba(244,63,94,0.1)]"
          : "border-white/[0.05] bg-black/45 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
      }
      `}
    >
      <p className="text-[8px] uppercase tracking-[0.18em] font-mono text-slate-500 font-semibold truncate leading-none">
        {title}
      </p>
      <p
        className={`
        mt-1
        text-[11px]
        font-mono
        font-bold
        tracking-wide
        truncate
        leading-none
        ${active ? "text-pink-400" : "text-cyan-400"}
      `}
      >
        {value}
      </p>
    </div>
  );
}