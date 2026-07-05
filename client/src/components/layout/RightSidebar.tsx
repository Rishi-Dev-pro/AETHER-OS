import GlowPanel from "../ui/GlowPanel";
import StatusChip from "../ui/StatusChip";

export default function RightSidebar() {
  return (
    <GlowPanel className="w-80 p-5">

      <h2 className="mb-6 text-xs uppercase tracking-[0.35em] text-slate-500">
        AI STATUS
      </h2>

      <div className="space-y-4">

        <StatusChip label="AI READY" />

        <StatusChip label="FACE DETECTION" />

        <StatusChip label="OBJECT TRACKING" />

      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4">

        <p className="text-sm text-slate-400">
          Waiting for webcam...
        </p>

      </div>

    </GlowPanel>
  );
}