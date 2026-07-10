import CornerFrame from "./CornerFrame";
import HUDLabel from "./HUDLabel";
import { useCameraStore } from "../../store/cameraStore";
import { useVoiceStore } from "../../store/voiceStore";
import { useVisionStore } from "../../store/visionStore";

export default function VisionHUD() {
  const { isCameraEnabled, targetBoxes } = useCameraStore();
  const isListening = useVoiceStore((state) => state.isListening);
  const isSpeaking = useVoiceStore((state) => state.isSpeaking);
  const transcript = useVoiceStore((state) => state.transcript);
  const { visionMode } = useVisionStore();

  const activeTarget = isCameraEnabled && targetBoxes.length > 0 ? targetBoxes[0].label : "NONE";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <CornerFrame />

      <div className="absolute left-6 top-[180px]">
        <HUDLabel title="FILTER MODE" value={visionMode.toUpperCase()} />
      </div>

      <div className="absolute right-6 top-[180px]">
        <HUDLabel title="LOCK TARGET" value={activeTarget} active={activeTarget !== "NONE"} />
      </div>

      <div className="absolute bottom-[220px] left-6">
        <HUDLabel title="CAMERA ENGINE" value={isCameraEnabled ? "SCANNING" : "STANDBY"} />
      </div>

      <div className="absolute bottom-[280px] left-6 flex flex-col items-start">
        <HUDLabel 
          title="VOICE INTEGRATION" 
          value={isListening ? (isSpeaking ? "SPEAKING" : "LISTENING") : "READY"} 
          active={isListening} 
        />
        {isListening && transcript && (
          <div className="mt-1.5 max-w-[200px] text-left font-mono text-[9px] text-pink-400 uppercase tracking-widest leading-normal whitespace-pre-wrap select-none bg-black/40 px-2 py-0.5 rounded border border-white/[0.04] backdrop-blur-sm">
            {transcript}
          </div>
        )}
      </div>
    </div>
  );
}