import { useVisionStore, type FrameProfile } from "../../store/visionStore";
import { useMemo } from "react";

export default function VisionWidget() {
  const cameraStatus = useVisionStore((state) => state?.cameraStatus ?? false);
  const faceCount = useVisionStore((state) => state?.faceCount ?? 0);
  const handCount = useVisionStore((state) => state?.handCount ?? 0);
  const objectCount = useVisionStore((state) => state?.objectCount ?? 0);
  const emotionStatus = useVisionStore((state) => state?.emotionStatus ?? "None");
  const activeFaces = useVisionStore((state) => state?.activeFaces ?? []);

  const profileQueue = useVisionStore((state) => state?.profileQueue ?? []);

  const stats = useMemo(() => {
    if (!profileQueue || profileQueue.length === 0) return null;

    const computedStats: any = {};
    const keys: Array<keyof FrameProfile> = [
      "tCameraCapture", "tFaceDetect", "tFaceMesh", "tFaceIntel",
      "tJpegEncode", "tBase64Encode", "tPythonWrite", "tNodeReceive",
      "tJsonParse", "tNodeEmit", "tBrowserReceive", "tImageDecode",
      "tReactRender", "tOverlayRender", "tEndToEnd"
    ];

    keys.forEach((key) => {
      const values = profileQueue.map((p) => p?.[key]).filter((v) => v !== undefined && v !== null && !isNaN(v));
      if (values.length === 0) {
        computedStats[key] = { avg: 0, min: 0, max: 0 };
        return;
      }
      const sum = values.reduce((a, b) => a + b, 0);
      computedStats[key] = {
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return computedStats;
  }, [profileQueue]);

  const primaryFace = cameraStatus && activeFaces && activeFaces.length > 0 ? activeFaces[0] : null;

  const blinkVal = primaryFace && primaryFace.blink !== undefined ? (primaryFace.blink ? "BLINKING" : "NO") : "--";
  const eyesVal = primaryFace && primaryFace.eyes ? `L:${primaryFace.eyes.leftOpen ? "OPEN" : "CLSD"} R:${primaryFace.eyes.rightOpen ? "OPEN" : "CLSD"}` : "--";
  const mouthVal = primaryFace && primaryFace.mouth ? `${primaryFace.mouth.open ? "OPEN" : "CLSD"} (${primaryFace.mouth.ratio.toFixed(2)})` : "--";
  const smileVal = primaryFace && primaryFace.smile !== undefined ? `${Math.round(primaryFace.smile * 100)}%` : "--";
  const lookingVal = primaryFace && primaryFace.looking ? primaryFace.looking.toUpperCase() : "--";
  const headVal = primaryFace && primaryFace.head ? `Y:${primaryFace.head.yaw}° P:${primaryFace.head.pitch}° R:${primaryFace.head.roll}°` : "--";

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
        
        {cameraStatus && (
          <>
            <div className="border-t border-white/[0.04] my-2 pt-2" />
            <VisionRow
              label="Blink Status"
              value={blinkVal}
              active={primaryFace?.blink === true}
              isText
            />
            <VisionRow
              label="Eye Status"
              value={eyesVal}
              active={primaryFace !== null}
              isText
            />
            <VisionRow
              label="Mouth Status"
              value={mouthVal}
              active={primaryFace !== null}
              isText
            />
            <VisionRow
              label="Smile Score"
              value={smileVal}
              active={primaryFace !== null && (primaryFace.smile ?? 0) > 0.3}
              isText
            />
            <VisionRow
              label="Looking Direction"
              value={lookingVal}
              active={primaryFace !== null && primaryFace.looking !== "center"}
              isText
            />
            <VisionRow
              label="Head Rotation"
              value={headVal}
              active={primaryFace !== null}
              isText
            />
          </>
        )}

        <div className="border-t border-white/[0.04] my-2 pt-2" />
        <div className="flex items-center justify-between mb-1.5 select-none">
          <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest text-left">
            Pipeline Profiler
          </span>
          <span className="text-[8px] font-mono text-slate-400">
            ({useVisionStore((s) => s.profileQueue.length)}/100F)
          </span>
        </div>

        {cameraStatus ? (
          <div className="space-y-1 text-[9px] font-mono pr-1">
            <ProfileRow label="1. Camera Capture" stats={stats?.tCameraCapture} />
            <ProfileRow label="2. Face Detection" stats={stats?.tFaceDetect} />
            <ProfileRow label="3. Face Mesh" stats={stats?.tFaceMesh} />
            <ProfileRow label="4. Face Intel" stats={stats?.tFaceIntel} />
            <ProfileRow label="5. JPEG Encode" stats={stats?.tJpegEncode} />
            <ProfileRow label="6. Base64 Encode" stats={stats?.tBase64Encode} />
            <ProfileRow label="7. Python Write" stats={stats?.tPythonWrite} />
            <ProfileRow label="8. Node Receive (IPC)" stats={stats?.tNodeReceive} />
            <ProfileRow label="9. JSON Parse" stats={stats?.tJsonParse} />
            <ProfileRow label="10. Socket.IO Emit" stats={stats?.tNodeEmit} />
            <ProfileRow label="11. Browser Receive" stats={stats?.tBrowserReceive} />
            <ProfileRow label="12. Image Decode" stats={stats?.tImageDecode} />
            <ProfileRow label="13. React Render" stats={stats?.tReactRender} />
            <ProfileRow label="14. Overlay Render" stats={stats?.tOverlayRender} />
            <div className="border-t border-white/[0.04] my-1.5 pt-1.5" />
            <ProfileRow label="15. End-to-End Frame" stats={stats?.tEndToEnd} isTotal />
          </div>
        ) : (
          <div className="text-[9px] font-sans text-slate-500 text-center py-4 bg-white/[0.01] rounded-xl border border-white/[0.02]">
            Waiting for camera feed...
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  stats,
  isTotal = false,
}: {
  label: string;
  stats?: { avg: number; min: number; max: number };
  isTotal?: boolean;
}) {
  const hasData = stats && typeof stats.avg === "number" && typeof stats.min === "number" && typeof stats.max === "number";
  const avg = hasData ? stats.avg.toFixed(1) : "--";
  const min = hasData ? stats.min.toFixed(1) : "--";
  const max = hasData ? stats.max.toFixed(1) : "--";

  return (
    <div className={`flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/[0.02] transition-colors gap-2 ${isTotal ? 'bg-cyan-500/10 border border-cyan-500/20 font-bold' : ''}`}>
      <span className={`${isTotal ? 'text-cyan-400 font-sans' : 'text-slate-400 font-sans'} truncate flex-1 text-left`}>
        {label}
      </span>
      <span className={`${isTotal ? 'text-cyan-400' : 'text-slate-300'} font-mono shrink-0`}>
        {hasData ? (
          <>
            {avg} <span className="text-slate-500 text-[8px]">({min}-{max})</span>
          </>
        ) : (
          "--"
        )}
      </span>
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