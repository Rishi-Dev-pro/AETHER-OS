import { useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";
import { useVoice } from "../hooks/useVoice";
import { interactionEngine } from "../interaction/interactionEngine";

export default function App() {
  useSocket();
  useVoice();

  useEffect(() => {
    interactionEngine.initialize();
    return () => {
      interactionEngine.shutdown();
    };
  }, []);

  return <MainLayout />;
}