/**
 * AETHER OS — Phase 10: AI Desktop Task Automation
 * Milestone 5 Component: HUD Visual Action Feedback Pill (`ActionNotificationPill.tsx`)
 *
 * @file ActionNotificationPill.tsx
 * @description Floating cyber-glassmorphic HUD notification banner displaying real-time
 * desktop action execution states, live progress spinners, latency metrics, and completion feedback.
 */

import React, { useState, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  AppWindow,
  XCircle,
  Search,
  Globe,
  Compass,
  Volume2,
  VolumeX,
  Lock,
  Camera,
  Cpu,
  MousePointer,
  Type,
  X,
} from "lucide-react";
import { useActionStore } from "../../store/actionStore";
import type { DesktopActionType } from "../../types/desktopAction";

const ACTION_ICONS: Record<DesktopActionType, React.ReactNode> = {
  open_app: <AppWindow className="w-3.5 h-3.5" />,
  close_app: <XCircle className="w-3.5 h-3.5" />,
  search_web: <Search className="w-3.5 h-3.5" />,
  open_url: <Globe className="w-3.5 h-3.5" />,
  navigate: <Compass className="w-3.5 h-3.5" />,
  adjust_volume: <Volume2 className="w-3.5 h-3.5" />,
  mute_volume: <VolumeX className="w-3.5 h-3.5" />,
  unmute_volume: <Volume2 className="w-3.5 h-3.5" />,
  lock_workstation: <Lock className="w-3.5 h-3.5" />,
  lock_screen: <Lock className="w-3.5 h-3.5" />,
  get_system_info: <Cpu className="w-3.5 h-3.5" />,
  take_screenshot: <Camera className="w-3.5 h-3.5" />,
  click_target: <MousePointer className="w-3.5 h-3.5" />,
  type_text: <Type className="w-3.5 h-3.5" />,
};

const ACTION_LABELS: Record<DesktopActionType, string> = {
  open_app: "OPEN APP",
  close_app: "CLOSE APP",
  search_web: "SEARCH WEB",
  open_url: "OPEN URL",
  navigate: "NAVIGATE",
  adjust_volume: "ADJUST VOLUME",
  mute_volume: "MUTE",
  unmute_volume: "UNMUTE",
  lock_workstation: "LOCK WORKSTATION",
  lock_screen: "LOCK SCREEN",
  get_system_info: "SYSTEM INFO",
  take_screenshot: "SCREENSHOT",
  click_target: "CLICK TARGET",
  type_text: "TYPE TEXT",
};

export const ActionNotificationPill: React.FC = () => {
  const activeAction = useActionStore((state) => state.activeAction);
  const lastResult = useActionStore((state) => state.lastResult);
  const isExecuting = useActionStore((state) => state.isExecuting);

  const [dismissedExecutionId, setDismissedExecutionId] = useState<string | null>(null);
  const [dismissedResultId, setDismissedResultId] = useState<string | null>(null);
  const [expiredResultId, setExpiredResultId] = useState<string | null>(null);

  // Expire completion notification after 4s
  useEffect(() => {
    if (!isExecuting && lastResult) {
      const timer = setTimeout(() => {
        setExpiredResultId(lastResult.actionId);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isExecuting, lastResult]);

  const isExecutingPill = Boolean(isExecuting && activeAction);
  const isCompletedPill = Boolean(
    !isExecuting &&
      lastResult &&
      expiredResultId !== lastResult.actionId
  );

  const isVisible = isExecutingPill || isCompletedPill;
  const isDismissed = isExecutingPill
    ? activeAction?.actionId === dismissedExecutionId
    : isCompletedPill
    ? lastResult?.actionId === dismissedResultId
    : false;

  if (!isVisible || isDismissed) return null;

  const currentType = (activeAction?.type || lastResult?.type || "open_app") as DesktopActionType;
  const icon = ACTION_ICONS[currentType] || <ExternalLink className="w-3.5 h-3.5" />;
  const label = ACTION_LABELS[currentType] || currentType.toUpperCase();

  const getTargetDescription = (): string => {
    if (activeAction) {
      if (activeAction.target) return activeAction.target;
      const p = activeAction.params;
      if (p) {
        if (p.app) return String(p.app);
        if (p.query) return `"${p.query}"`;
        if (p.url) return String(p.url);
        if (p.direction) return `Direction: ${p.direction}`;
        if (p.command) return `Cmd: ${p.command}`;
      }
    }
    if (lastResult?.message) {
      return lastResult.message;
    }
    return "Executing system task...";
  };

  const isSuccess = !isExecuting && lastResult && lastResult.success;
  const isFailed = !isExecuting && lastResult && !lastResult.success;

  const handleDismiss = () => {
    if (isExecutingPill && activeAction) {
      setDismissedExecutionId(activeAction.actionId);
    } else if (isCompletedPill && lastResult) {
      setDismissedResultId(lastResult.actionId);
    }
  };

  return (
    <div
      data-testid="action-notification-pill"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform opacity-100 translate-y-0"
    >
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all ${
          isExecuting
            ? "bg-[#070b16]/90 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.35)] text-cyan-200"
            : isSuccess
            ? "bg-[#06140e]/90 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-emerald-200"
            : isFailed
            ? "bg-[#18090d]/90 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.3)] text-rose-200"
            : "bg-[#070b16]/90 border-cyan-500/30 text-cyan-200"
        }`}
      >
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-xl border ${
            isExecuting
              ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
              : isSuccess
              ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
              : "bg-rose-500/20 border-rose-400/50 text-rose-300"
          }`}
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-[0.16em] uppercase opacity-75">
              {icon}
              {label}
            </span>
            {!isExecuting && lastResult && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-slate-300">
                {lastResult.durationMs}ms
              </span>
            )}
          </div>
          <span className="text-xs font-medium tracking-wide max-w-[280px] sm:max-w-[360px] truncate text-white">
            {getTargetDescription()}
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="ml-1 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.1] transition-colors"
          aria-label="Dismiss action notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ActionNotificationPill;
