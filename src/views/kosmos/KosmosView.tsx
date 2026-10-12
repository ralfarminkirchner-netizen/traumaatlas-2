import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { atlasGraph, edgeTypeLabels, neighborsOf, nodeTypeMeta, type NodeType, type EdgeType } from "@/data/graph";
import { methods } from "@/data/v1/methods";
import { WebGLGate } from "@/viz/WebGLGate";
import { GraphScene, type HoverInfo, type GraphMode } from "./GraphScene";
import { GraphFallback } from "./GraphFallback";
import { NodeCard } from "./NodeCard";
import { EDGE_COLORS } from "./layout";
import { GraphBodiesView } from "../phaenomenautik/GraphBodiesView";

const LENSES: { label: string; types: NodeType[] | null; description: string }[] = [
  { label: "Alle", types: null, description: "Der vollständige Atlas" },
  { label: "Erleben", types: ["symptom", "category"], description: "Phänomene und ihre Themenfelder" },
  { label: "Nervensystem", types: ["state", "phase"], description: "Zustände und Phasen" },
  { label: "Neuroprofile", types: ["profile"], description: "Profile und die Muster, die sie prägen" },
  { label: "Übungen & Alltag", types: ["exercise", "block"], description: "Übungen und Alltagsbausteine" },
  { label: "Verfahren & Schulen", types: ["method", "discipline"], description: "Verfahren, Schulen und ihre Grundlagen" },
];
const MODES: { id: GraphMode; label: string }[] = [
  { id: "constellation", label: "Konstellation" },
  { id: "stammbaum", label: "Zeitkarte" },
  { id: "thema", label: "Verfahrensumfeld" },
];
const control = "rounded-lg border border-white/25 bg-[#161923] px-3 py-2 text-sm text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b483]";

export default function KosmosView() {
  const [mode, setMode] = useState<GraphMode>("constellation");
  const [themeId, setThemeId] = useState("m:emdr");
  const [lensIndex, setLensIndex] = useState(0);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const [showLegend, setShowLegend] = useState(false);
  const [showBodies, setShowBodies] = useState(false);
  const lens = LENSES[lensIndex];
  const lensCount = atlasGraph.nodes.filter((n) => !lens.types || lens.types.includes(n.type)).length;
  const sortedNodes = useMemo(() => [...atlasGraph.nodes].sort((a, b) => a.label.localeCompare(b.label, "de")), []);
  const focusNode = atlasGraph.nodes.find((n) => n.id === focusId);
  const navigate = (id: string | null) => { setHover(null); setFocusId(id); };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-8">
      <section className="pt-6 sm:pt-10" aria-label="Kosmos des Atlas">
        <p className="max-w-3xl text-base leading-relaxed text-white/80">
          {atlasGraph.nodes.length} Knoten, {atlasGraph.edges.length} Beziehungen. Die Karte steht still, bis du sie bewegst.
          Wähle eine Linse oder einen Knoten, um seine Zusammenhänge zu erkunden.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Linsen">
          <span className="mr-2 text-sm font-medium text-white/75">Linse</span>
          {LENSES.map((item, i) => <button key={item.label} type="button" aria-pressed={lensIndex === i}
            onClick={() => { setLensIndex(i); navigate(null); }}
            style={lensIndex === i ? { background: "#d4b483", borderColor: "#d4b483", color: "#17130e" } : undefined}
            className={`${control} transition-colors ${lensIndex === i ? "border-[#d4b483] bg-[#d4b483] text-[#17130e]" : "hover:bg-white/10"}`}>
            {item.label}
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-white/75 sm:min-w-64">
            Knoten finden
            <select className={`${control} w-full`} value={focusId ?? ""} onChange={(e) => navigate(e.target.value || null)}>
              <option value="">Phänomen, Profil oder Verfahren wählen …</option>
              {(Object.keys(nodeTypeMeta) as NodeType[]).map((type) => <optgroup key={type} label={nodeTypeMeta[type].label}>
                {sortedNodes.filter((n) => n.type === type).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </optgroup>)}
            </select>
          </label>
          {!showBodies && <label className="flex flex-col gap-1.5 text-sm text-white/75">
            Anordnung
            <select className={control} value={mode} onChange={(e) => { setMode(e.target.value as GraphMode); navigate(null); }}>
              {MODES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>}
          {!showBodies && mode === "thema" && <label className="flex flex-col gap-1.5 text-sm text-white/75">
            Verfahren
            <select className={control} value={themeId} onChange={(e) => { setThemeId(e.target.value); navigate(null); }}>
              {methods.map((m) => <option key={m.id} value={`m:${m.id}`}>{m.name}</option>)}
            </select>
          </label>}
          <button type="button" className={`${control} flex items-center gap-2 hover:bg-white/10`}
            onClick={() => { navigate(null); setResetNonce((n) => n + 1); }}>
            <RotateCcw size={15} aria-hidden="true" /> Ansicht einpassen
          </button>
          <button type="button" className={`${control} hover:bg-white/10`} aria-pressed={showBodies}
            onClick={() => { setHover(null); setShowBodies((value) => !value); }}>
            {showBodies ? "Zur Kosmoskarte" : "Netz formen"}
          </button>
        </div>
        <p className="my-4 text-sm leading-relaxed text-white/75" aria-live="polite">
          {focusNode ? `${focusNode.label} · ${neighborsOf(focusNode.id).size} direkte Nachbarn. Die übrige Karte tritt zurück.`
            : `${lens.description} · ${lensCount} Knoten in dieser Linse. Die Anordnung bleibt beim Linsenwechsel erhalten.`}
        </p>
        <div className={`grid items-start gap-4 ${focusId ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/20 bg-[#090c14]">
            <div className={showBodies ? "relative h-[1100px] min-h-[900px] lg:h-[820px] lg:min-h-[720px]" : "relative h-[60vh] min-h-[380px] max-h-[760px] sm:h-[70vh] sm:min-h-[500px]"}>
              {showBodies ? <GraphBodiesView selectedId={focusId} onFocus={navigate}
                visibleTypes={lens.types} resetNonce={resetNonce} /> : <WebGLGate className="absolute inset-0" fog={false}
                fallback={<GraphFallback mode={mode} themeId={themeId} visibleTypes={lens.types} focusId={focusId} onFocus={navigate} />}
                camera={{ position: [0, 0, 44], fov: 50 }}>
                <GraphScene key={resetNonce} mode={mode} themeId={themeId} visibleTypes={lens.types}
                  hoverId={hover?.id ?? null} onHover={setHover} focusId={focusId} onFocus={navigate}
                  pulsePath={null} pulseNonce={0} onPulseEnd={() => {}} />
              </WebGLGate>}
              {!showBodies && hover && <div className="pointer-events-none absolute bottom-4 left-4 right-4 w-fit max-w-[calc(100%-2rem)] rounded-lg border border-white/25 bg-[#151a27] px-3 py-2 text-sm text-white">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: nodeTypeMeta[hover.type as NodeType]?.color }} />
                {hover.label}
              </div>}
            </div>
            <p className="border-t border-white/15 px-4 py-3 text-xs leading-relaxed text-white/75">
              In der Raumansicht: Ziehen dreht die Karte · Scrollen oder zwei Finger zoomen · Klick öffnet die Nachbarn.
              Alle Knoten sind auch über „Knoten finden“ erreichbar.
            </p>
          </div>
          {focusId && <NodeCard nodeId={focusId} onClose={() => navigate(null)} onNavigate={navigate} />}
        </div>
        <button type="button" className={`${control} mt-5 hover:bg-white/10`} aria-expanded={showLegend}
          aria-controls="kosmos-legende" onClick={() => setShowLegend((v) => !v)}>
          {showLegend ? "Legende schließen" : "Farben & Beziehungen"}
        </button>
        {showLegend && <div id="kosmos-legende" className="mt-4 grid gap-6 border-t border-white/20 pt-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-white">Knoten</p>
            <ul className="grid gap-2 text-sm text-white/85 sm:grid-cols-2">
              {(Object.keys(nodeTypeMeta) as NodeType[]).map((t) => <li key={t} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: nodeTypeMeta[t].color }} />{nodeTypeMeta[t].label}
              </li>)}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-white">Beziehungen</p>
            <ul className="grid gap-2 text-sm text-white/85 sm:grid-cols-2">
              {(Object.keys(edgeTypeLabels) as EdgeType[]).map((t) => <li key={t} className="flex items-center gap-2">
                <span className="h-0.5 w-5 shrink-0" style={{ background: EDGE_COLORS[t] }} />{edgeTypeLabels[t]}
              </li>)}
            </ul>
          </div>
        </div>}
      </section>
    </div>
  );
}

