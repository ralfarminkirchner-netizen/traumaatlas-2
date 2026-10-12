import { useMemo, useState } from "react";
import { atlasGraph, neighborsOf, nodeTypeMeta, type NodeType } from "@/data/graph";
import { buildSimNodes, EDGE_COLORS, type GraphMode } from "./layout";

interface GraphFallbackProps {
  mode: GraphMode;
  themeId: string | null;
  visibleTypes: NodeType[] | null;
  focusId: string | null;
  onFocus: (id: string | null) => void;
}

/** Dieselbe feste Karte und dieselben Linsen ohne WebGL oder Bewegung. */
export function GraphFallback({ mode, themeId, visibleTypes, focusId, onFocus }: GraphFallbackProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const nodes = useMemo(buildSimNodes, []);
  const positions = useMemo(() => {
    const vectors = nodes.map((n) => mode === "stammbaum" ? n.modePos : n.pos);
    const minX = Math.min(...vectors.map((p) => p.x)), maxX = Math.max(...vectors.map((p) => p.x));
    const minY = Math.min(...vectors.map((p) => p.y)), maxY = Math.max(...vectors.map((p) => p.y));
    const scale = Math.min(700 / (maxX - minX || 1), 490 / (maxY - minY || 1));
    return new Map(nodes.map((n, i) => [n.data.id, {
      x: 400 + (vectors[i].x - (minX + maxX) / 2) * scale,
      y: 300 - (vectors[i].y - (minY + maxY) / 2) * scale,
    }]));
  }, [nodes, mode]);
  const focusNeighbors = focusId ? neighborsOf(focusId) : new Set<string>();
  const context = useMemo(() => {
    if (mode !== "thema" || !themeId) return null;
    const ids = new Set([themeId, ...neighborsOf(themeId)]);
    for (const id of [...ids]) for (const neighbor of neighborsOf(id)) ids.add(neighbor);
    return ids;
  }, [mode, themeId]);
  const active = (id: string, type: NodeType) => focusId
    ? id === focusId || focusNeighbors.has(id)
    : (!visibleTypes || visibleTypes.includes(type)) && (!context || context.has(id));
  const hoverNode = atlasGraph.nodes.find((n) => n.id === hoverId);
  const groupLabels = (Object.keys(nodeTypeMeta) as NodeType[]).map((type) => {
    const group = atlasGraph.nodes.filter((n) => n.type === type && active(n.id, n.type));
    if (!group.length || focusId || mode === "stammbaum") return null;
    const points = group.map((n) => positions.get(n.id)!);
    return <text key={type} x={points.reduce((s, p) => s + p.x, 0) / points.length}
      y={Math.min(...points.map((p) => p.y)) - 15} textAnchor="middle" fill={nodeTypeMeta[type].color}
      fontSize={13} fontWeight={600}>{nodeTypeMeta[type].label}</text>;
  });
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 800 600" className="h-full w-full" role="group" aria-label="Statische Atlas-Karte">
        <g aria-hidden="true">
          {atlasGraph.edges.map((e) => {
            const a = positions.get(e.from), b = positions.get(e.to);
            const from = atlasGraph.nodes.find((n) => n.id === e.from), to = atlasGraph.nodes.find((n) => n.id === e.to);
            if (!a || !b || !from || !to) return null;
            const hot = active(from.id, from.type) && active(to.id, to.type);
            const direct = focusId === e.from || focusId === e.to;
            return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE_COLORS[e.type]}
              strokeOpacity={hot ? (direct ? 0.75 : 0.2) : 0.025} strokeWidth={direct ? 1.7 : 0.8} />;
          })}
          {groupLabels}
        </g>
        {atlasGraph.nodes.map((n) => {
          const p = positions.get(n.id)!;
          const hot = active(n.id, n.type), selected = n.id === focusId;
          return <g key={n.id} role="button" tabIndex={hot ? 0 : -1} aria-label={n.label}
            aria-pressed={selected} className="cursor-pointer outline-none group"
            onClick={() => onFocus(selected ? null : n.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFocus(selected ? null : n.id); } }}
            onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(n.id)} onBlur={() => setHoverId(null)}>
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={selected ? 8 : 5} fill={nodeTypeMeta[n.type].color}
              opacity={hot ? 1 : 0.12} stroke={selected ? "#fff" : "transparent"} strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={11} fill="none" stroke="#fff" strokeWidth={2}
              className="opacity-0 group-focus-visible:opacity-100" />
          </g>;
        })}
        {hoverNode && <g aria-hidden="true">
          <rect x={20} y={15} width={760} height={34} rx={6} fill="#151a27" />
          <text x={32} y={38} fill="#fff" fontSize={15}>{hoverNode.label}</text>
        </g>}
      </svg>
    </div>
  );
}
