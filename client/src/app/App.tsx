import { useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";
import { useVoice } from "../hooks/useVoice";
import { interactionEngine } from "../interaction/interactionEngine";
import { snapshotManager } from "../services/snapshotManager";
import { intentManager } from "../services/intentManager";
import { promptManager } from "../services/promptManager";
import { runtimeController } from "../runtime/frontend";

export default function App() {
  useSocket();
  useVoice();

  useEffect(() => {
    interactionEngine.initialize();
    snapshotManager.initialize();
    intentManager.initialize();
    promptManager.initialize();
    runtimeController.initialize().catch((err) => {
      console.error("Failed to initialize AI runtime controller:", err);
    });

    return () => {
      interactionEngine.shutdown();
      snapshotManager.shutdown();
      intentManager.shutdown();
      promptManager.shutdown();
      runtimeController.destroy();
    };
  }, []);

  return <MainLayout />;
}