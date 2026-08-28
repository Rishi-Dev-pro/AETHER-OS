import React from "react";
import { Layers, Play, Clock } from "lucide-react";
import type { QueueItem } from "../../runtime/conversation/conversation-types";

interface Props {
  queue: ReadonlyArray<QueueItem>;
}

export const QueueInspectorTab: React.FC<Props> = ({ queue }) => {
  const isProcessing = queue.some((q) => q.status === "RUNNING");
  const pendingCount = queue.filter((q) => q.status === "QUEUED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Execution Queue Backlog</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inspection of the FIFO task serializer ensuring turn isolation and deadlock-free processing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border ${
              isProcessing
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                : "bg-slate-500/20 text-slate-300 border-slate-500/40"
            }`}
          >
            STATUS: {isProcessing ? "PROCESSING ACTIVE" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Queue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Total in Queue</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-xl font-black text-white font-mono">{queue.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Serialized tasks</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Active Task</span>
            <Play className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-black text-cyan-300 font-mono">
            {isProcessing ? "1 In-Flight" : "None"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Lock acquired</div>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Pending Waiting</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-xl font-black text-purple-300 font-mono">{pendingCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Waiting in FIFO queue</div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#07090f]/80 backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Queue Task Entries</h3>

        {queue.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            Execution queue is completely clear. Ready for incoming speech and text turns.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((task, i) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-white/[0.06] bg-black/40 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 font-bold">#{i + 1}</span>
                  <span className="font-mono text-white font-bold">{task.id}</span>
                  <span className="text-slate-300 font-mono max-w-[280px] truncate">{task.prompt}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[10px] text-slate-400">
                    Enqueued: {new Date(task.enqueuedAt).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      task.status === "RUNNING"
                        ? "bg-cyan-500/20 text-cyan-300"
                        : task.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
