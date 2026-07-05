import GlowPanel from "../ui/GlowPanel";

import {
  Eye,
  BrainCircuit,
  Mic,
  Bot,
  Database,
  Settings,
  ChevronRight,
} from "lucide-react";

const modules = [
  {
    title: "Vision Engine",
    subtitle: "Computer Vision",
    icon: Eye,
    active: true,
  },
  {
    title: "Voice Engine",
    subtitle: "Speech Recognition",
    icon: Mic,
    active: true,
  },
  {
    title: "AI Brain",
    subtitle: "Reasoning Core",
    icon: BrainCircuit,
    active: true,
  },
  {
    title: "Automation",
    subtitle: "Desktop Control",
    icon: Bot,
    active: false,
  },
  {
    title: "Memory",
    subtitle: "Long-Term Storage",
    icon: Database,
    active: false,
  },
];

export default function LeftSidebar() {
  return (
    <GlowPanel className="w-[290px] p-6">

      {/* Header */}

      <div className="mb-8">

        <p className="text-[11px] uppercase tracking-[0.45em] text-cyan-300">
          AETHER CORE
        </p>

        <h2 className="mt-3 text-2xl font-bold">
          Modules
        </h2>

      </div>

      {/* Module Cards */}

      <div className="space-y-4">

        {modules.map((module) => {

          const Icon = module.icon;

          return (

            <button
              key={module.title}
              className="
              group
              w-full
              rounded-2xl
              border
              border-white/10
              bg-white/[0.03]
              p-4
              transition-all
              duration-300
              hover:border-cyan-400/30
              hover:bg-cyan-500/5
              "
            >

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">

                  <div
                    className={`
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl

                    ${
                      module.active
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-white/5 text-slate-500"
                    }
                    `}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="text-left">

                    <h3 className="font-medium">
                      {module.title}
                    </h3>

                    <p className="text-xs text-slate-500">
                      {module.subtitle}
                    </p>

                  </div>

                </div>

                {module.active ? (

                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,.8)]" />

                ) : (

                  <ChevronRight
                    size={18}
                    className="text-slate-600 transition group-hover:text-cyan-300"
                  />

                )}

              </div>

            </button>

          );

        })}

      </div>

      {/* Bottom */}

      <div className="mt-auto pt-8">

        <button
          className="
          flex
          w-full
          items-center
          justify-between
          rounded-2xl
          border
          border-white/10
          bg-white/[0.03]
          px-5
          py-4
          transition
          hover:border-cyan-400/30
          "
        >

          <div className="flex items-center gap-3">

            <Settings
              size={18}
              className="text-cyan-300"
            />

            <span>
              Settings
            </span>

          </div>

          <ChevronRight
            size={18}
          />

        </button>

      </div>

    </GlowPanel>
  );
}