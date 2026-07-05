import { useVisionStore } from "../../store/visionStore";

export default function VisionWidget() {
  const { cameraStatus, faceCount, handCount, objectCount, emotionStatus } = useVisionStore();

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
          NEURAL MATRIX VIEW
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase shrink-0">
          DIAG
        </span>
      </div>

      <div className="space-y-2 text-[11px] font-mono">
        <VisionRow
          label="Human Faces"
          value={cameraStatus ? faceCount : "--"}
          active={cameraStatus && faceCount > 0}
        />
        <VisionRow
          label="Skeletal Hands"
          value={cameraStatus ? handCount : "--"}
          active={cameraStatus && handCount > 0}
        />
        <VisionRow
          label="Spatial Objects"
          value={cameraStatus ? objectCount : "--"}
          active={cameraStatus && objectCount > 0}
        />
        <VisionRow
          label="Vocal/Facial Emotion"
          value={cameraStatus ? emotionStatus : "STANDBY"}
          active={cameraStatus && emotionStatus !== "None"}
          isText
        />
      </div>
    </div>
  );
}

function VisionRow({
  label,
  value,
  active,
  isText = false,
}: {
  label: string;
  value: string | number;
  active: boolean;
  isText?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.02] hover:bg-white/[0.03] transition-all duration-200 min-w-0 gap-2">
      <span className="text-slate-400 font-sans text-xs truncate flex-1 min-w-0 text-left">{label}</span>
      <span
        className={`
        font-mono
        text-[11px]
        px-2
        py-0.5
        rounded
        transition-all
        duration-300
        truncate
        shrink-0
        ${
          active
            ? isText
              ? "bg-pink-500/5 text-pink-400 border border-pink-500/20 font-semibold"
              : "bg-cyan-500/5 text-cyan-400 border border-cyan-500/20 font-semibold"
            : "bg-white/[0.01] text-slate-500 border border-white/[0.03]"
        }
      `}
      >
        {value}
      </span>
    </div>
  );
}