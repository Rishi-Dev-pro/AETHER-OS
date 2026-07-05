import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  active?: boolean;
}

export default function ModuleCard({
  title,
  subtitle,
  icon: Icon,
  active = false,
}: ModuleCardProps) {
  return (
    <button
      className={`
        group
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border
        p-4
        transition-all
        duration-300

        ${
          active
            ? "border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_30px_rgba(0,229,255,.15)]"
            : "border-white/10 bg-white/5 hover:border-cyan-400/20 hover:bg-white/10"
        }
      `}
    >
      <div className="flex items-center gap-4">

        <div
          className={`
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl

            ${
              active
                ? "bg-cyan-500/20"
                : "bg-white/5"
            }
          `}
        >
          <Icon
            size={22}
            className={
              active
                ? "text-cyan-300"
                : "text-slate-400"
            }
          />
        </div>

        <div className="flex-1 text-left">

          <h3 className="font-medium">
            {title}
          </h3>

          <p className="text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

        <div
          className={`
            h-3
            w-3
            rounded-full

            ${
              active
                ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.8)]"
                : "bg-slate-600"
            }
          `}
        />

      </div>

    </button>
  );
}