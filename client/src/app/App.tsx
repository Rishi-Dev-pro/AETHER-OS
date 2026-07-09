import { useEffect } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useSocket } from "../hooks/useSocket";
import { interactionEngine } from "../interaction/interactionEngine";

export default function App() {
  useSocket();

  useEffect(() => {
    interactionEngine.initialize();
    return () => {
      interactionEngine.shutdown();
    };
  }, []);

  return <MainLayout />;
}