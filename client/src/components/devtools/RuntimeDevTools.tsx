import React, { useState, useEffect } from "react";
import {
  X,
  Activity,
  Cpu,
  Radio,
  Layers,
  MessageSquare,
  DollarSign,
  Zap,
  ShieldAlert,
  Server,
  Terminal,
} from "lucide-react";
import { devToolsService } from "../../runtime/devtools/devtools-service";
import { runtimeController } from "../../runtime/frontend/runtime-controller";
import { useConversationStore } from "../../runtime/frontend/conversation-store";
import type { DevToolsTab } from "../../runtime/devtools/devtools-types";
import type { RuntimeDiagnosticsMetricsSnapshot } from "../../runtime/conversation/conversation-types";

import { RuntimeInspectorTab } from "./RuntimeInspectorTab";
import { ProviderMonitorTab } from "./ProviderMonitorTab";
import { EventTimelineTab } from "./EventTimelineTab";
import { ExecutionTraceTab } from "./ExecutionTraceTab";
import { ConversationInspectorTab } from "./ConversationInspectorTab";
import { TokenUsageTab } from "./TokenUsageTab";
import { PerformanceMonitorTab } from "./PerformanceMonitorTab";
import { ResilienceMonitorTab } from "./ResilienceMonitorTab";
import { QueueInspectorTab } from "./QueueInspectorTab";
import { HealthMonitorTab } from "./HealthMonitorTab";
import { DebugConsoleTab } from "./DebugConsoleTab";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RuntimeDevTools: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<DevToolsTab>("runtime");
  const [, setTick] = useState<number>(0);

  // Subscribe to live devToolsService changes
  useEffect(() => {
    const unsubscribe = devToolsService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const inspectorData = devToolsService.getInspectorData();
  const providerData = devToolsService.getProviderData();
  const timelineEvents = devToolsService.getTimelineEvents();
  const executionTraces = devToolsService.getExecutionTraces();
  const healthReport = devToolsService.getHealthReport();
  const debugLogs = devToolsService.getDebugLogs();
  const isPaused = devToolsService.getIsPaused();

  const store = useConversationStore.getState();
  const sessions = store.sessions;
  const activeSessionId = store.activeSessionId;
  const activeSessionMeta = sessions.find((s) => s.sessionId === activeSessionId);
  const turns = (devToolsService as any).runtime?.history() || [];
  const queue = (devToolsService as any).runtime?.getQueueSnapshot() || [];
  const resilienceMetrics = runtimeController.getResilienceMetrics();
  const diagnostics: RuntimeDiagnosticsMetricsSnapshot = {
    activeProvider: inspectorData.activeProvider,
    activeModel: inspectorData.activeModel,
    totalRequests: inspectorData.totalMessages,
    successfulRequests: inspectorData.totalMessages,
    failedRequests: 0,
    averageLatencyMs: inspectorData.lastLatencyMs,
    totalPromptTokens: activeSessionMeta?.tokenUsage?.promptTokens ?? 0,
    totalCompletionTokens: activeSessionMeta?.tokenUsage?.completionTokens ?? 0,
    totalTokens: activeSessionMeta?.tokenUsage?.totalTokens ?? 0,
    estimatedTotalCostUSD: activeSessionMeta?.tokenUsage?.estimatedCostUSD ?? 0,
    conversationMessageCount: inspectorData.totalMessages,
    timestamp: Date.now(),
  };

  const handleRecover = () => {
    runtimeController.recover();
  };

  const handleSwitchSession = (id: string) => {
    runtimeController.switchSession(id);
  };

  const navItems: Array<{ id: DevToolsTab; label: string; icon: React.ReactNode }> = [
    { id: "runtime", label: "Runtime Inspector", icon: <Server className="w-4 h-4" /> },
    { id: "providers", label: "Provider Monitor", icon: <Cpu className="w-4 h-4" /> },
    { id: "timeline", label: "Event Timeline", icon: <Radio className="w-4 h-4" /> },
    { id: "executions", label: "Execution Traces", icon: <Layers className="w-4 h-4" /> },
    { id: "conversations", label: "Conversation", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "tokens", label: "Token & Cost", icon: <DollarSign className="w-4 h-4" /> },
    { id: "performance", label: "Performance", icon: <Zap className="w-4 h-4" /> },
    { id: "resilience", label: "Resilience", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: "queue", label: "Queue Inspector", icon: <Layers className="w-4 h-4" /> },
    { id: "health", label: "Health Monitor", icon: <Activity className="w-4 h-4" /> },
    { id: "logs", label: "Debug Console", icon: <Terminal className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[88vh] rounded-3xl border border-white/[0.12] bg-[#05070d]/95 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 px-6 border-b border-white/[0.08] bg-[#080b14]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
            <h1 className="text-sm font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400">
              AETHER OS RUNTIME DEVTOOLS
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              v1.0.0 (Phase 9.11)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Health:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  healthReport.status === "HEALTHY"
                    ? "text-emerald-400"
                    : healthReport.status === "DEGRADED"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                ● {healthReport.status}
              </span>
            </div>

            <div className="h-4 w-px bg-white/[0.1]" />

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Body Layout: Left Nav + Right Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-56 border-r border-white/[0.08] bg-[#04060b]/90 p-3 space-y-1 overflow-y-auto shrink-0">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <span className={isActive ? "text-cyan-400" : "text-slate-500"}>{item.icon}</span>
                  <span className="tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Main Content Area */}
          <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#060810] to-[#030407]">
            {activeTab === "runtime" && <RuntimeInspectorTab data={inspectorData} onRecover={handleRecover} />}
            {activeTab === "providers" && <ProviderMonitorTab providers={providerData} />}
            {activeTab === "timeline" && (
              <EventTimelineTab
                events={timelineEvents}
                isPaused={isPaused}
                onTogglePause={() => devToolsService.togglePause()}
                onClear={() => devToolsService.clearTimeline()}
              />
            )}
            {activeTab === "executions" && <ExecutionTraceTab traces={executionTraces} />}
            {activeTab === "conversations" && (
              <ConversationInspectorTab
                sessions={sessions}
                activeSessionId={activeSessionId}
                turns={turns}
                onSwitchSession={handleSwitchSession}
              />
            )}
            {activeTab === "tokens" && (
              <TokenUsageTab diagnostics={diagnostics} activeSession={activeSessionMeta} />
            )}
            {activeTab === "performance" && (
              <PerformanceMonitorTab diagnostics={diagnostics} resilience={resilienceMetrics} />
            )}
            {activeTab === "resilience" && (
              <ResilienceMonitorTab resilience={resilienceMetrics} providers={providerData} />
            )}
            {activeTab === "queue" && <QueueInspectorTab queue={queue} />}
            {activeTab === "health" && <HealthMonitorTab report={healthReport} />}
            {activeTab === "logs" && (
              <DebugConsoleTab logs={debugLogs} onClear={() => devToolsService.clearLogs()} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
