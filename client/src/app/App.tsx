import { useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";
import { useVoice } from "../hooks/useVoice";
import { interactionEngine } from "../interaction/interactionEngine";
import { snapshotManager } from "../services/snapshotManager";
import { intentManager } from "../services/intentManager";

export default function App() {
  useSocket();
  useVoice();

  useEffect(() => {
    interactionEngine.initialize();
    snapshotManager.initialize();
    intentManager.initialize();
    return () => {
      interactionEngine.shutdown();
      snapshotManager.shutdown();
      intentManager.shutdown();
    };
  }, []);

  return <MainLayout />;
}