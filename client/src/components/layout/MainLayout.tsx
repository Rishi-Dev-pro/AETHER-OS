import TopBar from "./TopBar";
import BottomDock from "./BottomDock";
import CameraViewport from "../camera/CameraViewport";
import GridBackground from "../ui/GridBackground";
import AmbientGlow from "../decorations/AmbientGlow";
import NoiseOverlay from "../decorations/NoiseOverlay";
import SystemWidget from "../widgets/SystemWidget";
import VisionWidget from "../widgets/VisionWidget";
import StatsWidget from "../widgets/StatsWidget";
import ThoughtWidget from "../widgets/ThoughtWidget";

export default function MainLayout() {
  return (
    <div className="relative w-screen h-screen overflow-y-auto bg-[#030407] select-none">
      {/* Background decorations */}
      <AmbientGlow />
      <NoiseOverlay />
      <GridBackground />

      {/* Top Header (Absolute positioned HUD status bar) */}
      <TopBar />

      {/* Main Operating Area (Determinstic absolute layout) */}
      <main className="absolute inset-0 z-10">
        {/* Full-view Camera/Emulation Viewport (Widescreen layout with margins) */}
        <div className="absolute top-[72px] xl:top-[76px] bottom-[92px] xl:bottom-[100px] left-8 xl:left-12 right-8 xl:right-12">
          <CameraViewport />
        </div>

        {/* Floating HUD Panels - perfectly aligned with inner viewport margins */}
        {/* Top Left: OS Status */}
        <div className="absolute left-[52px] xl:left-[72px] top-[92px] xl:top-[100px] z-40 transition-all duration-300 hover:scale-[1.01]">
          <SystemWidget />
        </div>

        {/* Top Right: Neural Matrix View */}
        <div className="absolute right-[52px] xl:right-[72px] top-[92px] xl:top-[100px] z-40 transition-all duration-300 hover:scale-[1.01]">
          <VisionWidget />
        </div>

        {/* Bottom Left: Telemetry Diagnostics */}
        <div className="absolute left-[52px] xl:left-[72px] bottom-[112px] xl:bottom-[124px] z-40 transition-all duration-300 hover:scale-[1.01]">
          <StatsWidget />
        </div>

        {/* Bottom Right: Event logs feed */}
        <div className="absolute right-[52px] xl:right-[72px] bottom-[112px] xl:bottom-[124px] z-40 transition-all duration-300 hover:scale-[1.01]">
          <ThoughtWidget />
        </div>
      </main>

      {/* Bottom Command Dock */}
      <BottomDock />
    </div>
  );
}