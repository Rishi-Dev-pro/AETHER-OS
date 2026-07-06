import { Camera, Mic, ScanEye } from "lucide-react";
import { useVoiceStore } from "../../store/voiceStore";
import { useVisionStore } from "../../store/visionStore";

function StatusRow({
  icon,
  label,
  value,
  statusState,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  statusState: "active" | "warning" | "standby";
}) {
  const stateConfig = {
    active: {
      text: "text-emerald-405 text-emerald-400 font-semibold",
      indicator: "bg-emerald-450 bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.3)] animate-pulse",
      iconClass: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10",
    },
    warning: {
      text: "text-pink-400 font-semibold",
      indicator: "bg-pink-500 shadow-[0_0_6px_rgba(244,63,94,0.3)] animate-ping",
      iconClass: "text-pink-400 bg-pink-500/5 border-pink-500/10",
    },
    standby: {
      text: "text-slate-450 text-slate-450 text-slate-400 font-medium",
      indicator: "bg-slate-600",
      iconClass: "text-slate-400 bg-white/[0.02] border-white/[0.04]",
    },
  };

  const current = stateConfig[statusState];

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-200 min-w-0 gap-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          ${current.iconClass}
          `}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] text-slate-500 font-mono tracking-[0.12em] uppercase truncate leading-tight">
            {label}
          </p>
          <p className={`mt-0.5 text-[11px] font-mono truncate leading-tight ${current.text}`}>
            {value}
          </p>
        </div>
      </div>

      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${current.indicator}`} />
    </div>
  );
}

export default function SystemWidget() {
  const voiceStatus = useVoiceStore((state) => state?.voiceStatus ?? "ONLINE");
  const visionMode = useVisionStore((state) => state?.visionMode ?? "standard");
  const cameraStatus = useVisionStore((state) => state?.cameraStatus ?? false);

  return (
    <div
      className="
      w-[220px]
      xl:w-[260px]
      rounded-2xl
      border
      border-white/[0.05]
      bg-[#07090f]/75
      backdrop-blur-2xl
      p-5
      shadow-[0_12px_40px_rgba(0,0,0,0.6)]
      transition-all
      duration-300
      hover:border-white/[0.1]
      hover:bg-[#07090f]/80
      "
    >
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2 select-none">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-2">
          OS SYSTEM CORE
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase shrink-0">
          v3.4
        </span>
      </div>

      <div className="space-y-2">
        <StatusRow
          icon={<Camera size={14} />}
          label="Camera Sensor"
          value={cameraStatus ? "SCANNING_LIVE" : "STANDBY"}
          statusState={cameraStatus ? "active" : "standby"}
        />

        <StatusRow
          icon={<Mic size={14} />}
          label="Audio Channel"
          value={voiceStatus === "LISTENING" ? "LISTENING" : "ONLINE"}
          statusState={voiceStatus === "LISTENING" ? "warning" : "standby"}
        />

        <StatusRow
          icon={<ScanEye size={14} />}
          label="Vision Matrix"
          value={visionMode.toUpperCase()}
          statusState={cameraStatus ? "active" : "standby"}
        />
      </div>
    </div>
  );
}