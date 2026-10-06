// Layout-Helfer für den Kosmos-Graphen
import * as THREE from "three";
import { atlasGraph, nodeTypeMeta, type AtlasNode, type NodeType } from "@/data/graph";

export interface SimNode {
  data: AtlasNode;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  modePos: THREE.Vector3; // Zielposition für Stammbaum-Modus
  appearAt: number;       // Sekunden bis zum Erscheinen (Chronologie)
  size: number;
  color: THREE.Color;
  dim: number;            // 0..1 Sichtbarkeit (Hover-Linse / Thema-Modus)
  scaleNow: number;
}

/** Typ-Anker: Clustern des Kosmos auf einem Kreis. */
const TYPE_ORDER: NodeType[] = ["discipline", "method", "exercise", "symptom", "category", "state", "phase", "block"];

export function clusterAnchor(type: NodeType, out: THREE.Vector3): THREE.Vector3 {
  const i = TYPE_ORDER.indexOf(type);
  const angle = (i / TYPE_ORDER.length) * Math.PI * 2 - Math.PI / 2;
  const r = 7.2;
  out.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.62, Math.sin(angle * 2.3) * 1.6);
  return out;
}

const SIZE_BY_TYPE: Record<NodeType, number> = {
  discipline: 0.34,
  method: 0.42,
  exercise: 0.3,
  symptom: 0.22,
  category: 0.36,
  state: 0.52,
  phase: 0.44,
  block: 0.28,
};

/** Deterministischer Start (seeded), damit Hydration/StrictMode stabil bleibt. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildSimNodes(): SimNode[] {
  const rand = seededRandom(20261006);
  const nodes = atlasGraph.nodes.map((data, i) => {
    // Chronologische Erscheinung: nach Jahr (ohne Jahr: Mittelwert)
    const year = data.year ?? 1975;
    const t = Math.min(1, Math.max(0, (year + 450) / 2500));
    return {
      data,
      pos: new THREE.Vector3((rand() - 0.5) * 3, (rand() - 0.5) * 3, (rand() - 0.5) * 3),
      vel: new THREE.Vector3(),
      modePos: new THREE.Vector3(),
      appearAt: 0.15 + t * 3.2 + (i % 13) * 0.015,
      size: SIZE_BY_TYPE[data.type],
      color: new THREE.Color(nodeTypeMeta[data.type].color),
      dim: 1,
      scaleNow: 0,
    };
  });

  // Stammbaum-Positionen: Jahr → x, Gruppe → Bahn
  const withYear = nodes.filter((n) => n.data.year !== undefined);
  const years = withYear.map((n) => n.data.year!);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const groupLane = new Map<string, number>();
  for (const n of nodes) {
    if (n.data.year === undefined) continue;
    const g = (n.data as { group?: string }).group ?? "other";
    if (!groupLane.has(g)) groupLane.set(g, groupLane.size);
    const lane = groupLane.get(g)!;
    const x = ((n.data.year - minY) / (maxY - minY)) * 26 - 13;
    const y = (lane - (groupLane.size - 1) / 2) * 2.4;
    n.modePos.set(x, y, (lane % 2 === 0 ? 1 : -1) * 0.6);
  }
  // Knoten ohne Jahr: in die Seiten-„Aussenwelt" stellen
  for (const n of nodes) {
    if (n.data.year !== undefined) continue;
    const anchor = new THREE.Vector3();
    clusterAnchor(n.data.type, anchor);
    n.modePos.copy(anchor.multiplyScalar(1.9));
    n.modePos.x = Math.sign(n.modePos.x || 1) * 15.5;
  }
  return nodes;
}

/** Kanten-Farben je Typ */
export const EDGE_COLORS: Record<string, string> = {
  abstammung: "#9aa8c7",
  fundierung: "#d9a05b",
  behandlt: "#e2a35c",
  reguliert: "#7fb8a4",
  phase: "#d4b483",
  kategorie: "#b48ea3",
  erregung: "#c98a8a",
  zielzustand: "#a3b18a",
};

export interface EdgeRef {
  from: number; // Index in SimNode[]
  to: number;
  type: string;
}

export function buildEdgeIndex(idToIndex: Map<string, number>): EdgeRef[] {
  return atlasGraph.edges
    .map((e) => ({ from: idToIndex.get(e.from)!, to: idToIndex.get(e.to)!, type: e.type }))
    .filter((e) => e.from !== undefined && e.to !== undefined);
}

export type GraphMode = "constellation" | "stammbaum" | "thema";
