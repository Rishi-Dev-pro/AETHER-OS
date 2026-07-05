import { useCameraStore } from "../../store/cameraStore";

export default function ViewportFooter() {
  const { detectedItems, isCameraEnabled } = useCameraStore();

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-450 select-none pointer-events-none z-30 whitespace-nowrap bg-black/30 p-1.5 rounded-full border border-white/5 backdrop-blur-sm">
      <FooterStat
        label="OBJ"
        value={isCameraEnabled ? detectedItems.objects : 0}
        active={isCameraEnabled && detectedItems.objects > 0}
      />
      <FooterStat
        label="FACES"
        value={isCameraEnabled ? detectedItems.faces : 0}
        active={isCameraEnabled && detectedItems.faces > 0}
      />
      <FooterStat
        label="HANDS"
        value={isCameraEnabled ? detectedItems.hands : 0}
        active={isCameraEnabled && detectedItems.hands > 0}
      />

      <div className="flex items-center gap-1 bg-black/45 border border-white/10 rounded-full px-2.5 py-0.5">
        <span className="text-[8px] text-slate-500 font-sans tracking-widest">DIAG:</span>
        <span className={isCameraEnabled ? "text-cyan-300 font-bold" : "text-slate-500"}>
          {isCameraEnabled ? "TRACKING" : "VECTOR_ENG"}
        </span>
      </div>
    </div>
  );
}

function FooterStat({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-black/45 border border-white/10 rounded-full px-2.5 py-0.5">
      <span className="text-[8px] text-slate-500">{label}:</span>
      <span className={active ? "text-cyan-350 font-black" : "text-slate-400"}>
        {value}
      </span>
    </div>
  );
}