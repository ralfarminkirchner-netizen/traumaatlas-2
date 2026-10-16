import { useEffect, useMemo, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { atlasGraph, edgeTypeLabels, nodeTypeMeta, type AtlasNode } from "@/data/graph";
import { transduziere, type WeltId } from "@/universe/transduction";

const nodesById = new Map(atlasGraph.nodes.map((node) => [node.id, node]));

interface RelatedNode {
  node: AtlasNode;
  relations: string[];
}

interface NodeCardProps {
  nodeId: string;
  onClose: () => void;
  /** Einen direkten Nachbarn auswählen. Die gemeinsame Kartierung bleibt erhalten. */
  onNavigate: (id: string) => void;
  /** Schicht-3: Lesart der aktuellen Welt (Schattenwelt = Schutzfunktionen). */
  world?: WeltId;
}

/** Ruhige Detailansicht mit allen direkten, gerichteten Beziehungen. */
export function NodeCard({ nodeId, onClose, onNavigate, world = "meer" }: NodeCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const node = nodesById.get(nodeId);

  const relatedGroups = useMemo(() => {
    const related = new Map<string, RelatedNode>();
    for (const edge of atlasGraph.edges) {
      if (edge.from !== nodeId && edge.to !== nodeId) continue;
      const source = nodesById.get(edge.from);
      const target = nodesById.get(edge.to);
      if (!source || !target) continue;
      const neighbor = source.id === nodeId ? target : source;
      if (neighbor.id === nodeId) continue;
      const entry = related.get(neighbor.id) ?? { node: neighbor, relations: [] };
      const relation = `${source.label} ${edgeTypeLabels[edge.type]} ${target.label}`;
      if (!entry.relations.includes(relation)) entry.relations.push(relation);
      related.set(neighbor.id, entry);
    }
    return Object.entries(nodeTypeMeta)
      .map(([type, meta]) => ({
        type,
        meta,
        entries: [...related.values()]
          .filter((entry) => entry.node.type === type)
          .sort((a, b) => a.node.label.localeCompare(b.node.label, "de")),
      }))
      .filter((group) => group.entries.length > 0);
  }, [nodeId]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }, [nodeId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!node) return null;
  const meta = nodeTypeMeta[node.type];
  const lesart = transduziere(world, node);
  const neighborCount = relatedGroups.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <aside
      ref={cardRef}
      className="relative min-w-0 w-full rounded-2xl border border-white/15 bg-[#15131b] p-5 lg:max-h-[76vh] lg:overflow-y-auto scrollbar-thin"
      aria-label={`Details zu ${lesart?.label ?? node.label}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-3 text-sm font-medium" style={{ color: meta.color }}>{meta.label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Detailkarte schließen"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2a35c]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <h3
        ref={headingRef}
        tabIndex={-1}
        className="font-display mt-2 text-2xl leading-tight text-[#f3e7d3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e2a35c]"
      >
        {lesart?.label ?? node.label}
      </h3>
      {node.sub && <p className="mt-2 text-sm leading-relaxed text-white/75">{node.sub}</p>}

      {(node.year !== undefined || node.arousal) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {node.year !== undefined && (
            <span className="rounded-full border border-[#e2a35c]/40 bg-[#e2a35c]/10 px-3 py-1 text-xs font-semibold text-[#e2a35c]">
              {node.year < 0 ? `${Math.abs(node.year)} v. Chr.` : node.year}
            </span>
          )}
          {node.arousal && (
            <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
              {node.arousal === "hyper" ? "Hypererregung" : node.arousal === "hypo" ? "Hypoerregung" : "beides möglich"}
            </span>
          )}
        </div>
      )}

      {(node.summary || lesart?.summary) && <p className="mt-4 text-sm leading-relaxed text-white/85">{lesart?.summary ?? node.summary}</p>}

      <div className="mt-6 border-t border-white/15 pt-5">
        <h4 className="text-base font-semibold text-[#f3e7d3]">Direkte Beziehungen <span className="text-sm font-normal text-white/70">({neighborCount})</span></h4>
        <p className="mt-1 text-sm leading-relaxed text-white/70">Wähle einen Nachbarn, um seinen Zusammenhang zu erkunden.</p>
        {relatedGroups.length === 0 && <p className="mt-4 text-sm text-white/75">Für diesen Knoten sind noch keine direkten Beziehungen kartiert.</p>}
        {relatedGroups.map((group) => (
          <section key={group.type} className="mt-5" aria-label={group.meta.label}>
            <h5 className="mb-2 text-sm font-medium" style={{ color: group.meta.color }}>{group.meta.label}</h5>
            <ul className="divide-y divide-white/10">
              {group.entries.map(({ node: neighbor, relations }) => (
                <li key={neighbor.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(neighbor.id)}
                    className="group flex min-h-11 w-full items-start gap-3 rounded-lg py-3 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2a35c]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-relaxed text-[#f3e7d3]">{neighbor.label}</span>
                      {relations.map((relation) => <span key={relation} className="mt-1 block text-xs leading-relaxed text-white/75">{relation}</span>)}
                    </span>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/65 group-hover:text-white" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
}
