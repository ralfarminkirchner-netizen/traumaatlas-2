import { Suspense, lazy, useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { AkutBar } from "@/components/AkutBar";
import { AtlasNav } from "@/components/AtlasNav";
import { useAtlasState, type ViewId } from "@/state/atlas-store";

// Lazy loading je Kapitel (Performance: Ziel 60 fps / Ladezeit < 5 s)
const StartView = lazy(() => import("@/views/start/StartView"));
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

const VIEWS: Record<ViewId, React.ComponentType> = {
  start: StartView,
  kosmos: KosmosView,
  koerper: KaskadeView, // „Körper/Kaskade" bilden eine choreografierte Sequenz
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
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Kapitel wird geladen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e2a35c]/20 border-t-[#e2a35c]" />
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Kapitel lädt</p>
      </div>
    </div>
  );
}

export default function App() {
  const { view } = useAtlasState();
  const Active = VIEWS[view] ?? StartView;

  useEffect(() => {
    document.title = `TRAUMAATLAS 2 — ${view === "start" ? "Das Beziehungsuniversum" : view.charAt(0).toUpperCase() + view.slice(1)}`;
  }, [view]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0e0b08] font-body text-[#ede4d4]">
      <a
        href="#chapter-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-[#e2a35c] focus:px-4 focus:py-2 focus:text-sm focus:text-black"
      >
        Zum Inhalt springen
      </a>
      <AkutBar />
      <AtlasNav />

      <main id="chapter-content" className="lg:pl-72" key={view}>
        <Suspense fallback={<ViewLoader />}>
          <div className="view-fade pt-16 lg:pt-0">
            <Active />
          </div>
        </Suspense>
      </main>

      <footer className="border-t border-white/[0.06] py-10 lg:pl-72">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <p className="font-display text-lg text-[#e8c9a0]">TRAUMAATLAS 2 — Das Beziehungsuniversum</p>
          <p className="mt-2 max-w-2xl text-sm text-white/45">
            Ein orientierender Atlas über Traumafolgen, das Nervensystem und Wege der Heilung.
            Er ersetzt keine Psychotherapie. Alle Verdachtsmuster sind Orientierung, keine Diagnose.
          </p>
          <p className="mt-4 text-xs text-white/30">
            Akut: Telefonseelsorge 0800 111 0 111 · Hilfetelefon 116 016 · Notfall 112
          </p>
        </div>
      </footer>
      </div>
    </MotionConfig>
  );
}
