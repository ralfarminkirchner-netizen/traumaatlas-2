// TRAUMAATLAS 3 — „Das Meer der Phänomene"
// Die App IST das Meer: Vollbühne Wasser, Inseln als Kapitel, Phänomene im Wasser.
// Kapitel öffnen sich als Vollbühnen-Overlay über dem Meer.

import { Suspense, lazy, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AkutBar } from "@/components/AkutBar";
import { Disclaimer } from "@/components/Disclaimer";
import { OceanStage } from "@/ocean/OceanStage";
import { useOcean, closeView, islandById, type IslandId } from "@/ocean/world";
import { setState } from "@/state/atlas-store";

const KosmosView = lazy(() => import("@/views/kosmos/KosmosView"));
const KaskadeView = lazy(() => import("@/views/kaskade/KaskadeView"));
const PolyvagalView = lazy(() => import("@/views/polyvagal/PolyvagalView"));
const ToleranzView = lazy(() => import("@/views/toleranz/ToleranzView"));
const NavigatorView = lazy(() => import("@/views/navigator/NavigatorView"));
const LexikonView = lazy(() => import("@/views/lexikon/LexikonView"));
const StammbaumView = lazy(() => import("@/views/stammbaum/StammbaumView"));
const BaukastenView = lazy(() => import("@/views/baukasten/BaukastenView"));
const WechselView = lazy(() => import("@/views/wechsel/WechselView"));
const WegweiserView = lazy(() => import("@/views/wegweiser/WegweiserView"));

const VIEWS: Record<IslandId, React.ComponentType> = {
  kosmos: KosmosView,
  kaskade: KaskadeView,
  polyvagal: PolyvagalView,
  toleranz: ToleranzView,
  navigator: NavigatorView,
  lexikon: LexikonView,
  stammbaum: StammbaumView,
  baukasten: BaukastenView,
  wechsel: WechselView,
  wegweiser: WegweiserView,
};

function ViewLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Kapitel wird geladen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e2a35c]/20 border-t-[#e2a35c]" />
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kapitel lädt</p>
      </div>
    </div>
  );
}

/** Vollbühne über dem Meer: das geöffnete Kapitel. */
function ChapterStage({ id }: { id: IslandId }) {
  const Active = VIEWS[id];
  const isl = islandById.get(id)!;

  // Atlas-Store mitführen (Views lesen daraus Auswahl/Erregung)
  useEffect(() => {
    setState({ view: id });
    document.title = `TRAUMAATLAS 3 — ${isl.title}`;
  }, [id, isl.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-40 flex flex-col bg-[#0b0806]/[0.97] backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`Kapitel: ${isl.title}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={closeView}
            className="flex items-center gap-2 rounded-full border border-[#e2b35c]/30 px-3.5 py-1.5 text-[12px] uppercase tracking-wider text-[#e8c9a0] transition hover:border-[#e2b35c]/60 hover:bg-[#e2b35c]/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Zurück ans Meer
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#e8c9a0]/60">
              {isl.index} · {isl.kicker}
            </p>
            <h1 className="font-display text-xl text-[#ede4d4] sm:text-2xl">{isl.title}</h1>
          </div>
        </div>
        <p className="hidden max-w-sm text-right text-[11px] leading-relaxed text-white/35 md:block">
          ESC kehrt ans Meer zurück. Das Wasser bleibt unter dir weiter.
        </p>
      </header>

      <div className="ta3-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<ViewLoader />}>
          <main className="view-fade mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-8">
            <Active />
            <div className="mt-10">
              <Disclaimer />
            </div>
            <footer className="mt-8 border-t border-white/[0.06] pt-6 pb-10">
              <p className="text-xs text-white/30">
                TRAUMAATLAS 3 — Das Meer der Phänomene · Akut: Telefonseelsorge 0800 111 0 111 · Hilfetelefon 116 016 · Notfall 112
              </p>
            </footer>
          </main>
        </Suspense>
      </div>
    </motion.div>
  );
}

export default function App() {
  const { view } = useOcean();

  useEffect(() => {
    if (!view) document.title = "TRAUMAATLAS 3 — Das Meer der Phänomene";
  }, [view]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#041014] font-body text-[#ede4d4]">
      <a
        href="#ta3-chapter-jump"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-16 focus:z-[70] focus:rounded-lg focus:bg-[#e2a35c] focus:px-4 focus:py-2 focus:text-sm focus:text-black"
      >
        Zum Kapitel-Menü springen
      </a>
      <AkutBar />

      {/* Das Meer — immer präsent, immer erlebbar */}
      <div className="absolute inset-0 top-9">
        <OceanStage onSail={() => undefined} />
      </div>

      {/* Kapitel-Vollbühne */}
      <AnimatePresence>
        {view && <ChapterStage key={view} id={view} />}
      </AnimatePresence>
    </div>
  );
}
