import { motion } from "framer-motion";
import BackgroundEffects from "../background/BackgroundEffects";
import TopBar from "./TopBar";
import BottomDock from "./BottomDock";
import CameraViewport from "../viewport/CameraViewport";
import SystemPanel from "../panels/SystemPanel";
import VisionPanel from "../panels/VisionPanel";
import StatsPanel from "../panels/StatsPanel";
import AIPanel from "../panels/AIPanel";
import EventLog from "../panels/EventLog";
import ProviderPanel from "../panels/ProviderPanel";

const panelAnim = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export default function MainLayout() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020308]">
      {/* Background layers */}
      <BackgroundEffects />

      {/* Top bar */}
      <TopBar />

      {/* Main operating area */}
      <main className="absolute inset-0 z-10">
        {/* Camera viewport — centered with margins */}
        <div className="absolute top-[68px] bottom-[88px] left-6 right-6 xl:left-10 xl:right-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full"
          >
            <CameraViewport />
          </motion.div>
        </div>

        {/* ── Left Column: System + Stats ── */}
        <div className="absolute left-10 top-[80px] z-20 space-y-3">
          <motion.div {...panelAnim} transition={{ delay: 0.3, duration: 0.5 }}>
            <SystemPanel />
          </motion.div>
          <motion.div {...panelAnim} transition={{ delay: 0.4, duration: 0.5 }}>
            <StatsPanel />
          </motion.div>
        </div>

        {/* ── Right Column: Vision + Provider + AI + Events ── */}
        <div className="absolute right-10 top-[80px] z-20 space-y-3">
          <motion.div {...panelAnim} transition={{ delay: 0.35, duration: 0.5 }}>
            <VisionPanel />
          </motion.div>
          <motion.div {...panelAnim} transition={{ delay: 0.45, duration: 0.5 }}>
            <ProviderPanel />
          </motion.div>
          <motion.div {...panelAnim} transition={{ delay: 0.55, duration: 0.5 }}>
            <AIPanel />
          </motion.div>
          <motion.div {...panelAnim} transition={{ delay: 0.65, duration: 0.5 }}>
            <EventLog />
          </motion.div>
        </div>
      </main>

      {/* Bottom dock */}
      <BottomDock />
    </div>
  );
}
