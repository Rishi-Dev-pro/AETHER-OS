import { useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";
import { useVoice } from "../hooks/useVoice";
import { interactionEngine } from "../interaction/interactionEngine";
import { snapshotManager } from "../services/snapshotManager";
import { intentManager } from "../services/intentManager";
import { promptManager } from "../services/promptManager";

export default function App() {
  useSocket();
  useVoice();

  useEffect(() => {
    interactionEngine.initialize();
    snapshotManager.initialize();
    intentManager.initialize();
    promptManager.initialize();
    return () => {
      interactionEngine.shutdown();
      snapshotManager.shutdown();
      intentManager.shutdown();
      promptManager.shutdown();
    };
  }, []);

  return <MainLayout />;
}