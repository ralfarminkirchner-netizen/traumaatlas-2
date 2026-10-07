import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { GitFork, Orbit, Play, RotateCcw, Table2, Waypoints } from "lucide-react";
import { edgeTypeLabels, nodeTypeMeta, type EdgeType, type NodeType } from "@/data/graph";
import { methods } from "@/data/v1/methods";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { WebGLGate } from "@/viz/WebGLGate";
import { GraphScene, type GraphMode, type HoverInfo } from "./GraphScene";
import { GraphFallback } from "./GraphFallback";
import { NodeCard } from "./NodeCard";
import { HERO } from "@/views/chapters";
import { EDGE_COLORS } from "./layout";
import { PORTRAIT_CREDITS } from "./nodeAssets";

const MODES: { id: GraphMode; label: string; icon: React.ReactNode }[] = [
  { id: "constellation", label: "Konstellation", icon: <Orbit className="h-3.5 w-3.5" aria-hidden /> },
  { id: "stammbaum", label: "Stammbaum", icon: <GitFork className="h-3.5 w-3.5" aria-hidden /> },
  { id: "thema", label: "Thema", icon: <Waypoints className="h-3.5 w-3.5" aria-hidden /> },
];

// Kuratierte Lichtpfade: Symptom → Verfahren → Übung
const PULSE_PATHS: { label: string; path: string[] }[] = [
  { label: "Flashback → EMDR → Sicherer Ort", path: ["flashbacks", "m:emdr", "e:sicherer-ort"] },
  { label: "Herzrasen → Brainspotting → Voo-Klang", path: ["herzrasen", "m:brainspotting", "e:voo"] },
  { label: "Erstarrung → Sensomotorik → Aktivieren", path: ["erstarrung", "m:sp", "e:aktivieren"] },
];

export default function KosmosView() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<GraphMode>("constellation");
  const [themeId, setThemeId] = useState<string>("m:emdr");
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [pulsePath, setPulsePath] = useState<string[] | null>(null);
  const [pulseNonce, setPulseNonce] = useState(0);
  const [chronNonce, setChronNonce] = useState(0);
  const [showLegend, setShowLegend] = useState(false);

  const hoverNode = useMemo(
    () => (hover ? { ...hover, meta: nodeTypeMeta[hover.type as NodeType] } : null),
    [hover],
  );

  return (
    <div>
      <section className="w-full px-1 py-2" aria-label="Der große Graph">
        <p className="mb-3 max-w-3xl text-sm leading-relaxed text-white/55">
          {HERO.kosmos.sub} Zoomen Sie durch den Kosmos, berühren Sie Knoten, klicken Sie für die Detailkarte.
          Porträts zeigen echte, gemeinfreie Fotos — wo kein freies Foto existiert, eine gekennzeichnete künstlerische Darstellung.
        </p>

        {/* Steuerung */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Graph-Modus" className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  mode === m.id ? "bg-[#e2a35c]/15 text-[#e8c9a0]" : "text-white/55 hover:text-white/85"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {mode === "thema" && (
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="text-xs text-white/45">Verfahren</span>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="rounded bg-transparent text-xs text-[#e8c9a0] focus:outline-none [&>option]:bg-[#14100b]"
                aria-label="Thema wählen"
              >
                {methods.map((m) => (
                  <option key={m.id} value={`m:${m.id}`}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            onClick={() => {
              setPulsePath(PULSE_PATHS[0].path);
              setPulseNonce((n) => n + 1);
            }}
            disabled={reduced}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white disabled:opacity-40"
            title={reduced ? "Bei reduzierter Bewegung deaktiviert" : "Lichtpuls wandert einen Beziehungspfad"}
          >
            <Play className="h-3.5 w-3.5" aria-hidden /> Pfad-Animation
          </button>

          <button
            onClick={() => setChronNonce((n) => n + 1)}
            disabled={reduced}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white disabled:opacity-40"
            title="Graph baut sich chronologisch nach Jahr auf"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Chronologie
          </button>

          <button
            onClick={() => setShowLegend((v) => !v)}
            aria-expanded={showLegend}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 hover:text-white"
          >
            <Table2 className="h-3.5 w-3.5" aria-hidden /> Legende
          </button>
        </div>

        {/* Pfad-Auswahl (erscheint nach Start) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PULSE_PATHS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setPulsePath(p.path);
                setPulseNonce((n) => n + 1);
              }}
              disabled={reduced}
              className={`edge-chip !py-1 text-white/60 transition-colors hover:text-[#e8c9a0] disabled:opacity-40 ${
                JSON.stringify(pulsePath) === JSON.stringify(p.path) ? "!border-[#e2a35c]/50 !text-[#e2a35c]" : ""
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Graph-Bühne: VOLLE Bühne */}
        <div className="vignette relative h-[76vh] min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906]">
          <WebGLGate
            className="absolute inset-0"
            fallback={
              <div className="h-full overflow-y-auto p-3">
                <GraphFallback />
              </div>
            }
            camera={{ position: [0, 1.2, 13], fov: 50 }}
          >
            <GraphScene
              key={chronNonce}
              mode={mode}
              themeId={themeId}
              hoverId={hover?.id ?? null}
              onHover={setHover}
              focusId={focusId}
              onFocus={setFocusId}
              pulsePath={pulsePath}
              pulseNonce={pulseNonce}
              onPulseEnd={() => setPulsePath(null)}
            />
          </WebGLGate>

          {/* Hover-Chip */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 min-h-[2rem]" aria-live="polite">
            <AnimatePresence>
              {hoverNode && (
                <div className="glass-slide flex items-center gap-2 rounded-full px-4 py-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: hoverNode.meta.color, boxShadow: `0 0 8px ${hoverNode.meta.color}` }} />
                  <span className="text-sm text-[#f3e7d3]">{hoverNode.label}</span>
                  <span className="text-xs text-white/45">{hoverNode.meta.label}</span>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Modus-Hinweis */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/55 backdrop-blur-sm">
            {mode === "constellation" && "Force-Konstellation · Ziehen = Drehen · Scrollen = Zoom"}
            {mode === "stammbaum" && "Jahr-Landschaft · Kamera wandert entlang der Zeit"}
            {mode === "thema" && "Thema-Modus · Nur das Umfeld des gewählten Verfahrens"}
          </div>

          {/* Detailkarte */}
          <AnimatePresence>
            {focusId && <NodeCard nodeId={focusId} onClose={() => setFocusId(null)} onNavigate={(id) => setFocusId(id)} />}
          </AnimatePresence>
        </div>

        {/* Legende */}
        <AnimatePresence>
          {showLegend && (
            <div className="mt-4 grid gap-4 rounded-2xl glass-soft p-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Knoten — acht Welten</p>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {(Object.keys(nodeTypeMeta) as NodeType[]).map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: nodeTypeMeta[t].color, boxShadow: `0 0 6px ${nodeTypeMeta[t].color}` }} />
                      {nodeTypeMeta[t].label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Kanten — acht Beziehungstypen</p>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {(Object.keys(edgeTypeLabels) as EdgeType[]).map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="h-0.5 w-5 rounded" style={{ background: EDGE_COLORS[t] }} />
                      {edgeTypeLabels[t]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Porträt-Credits */}
        <details className="mt-6 rounded-2xl glass-soft p-4">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/70">
            Bildquellen der Porträts
          </summary>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PORTRAIT_CREDITS.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-[12px] text-white/55">
                <span className="text-white/75">{c.name}</span>
                <span className="text-right text-white/40">{c.source} · {c.license}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
