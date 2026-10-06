import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Orbit, X } from "lucide-react";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState, type ViewId } from "@/state/atlas-store";

const ALL: { id: ViewId; label: string; num: string }[] = [
  { id: "start", label: "Start", num: "◦" },
  { id: "kosmos", label: "Der große Graph", num: "01" },
  ...CHAPTERS.map((c) => ({ id: c.id, label: c.title, num: c.index })),
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { view } = useAtlasState();
  return (
    <ul className="flex flex-col gap-0.5">
      {ALL.map((item) => {
        const active = view === item.id;
        return (
          <li key={item.id}>
            <button
              onClick={() => {
                setState({ view: item.id });
                onNavigate?.();
                window.scrollTo({ top: 0 });
              }}
              aria-current={active ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors ${
                active ? "bg-white/[0.07] text-[#e8c9a0]" : "text-white/55 hover:bg-white/[0.04] hover:text-white/85"
              }`}
            >
              <span
                className={`w-6 text-[10px] tabular-nums tracking-wider ${
                  active ? "text-[#e2a35c]" : "text-white/30 group-hover:text-white/50"
                }`}
              >
                {item.num}
              </span>
              <span className="text-[13px] leading-tight">{item.label}</span>
              {active && <span className="ml-auto h-1 w-1 rounded-full bg-[#e2a35c] shadow-[0_0_8px_#e2a35c]" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Seitliche Kapitel-Navigation (Desktop) + Sheet (Mobile). */
export function AtlasNav() {
  const [open, setOpen] = useState(false);
  const { view } = useAtlasState();
  const current = ALL.find((a) => a.id === view);

  return (
    <>
      {/* Desktop-Rail */}
      <nav
        aria-label="Kapitel"
        className="fixed bottom-6 left-6 top-24 z-40 hidden w-60 flex-col overflow-y-auto scrollbar-thin rounded-2xl glass p-3 lg:flex"
      >
        <p className="mb-2 flex items-center gap-2 px-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
          <Orbit className="h-3.5 w-3.5 text-[#e2a35c]" aria-hidden /> Beziehungsuniversum
        </p>
        <NavItems />
      </nav>

      {/* Mobile-Header */}
      <div className="fixed inset-x-0 top-9 z-40 flex items-center justify-between border-b border-white/[0.06] bg-[#0e0b08]/80 px-4 py-2 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80"
          aria-label="Kapitel-Menü öffnen"
        >
          <Menu className="h-4 w-4" aria-hidden />
          <span className="max-w-[55vw] truncate font-display">{current?.label ?? "Menü"}</span>
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">Traumaatlas 2</span>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto bg-[#14100b] p-4 scrollbar-thin lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
                  <Orbit className="h-4 w-4 text-[#e2a35c]" aria-hidden /> Kapitel
                </p>
                <button onClick={() => setOpen(false)} aria-label="Menü schließen" className="rounded-lg p-1.5 text-white/60 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
