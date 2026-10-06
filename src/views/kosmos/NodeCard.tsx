import { useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { atlasGraph, edgeTypeLabels, neighborsOf, nodeTypeMeta, type AtlasEdge } from "@/data/graph";

/** Mini-Subgraph: fokussierter Knoten + direkte Nachbarn als SVG-Orbit (klickbar). */
function MiniSubgraph({ nodeId, onNavigate }: { nodeId: string; onNavigate: (id: string) => void }) {
  const { center, satellites } = useMemo(() => {
    const neighbors = [...neighborsOf(nodeId)].slice(0, 12);
    const node = atlasGraph.nodes.find((n) => n.id === nodeId);
    const satellites = neighbors
      .map((id, i) => {
        const n = atlasGraph.nodes.find((x) => x.id === id);
        const angle = (i / Math.max(neighbors.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const edge = atlasGraph.edges.find(
          (e: AtlasEdge) => (e.from === nodeId && e.to === id) || (e.to === nodeId && e.from === id),
        );
        return {
          id,
          label: n?.label ?? id,
          type: n?.type ?? "discipline",
          x: 130 + Math.cos(angle) * 92,
          y: 96 + Math.sin(angle) * 74,
          relation: edge ? edgeTypeLabels[edge.type] : "",
        };
      })
      .filter((s) => s.label);
    return { center: node, satellites };
  }, [nodeId]);

  if (!center) return null;
  const cMeta = nodeTypeMeta[center.type];

  return (
    <svg viewBox="0 0 260 192" className="w-full" role="img" aria-label={`Subgraph: ${center.label} und direkte Beziehungen`}>
      {satellites.map((s) => (
        <g
          key={s.id}
          onClick={() => onNavigate(s.id)}
          style={{ cursor: "pointer" }}
          role="button"
          aria-label={`Zu ${s.label} wechseln`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") onNavigate(s.id); }}
        >
          <line x1="130" y1="96" x2={s.x} y2={s.y} stroke={cMeta.color} strokeOpacity="0.35" strokeWidth="1" />
          <circle cx={s.x} cy={s.y} r="4.5" fill={nodeTypeMeta[s.type as keyof typeof nodeTypeMeta]?.color ?? "#999"} />
          <text x={s.x} y={s.y - 8} textAnchor="middle" fontSize="8.5" fill="#e8ddcb">
            {s.label.length > 18 ? s.label.slice(0, 16) + "…" : s.label}
          </text>
          <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize="7" fill="#8a7f6e">
            {s.relation}
          </text>
        </g>
      ))}
      <circle cx="130" cy="96" r="9" fill={cMeta.color}>
        <animate attributeName="r" values="9;11;9" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="130" cy="96" r="15" fill="none" stroke={cMeta.color} strokeOpacity="0.4" strokeWidth="1" />
    </svg>
  );
}

interface NodeCardProps {
  nodeId: string;
  onClose: () => void;
  /** Klick auf einen Nachbarn im Mini-Subgraph → Kamera fliegt dorthin */
  onNavigate: (id: string) => void;
}

/** Orbit-Detailkarte: Begründer, Jahr, Kernaussage, Mini-Subgraph. */
export function NodeCard({ nodeId, onClose, onNavigate }: NodeCardProps) {
  const node = atlasGraph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const meta = nodeTypeMeta[node.type];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="glass pointer-events-auto absolute right-3 top-3 bottom-3 z-10 w-[320px] max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-5 scrollbar-thin"
      role="dialog"
      aria-label={`Detail: ${node.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: meta.color }}>
          {meta.label}
        </p>
        <button onClick={onClose} aria-label="Detailkarte schließen" className="rounded-lg p-1 text-white/50 hover:bg-white/[0.06] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <h3 className="font-display mt-2 text-2xl leading-tight text-[#f3e7d3]">{node.label}</h3>
      {node.sub && <p className="mt-1 text-sm text-white/55">{node.sub}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {node.year !== undefined && (
          <span className="rounded-full border border-[#e2a35c]/40 bg-[#e2a35c]/10 px-3 py-0.5 text-xs font-semibold text-[#e2a35c]">
            {node.year < 0 ? `${Math.abs(node.year)} v. Chr.` : node.year}
          </span>
        )}
        {node.arousal && (
          <span
            className="rounded-full border px-3 py-0.5 text-xs"
            style={{
              borderColor: node.arousal === "hyper" ? "rgba(226,163,92,0.4)" : node.arousal === "hypo" ? "rgba(139,147,201,0.4)" : "rgba(127,184,164,0.4)",
              color: node.arousal === "hyper" ? "#e2a35c" : node.arousal === "hypo" ? "#8b93c9" : "#7fb8a4",
            }}
          >
            {node.arousal === "hyper" ? "Hypererregung" : node.arousal === "hypo" ? "Hypoerregung" : "beides möglich"}
          </span>
        )}
      </div>

      {node.summary && <p className="mt-4 text-sm leading-relaxed text-white/75">{node.summary}</p>}

      <div className="hairline-glow my-4" />
      <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Direkte Beziehungen</p>
      <MiniSubgraph nodeId={nodeId} onNavigate={onNavigate} />
    </motion.aside>
  );
}
