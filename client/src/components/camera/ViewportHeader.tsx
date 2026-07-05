import { useCameraStore } from "../../store/cameraStore";

export default function ViewportHeader() {
  const { isCameraEnabled } = useCameraStore();

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-6 flex items-center gap-2 select-none pointer-events-none z-30 whitespace-nowrap bg-black/30 p-1.5 rounded-full border border-white/5 backdrop-blur-sm">
      {isCameraEnabled ? (
        <>
          <StatusChip label="FEED: LIVE" color="cyan" pulse />
          <StatusChip label="RES: 1080P" color="cyan" />
          <StatusChip label="60 FPS" color="cyan" />
          <StatusChip label="CAMERA ACTIVE" color="emerald" />
        </>
      ) : (
        <>
          <StatusChip label="MODE: VECTOR" color="purple" pulse />
          <StatusChip label="RENDER: CANVAS" color="purple" />
          <StatusChip label="60 FPS" color="purple" />
          <StatusChip label="MATRIX ENG" color="cyan" />
        </>
      )}
    </div>
  );
}

function StatusChip({
  label,
  color = "cyan",
  pulse = false,
}: {
  label: string;
  color?: "cyan" | "purple" | "emerald";
  pulse?: boolean;
}) {
  const colorMap = {
    cyan: {
      border: "border-cyan-400/20",
      bg: "bg-cyan-500/10",
      text: "text-cyan-300",
      dot: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
    },
    purple: {
      border: "border-purple-500/20",
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      dot: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    },
    emerald: {
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    },
  };

  const current = colorMap[color];

  return (
    <div className={`flex items-center gap-1.5 rounded-full border ${current.border} ${current.bg} px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-wider`}>
      <div className={`h-1 w-1 rounded-full ${current.dot} ${pulse ? "animate-pulse" : ""}`} />
      <span className={current.text}>{label}</span>
    </div>
  );
}