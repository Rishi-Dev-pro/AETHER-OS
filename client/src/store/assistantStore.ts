import { create } from "zustand";

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "INFO" | "WARN" | "SUCCESS" | "AI";
  text: string;
}

interface AssistantState {
  logs: LogEntry[];
  addLog: (text: string, type?: LogEntry["type"]) => void;
  clearLogs: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  logs: [
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString(),
      type: "SUCCESS",
      text: "Aether Vision OS kernel loaded successfully.",
    },
    {
      id: "2",
      timestamp: new Date().toLocaleTimeString(),
      type: "INFO",
      text: "Neural analysis unit ready. Awaiting camera interface.",
    },
  ],
  addLog: (text, type = "INFO") =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-30), // keep last 30 logs
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          type,
          text,
        },
      ],
    })),
  clearLogs: () => set({ logs: [] }),
}));
