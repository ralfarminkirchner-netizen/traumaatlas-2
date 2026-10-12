import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { atlasGraph, edgeTypeLabels, nodeTypeMeta, type NodeType } from "@/data/graph";
import { getOceanState, selectPhenomenon, subscribeOcean } from "@/ocean/world";
import { normalizeOceanGraph } from "./atlas-geometry.mjs";
import { mountAtlasSpace } from "./atlas-space.mjs";

type GraphSource = "atlas" | "ocean";

const referenceGraph = {
  source: { kind: "atlas-reference" as const, label: "Atlasbestand" },
  nodes: atlasGraph.nodes,
  edges: atlasGraph.edges,
  nodeTypeMeta,
  edgeTypeLabels,
};

/** Keep every original field, while sampling the live physics store at most five times per second. */
function subscribeOceanSnapshot(notify: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = subscribeOcean(() => {
    if (timer !== null) return;
    timer = setTimeout(() => { timer = null; notify(); }, 200);
  });
  return () => {
    unsubscribe();
    if (timer !== null) clearTimeout(timer);
  };
}

interface GraphBodiesViewProps {
  selectedId: string | null;
  onFocus: (id: string | null) => void;
  visibleTypes?: NodeType[] | null;
  resetNonce?: number;
}

/** Geometric bodies of the existing Atlas graph and the existing personal Ocean graph. */
export function GraphBodiesView({ selectedId, onFocus, visibleTypes = null, resetNonce = 0 }: GraphBodiesViewProps) {
  const [source, setSource] = useState<GraphSource>("atlas");
  const ocean = useSyncExternalStore(subscribeOceanSnapshot, getOceanState, getOceanState);
  const oceanGraph = useMemo(() => normalizeOceanGraph(ocean), [ocean]);
  const graph = source === "atlas" ? referenceGraph : oceanGraph;
  const selection = source === "atlas" ? selectedId : ocean.selected;
  const host = useRef<HTMLDivElement>(null);
  const space = useRef<ReturnType<typeof mountAtlasSpace> | null>(null);
  const callbacks = useRef({ source, onFocus });
  callbacks.current = { source, onFocus };

  useEffect(() => {
    if (!host.current) return;
    const mounted = mountAtlasSpace(host.current, {
      graph: referenceGraph,
      onSelect: (id) => {
        if (callbacks.current.source === "atlas") callbacks.current.onFocus(id);
        else selectPhenomenon(id);
      },
    });
    space.current = mounted;
    return () => {
      mounted.destroy();
      space.current = null;
    };
  }, []);

  useEffect(() => { space.current?.setGraph(graph); }, [graph]);
  // Choosing a reference node in the original Kosmos controls returns to that node's source.
  useEffect(() => { if (selectedId !== null) setSource("atlas"); }, [selectedId]);
  useEffect(() => { space.current?.setSelected(selection); }, [selection, source]);
  useEffect(() => {
    space.current?.setVisibleTypes(source === "atlas" ? visibleTypes : null);
  }, [source, visibleTypes]);
  useEffect(() => { space.current?.resetView(); }, [resetNonce]);

  const chooseSource = (next: GraphSource) => {
    if (next === source) return;
    setSource(next);
    onFocus(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/15 bg-[#111722] px-3 py-2"
        role="group" aria-label="Quelle des Phänomenatlas-Netzes">
        {([
          ["atlas", "Atlasbestand"],
          ["ocean", "Meine Meerkonstellation"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={source === id} onClick={() => chooseSource(id)}
            className={`rounded-lg border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b483] ${source === id
              ? "border-[#d4b483] bg-[#d4b483] text-[#17130e]"
              : "border-white/25 bg-[#161923] text-white/90 hover:bg-white/10"}`}>
            {label}
          </button>
        ))}
        {source === "ocean" && oceanGraph.nodes.length === 0 && (
          <p className="text-sm text-white/80" role="status">Hier sind noch keine persönlichen Phänomene erfasst.</p>
        )}
      </div>
      <div ref={host} className="min-h-0 flex-1" aria-label="Formbare Körper des Phänomenatlas-Netzes" />
    </div>
  );
}
