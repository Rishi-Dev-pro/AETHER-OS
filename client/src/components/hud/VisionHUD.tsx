import CornerFrame from "./CornerFrame";
import HUDLabel from "./HUDLabel";
import { useCameraStore } from "../../store/cameraStore";
import { useVoiceStore } from "../../store/voiceStore";
import { useVisionStore } from "../../store/visionStore";

export default function VisionHUD() {
  const { isCameraEnabled, targetBoxes } = useCameraStore();
  const { isListening } = useVoiceStore();
  const { visionMode } = useVisionStore();

  const activeTarget = isCameraEnabled && targetBoxes.length > 0 ? targetBoxes[0].label : "NONE";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <CornerFrame />

      <div className="absolute left-6 top-20">
        <HUDLabel title="FILTER MODE" value={visionMode.toUpperCase()} />
      </div>

      <div className="absolute right-6 top-20">
        <HUDLabel title="LOCK TARGET" value={activeTarget} active={activeTarget !== "NONE"} />
      </div>

      <div className="absolute bottom-16 left-6">
        <HUDLabel title="CAMERA ENGINE" value={isCameraEnabled ? "SCANNING" : "STANDBY"} />
      </div>

      <div className="absolute bottom-16 right-6">
        <HUDLabel title="VOICE INTEGRATION" value={isListening ? "LISTENING" : "READY"} active={isListening} />
      </div>
    </div>
  );
}