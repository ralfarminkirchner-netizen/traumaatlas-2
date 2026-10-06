import { useMemo, useState } from "react";
import { atlasGraph, edgeTypeLabels, neighborsOf, nodeTypeMeta, type AtlasNode } from "@/data/graph";

/**
 * Statische SVG-Version des Kosmos-Graphen.
 * Ersatz bei fehlendem WebGL2 oder prefers-reduced-motion:
 * vollständig lesbar, Hover per Fokus, Klick zeigt Nachbarn.
 */
export function GraphFallback() {
  const [selected, setSelected] = useState<string | null>(null);

  const { positions, edges, neighbors } = useMemo(() => {
    const typeOrder = ["discipline", "method", "exercise", "symptom", "category", "state", "phase", "block"] as const;
    const positions = new Map<string, { x: number; y: number }>();
    const cx = 500;
    const cy = 320;
    const nodesByType = new Map<string, AtlasNode[]>();
    for (const n of atlasGraph.nodes) {
      const arr = nodesByType.get(n.type) ?? [];
      arr.push(n);
      nodesByType.set(n.type, arr);
    }
    typeOrder.forEach((t, ti) => {
      const list = nodesByType.get(t) ?? [];
      const angle = (ti / typeOrder.length) * Math.PI * 2 - Math.PI / 2;
      const R = t === "state" || t === "phase" ? 90 : 235;
      const ax = cx + Math.cos(angle) * R;
      const ay = cy + Math.sin(angle) * R * 0.72;
      list.forEach((n, i) => {
        const k = i - (list.length - 1) / 2;
        const spread = Math.min(120, list.length * 7);
        const px = ax + Math.cos(angle + Math.PI / 2) * k * (spread / Math.max(list.length, 1)) + ((i * 37) % 23) - 11;
        const py = ay + Math.sin(angle + Math.PI / 2) * k * (spread / Math.max(list.length, 1)) * 0.8 + ((i * 53) % 19) - 9;
        positions.set(n.id, { x: px, y: py });
      });
    });
    const neighbors = selected ? neighborsOf(selected) : null;
    return { positions, edges: atlasGraph.edges, neighbors };
  }, [selected]);

  const selNode = selected ? atlasGraph.nodes.find((n) => n.id === selected) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="glass-soft overflow-x-auto rounded-2xl p-2">
        <svg viewBox="0 0 1000 640" className="min-w-[720px]" role="img" aria-label="Statischer Beziehungsgraph: 124 Knoten und 329 Kanten">
          <rect width="1000" height="640" fill="#0e0b08" rx="12" />
          {/* Kanten */}
          {edges.map((e) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            const hot = selected !== null && (e.from === selected || e.to === selected);
            const dim = selected !== null && !hot;
            const color = { abstammung: "#9aa8c7", fundierung: "#d9a05b", behandlt: "#e2a35c", reguliert: "#7fb8a4", phase: "#d4b483", kategorie: "#b48ea3", erregung: "#c98a8a", zielzustand: "#a3b18a" }[e.type] ?? "#666";
            return (
              <line
                key={e.id}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={color}
                strokeOpacity={dim ? 0.05 : hot ? 0.9 : 0.18}
                strokeWidth={hot ? 1.6 : 0.7}
              />
            );
          })}
          {/* Knoten */}
          {atlasGraph.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const meta = nodeTypeMeta[n.type];
            const isSel = n.id === selected;
            const isNb = neighbors?.has(n.id) ?? false;
            const dim = selected !== null && !isSel && !isNb;
            const r = n.type === "state" ? 9 : n.type === "phase" ? 8 : n.type === "method" ? 6.5 : n.type === "discipline" ? 5.5 : 4;
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.25 : 1}>
                {isSel && <circle r={r + 6} fill="none" stroke={meta.color} strokeOpacity={0.5} strokeWidth={1.5} />}
                <circle
                  r={r}
                  fill={meta.color}
                  fillOpacity={isSel || isNb ? 0.95 : 0.75}
                  stroke={meta.color}
                  strokeOpacity={0.9}
                  strokeWidth={1}
                  className="cursor-pointer"
                  onClick={() => setSelected(isSel ? null : n.id)}
                >
                  <title>{`${n.label} — ${meta.label}`}</title>
                </circle>
                {(isSel || isNb) && (
                  <text y={-r - 5} textAnchor="middle" fontSize={isSel ? 13 : 10} fill="#f3e7d3" fontWeight={isSel ? 600 : 400}>
                    {n.label.length > 26 ? n.label.slice(0, 24) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="px-3 pb-2 text-xs text-white/40">
          {atlasGraph.nodes.length} Knoten · {atlasGraph.edges.length} Kanten — statische Ansicht (reduzierte Bewegung / kein WebGL). Klicken Sie einen Knoten an, um seine Beziehungen zu sehen.
        </p>
      </div>

      {/* Detail-Karte */}
      <aside className="glass rounded-2xl p-5 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        {selNode ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: nodeTypeMeta[selNode.type].color }}>
              {nodeTypeMeta[selNode.type].label}
            </p>
            <h3 className="font-display mt-2 text-xl text-[#f3e7d3]">{selNode.label}</h3>
            {selNode.sub && <p className="mt-1 text-sm text-white/55">{selNode.sub}</p>}
            {(selNode.year !== undefined || selNode.summary) && (
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {selNode.year !== undefined ? <span className="mr-2 rounded bg-white/[0.06] px-2 py-0.5 text-xs text-[#e2a35c]">{selNode.year}</span> : null}
                {selNode.summary}
              </p>
            )}
            <div className="hairline-glow my-4" />
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Direkte Beziehungen</p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
              {[...neighborsOf(selNode.id)].slice(0, 40).map((nb) => {
                const node = atlasGraph.nodes.find((n) => n.id === nb);
                if (!node) return null;
                const edge = atlasGraph.edges.find(
                  (e) => (e.from === selNode.id && e.to === nb) || (e.to === selNode.id && e.from === nb),
                );
                return (
                  <li key={nb} className="flex items-baseline justify-between gap-2 text-sm">
                    <button className="text-left text-white/80 hover:text-[#e8c9a0]" onClick={() => setSelected(nb)}>
                      {node.label}
                    </button>
                    <span className="shrink-0 text-[10px] text-white/35">{edge ? edgeTypeLabels[edge.type] : ""}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div>
            <h3 className="font-display text-lg text-[#f3e7d3]">Der Kosmos als Landkarte</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Jeder Kreis ist ein Knoten des Atlas — Disziplinen, Verfahren, Übungen, Symptome,
              Kategorien, Nervensystem-Zustände, Phasen und Alltagsbausteine. Die Linien sind
              Beziehungen: {Object.values(edgeTypeLabels).join(" · ").toLowerCase()}.
            </p>
            <p className="mt-3 text-sm text-white/45">Wählen Sie einen Knoten, um Details und Nachbarn zu sehen.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
