import {
  Mic,
  Camera,
  ScanSearch,
  Eye,
  Command,
} from "lucide-react";
import { useCameraStore } from "../../store/cameraStore";
import { useVoiceStore } from "../../store/voiceStore";
import { useVisionStore } from "../../store/visionStore";
import type { VisionMode } from "../../store/visionStore";
import { useAssistantStore } from "../../store/assistantStore";
import { emitCameraStart, emitCameraStop } from "../../services/socket";
import { useState, useEffect } from "react";
import { useInteractive } from "../../interaction/useInteractive";

export default function BottomDock() {
  const { isCameraEnabled, toggleCamera } = useCameraStore();
  const { isListening, toggleListening } = useVoiceStore();
  const { visionMode, setVisionMode } = useVisionStore();
  const { addLog } = useAssistantStore();
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const { ref: micRef, isHovered: isMicHovered, isPressed: isMicPressed } = useInteractive<HTMLButtonElement>("dock-mic");

  useEffect(() => {
    if (isMicHovered) {
      setHoveredBtn("TOGGLE VOICE CONTROL");
    } else if (hoveredBtn === "TOGGLE VOICE CONTROL") {
      setHoveredBtn(null);
    }
  }, [isMicHovered]);

  const micHoverClass = isMicHovered
    ? "border-pink-400/80 bg-pink-500/15 text-pink-300 shadow-[0_0_15px_rgba(244,63,94,0.25)] scale-105"
    : "";
  const micPressClass = isMicPressed
    ? "scale-90 bg-pink-500/35 border-pink-350 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
    : "";

  const handleCameraToggle = () => {
    const willEnable = !isCameraEnabled;
    toggleCamera();

    if (willEnable) {
      emitCameraStart();
      addLog("Video sensor activated.", "SUCCESS");
    } else {
      emitCameraStop();
      addLog("Video sensor deactivated.", "WARN");
    }
  };

  const handleMicToggle = () => {
    toggleListening();
    addLog(
      !isListening
        ? "Voice core activated. Listening..."
        : "Voice core muted.",
      !isListening ? "SUCCESS" : "WARN"
    );
  };

  const cycleVisionMode = () => {
    const modes: VisionMode[] = ["standard", "cyber", "thermal", "sonar"];
    const currentIndex = modes.indexOf(visionMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setVisionMode(nextMode);
    addLog(`Filter: ${nextMode.toUpperCase()}`, "INFO");
  };

  const handleAnalyzeToggle = () => {
    if (!isCameraEnabled) {
      addLog("System offline. Enable Camera sensor.", "WARN");
      return;
    }
    addLog("Analyzing spatial grid node targets...", "INFO");
  };

  const handleCommandTrigger = () => {
    addLog("OS telemetry ping: OK", "AI");
  };

  return (
    <footer className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-8 pt-2 z-50">
      <div className="relative flex items-center justify-center">
        {/* Floating pill container (macOS/Vision Pro style) */}
        <div
          className="
          flex
          items-center
          gap-4
          rounded-full
          border
          border-white/[0.06]
          bg-[#07090f]/75
          px-6
          py-3
          backdrop-blur-2xl
          shadow-[0_24px_50px_rgba(0,0,0,0.65)]
          transition-all
          duration-300
          "
        >
          {/* Tooltip Overlay */}
          {hoveredBtn && (
            <div className="absolute top-[-48px] left-1/2 -translate-x-1/2 px-3 py-1 bg-black/85 border border-white/10 rounded-lg text-[10px] font-mono tracking-wider text-slate-300 pointer-events-none whitespace-nowrap animate-fadeIn shadow-lg">
              {hoveredBtn}
            </div>
          )}

          {/* Left Items */}
          <DockIconButton
            id="camera"
            icon={<Camera size={18} />}
            active={isCameraEnabled}
            onClick={handleCameraToggle}
            onHover={(h) => setHoveredBtn(h ? "TOGGLE CAMERA FEED" : null)}
          />

          <DockIconButton
            id="scan"
            icon={<ScanSearch size={18} />}
            active={isCameraEnabled}
            onClick={handleAnalyzeToggle}
            onHover={(h) => setHoveredBtn(h ? "TRIGGER OBJECT SCAN" : null)}
            disabled={!isCameraEnabled}
          />

          {/* Centered Microphone Element */}
          <div className="px-1.5 relative flex items-center justify-center">
            <button
              ref={micRef}
              onClick={handleMicToggle}
              onMouseEnter={() => setHoveredBtn("TOGGLE VOICE CONTROL")}
              onMouseLeave={() => setHoveredBtn(null)}
              className={`
              relative
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              border
              transition-all
              duration-300
              ease-out
              ${
                isListening
                  ? "border-pink-500/25 bg-pink-500/10 text-pink-400 shadow-[0_4px_16px_rgba(244,63,94,0.15)] hover:scale-105 active:scale-95"
                  : "border-white/[0.06] bg-white/[0.04] text-slate-400 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.08] hover:scale-105 active:scale-95"
              }
              ${micHoverClass}
              ${micPressClass}
              `}
            >
              <Mic size={20} className={isListening ? "animate-pulse" : ""} />

              {/* Minimalist status indicator dot */}
              <span
                className={`
                absolute
                bottom-2
                h-1
                w-1
                rounded-full
                transition-all
                duration-300
                ${isListening ? "bg-pink-500 animate-pulse" : "bg-transparent"}
                `}
              />
            </button>
          </div>

          {/* Right Items */}
          <DockIconButton
            id="vision"
            icon={<Eye size={18} />}
            active={isCameraEnabled}
            onClick={cycleVisionMode}
            onHover={(h) => setHoveredBtn(h ? `HUD FILTER: ${visionMode.toUpperCase()}` : null)}
          />

          <DockIconButton
            id="diagnostic"
            icon={<Command size={18} />}
            active={false}
            onClick={handleCommandTrigger}
            onHover={(h) => setHoveredBtn(h ? "EXECUTE OS DIAGNOSTIC" : null)}
          />
        </div>
      </div>
    </footer>
  );
}

function DockIconButton({
  id,
  icon,
  active,
  onClick,
  onHover,
  disabled = false,
}: {
  id: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  disabled?: boolean;
}) {
  const { ref, isHovered, isPressed } = useInteractive<HTMLButtonElement>(`dock-${id}`);

  useEffect(() => {
    onHover(isHovered);
  }, [isHovered, onHover]);

  const hoverClass = isHovered
    ? "border-cyan-400/80 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-105"
    : "";

  const pressClass = isPressed
    ? "scale-90 bg-cyan-500/30 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
    : "";

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
      flex
      h-11
      w-11
      items-center
      justify-center
      rounded-full
      border
      transition-all
      duration-300
      ease-out
      outline-none
      ${
        disabled
          ? "border-transparent bg-transparent text-slate-800 cursor-not-allowed opacity-20"
          : active
          ? `border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:scale-105 active:scale-95 ${hoverClass} ${pressClass}`
          : `border-white/[0.02] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.08] hover:scale-105 active:scale-95 ${hoverClass} ${pressClass}`
      }
      `}
    >
      {icon}
    </button>
  );
}