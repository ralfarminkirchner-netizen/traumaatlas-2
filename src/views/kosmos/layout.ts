// Layout-Helfer für den Kosmos-Graphen
import * as THREE from "three";
import { atlasGraph, nodeTypeMeta, type AtlasNode, type NodeType } from "@/data/graph";

export interface SimNode {
  data: AtlasNode;
  pos: THREE.Vector3;
  vel: THREE.Vector3;     // Kompatibilität mit dem Canvas-Fallback; bleibt null.
  modePos: THREE.Vector3; // Feste Position im Stammbaum-Modus
  appearAt: number;       // Kompatibilität; alle Knoten erscheinen sofort.
  size: number;
  color: THREE.Color;
  dim: number;            // 0..1 Sichtbarkeit (Hover-Linse / Thema-Modus)
  scaleNow: number;
}

/** Eine feste Grundordnung für alle Linsen des Kosmos. */
const TYPE_ORDER: NodeType[] = ["discipline", "method", "exercise", "symptom", "category", "state", "phase", "block", "profile"];

export function clusterAnchor(type: NodeType, out: THREE.Vector3): THREE.Vector3 {
  const i = TYPE_ORDER.indexOf(type);
  const angle = (i / TYPE_ORDER.length) * Math.PI * 2 - Math.PI / 2;
  const r = 20;
  out.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.78, Math.sin(angle * 2) * 1.2);
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
  profile: 0.4,
};

const SPACING = 2.8;
const compareIds = (a: SimNode, b: SimNode) => a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0;

/** Gleichmäßige Plätze, ohne Zufall oder eine laufende Simulation. */
function hexPlaces(count: number): THREE.Vector2[] {
  const places = [new THREE.Vector2()];
  const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (let ring = 1; places.length < count; ring++) {
    let q = -ring;
    let r = ring;
    for (const [dq, dr] of directions) {
      for (let step = 0; step < ring && places.length < count; step++) {
        places.push(new THREE.Vector2(SPACING * (q + r / 2), SPACING * r * Math.sqrt(3) / 2));
        q += dq;
        r += dr;
      }
    }
  }
  const center = places.reduce((sum, p) => sum.add(p), new THREE.Vector2()).divideScalar(places.length);
  return places.map((p) => p.sub(center));
}

/** Einmaliges Entzerren schützt auch Grenzen benachbarter Gruppen. */
function separate(nodes: SimNode[], position: "pos" | "modePos") {
  const ordered = [...nodes].sort(compareIds);
  for (let pass = 0; pass < 64; pass++) {
    let moved = false;
    for (let i = 0; i < ordered.length; i++) {
      const a = ordered[i][position];
      for (let j = i + 1; j < ordered.length; j++) {
        const b = ordered[j][position];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= SPACING - 0.001) continue;
        if (distance < 0.0001) {
          const angle = (i + j * 0.61803398875) * 2.3999632297;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const shift = (SPACING - Math.hypot(b.x - a.x, b.y - a.y)) / 2;
        a.x -= dx / distance * shift;
        a.y -= dy / distance * shift;
        b.x += dx / distance * shift;
        b.y += dy / distance * shift;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function buildSimNodes(): SimNode[] {
  const nodes: SimNode[] = atlasGraph.nodes.map((data) => ({
      data,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      modePos: new THREE.Vector3(),
      appearAt: 0,
      size: SIZE_BY_TYPE[data.type],
      color: new THREE.Color(nodeTypeMeta[data.type].color),
      dim: 1,
      scaleNow: 1,
  }));

  for (const type of TYPE_ORDER) {
    const group = nodes.filter((n) => n.data.type === type).sort(compareIds);
    const places = hexPlaces(group.length);
    const anchor = clusterAnchor(type, new THREE.Vector3());
    group.forEach((n, i) => {
      n.pos.set(anchor.x + places[i].x, anchor.y + places[i].y, anchor.z + Math.sin(i * 2.3999632297) * 0.8);
    });
  }
  separate(nodes, "pos");

  // Stammbaum-Positionen: Jahr → x, Gruppe → Bahn
  const withYear = nodes.filter((n) => n.data.year !== undefined);
  const years = withYear.map((n) => n.data.year!);
  const minY = years.length ? Math.min(...years) : 0;
  const span = years.length ? Math.max(1, Math.max(...years) - minY) : 1;
  const groups = [...new Set(withYear.map((n) => n.data.group ?? "other"))].sort();
  const groupLane = new Map(groups.map((g, i) => [g, i]));
  for (const n of withYear) {
    const lane = groupLane.get(n.data.group ?? "other")!;
    n.modePos.set(((n.data.year! - minY) / span) * 44 - 22, (lane - (groups.length - 1) / 2) * 4.2, 0);
  }
  separate(withYear, "modePos");
  // Undatierte Phänomene bleiben als eigener, lesbarer Bereich vorhanden.
  const undated = nodes.filter((n) => n.data.year === undefined).sort(compareIds);
  const places = hexPlaces(undated.length);
  const lowerEdge = withYear.length ? Math.min(...withYear.map((n) => n.modePos.y)) : 0;
  const upperPlace = Math.max(0, ...places.map((p) => p.y));
  undated.forEach((n, i) => n.modePos.set(places[i].x, lowerEdge - 7 - upperPlace + places[i].y, n.pos.z));
  separate(nodes, "modePos");
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
  profil: "#a98fc7",
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

/** Kurzformen für lange Knotennamen (Labels im Graph). */
const SHORT_NAMES: Record<string, string> = {
  kvt: "KVT",
  neopsychoanalyse: "Tiefenpsychologie",
  erkson: "Erickson-Hypnose",
  dissoziationstheorie: "Dissoziation",
  herman: "Komplextrauma",
  humanistisch: "Humanismus",
  kognitivismus: "Kognitionswiss.",
  aufklaerung: "Aufklärung",
  gestalt: "Gestalt",
  ethologie: "Ethologie",
  neuro: "Neurowissenschaften",
  "m:dbt": "DBT",
  "m:tfcbt": "tf-KVT",
  "m:egostate": "Teilearbeit / IFS",
  "m:brainspotting": "Brainspotting",
  "m:schematherapie": "Schematherapie",
  "m:tsyoga": "Trauma-Yoga",
  "m:polyvagal": "Polyvagal",
  "m:sp": "Sensomotorik",
  "m:se": "SE",
  "m:net": "NET",
  "m:irrt": "IRRT",
  "m:pitt": "PITT",
  "m:krst": "KReST",
  "m:tre": "TRE",
  "m:dbr": "DBR",
  "m:narm": "NARM",
  "m:emdr": "EMDR",
  "p:pda": "PDA",
  "p:pda-anforderung": "Anforderung",
  "p:pda-autonomie": "Autonomie",
  "p:pda-intern": "Innere Anforderungen",
  "p:pda-indirekt": "Indirekte Anforderungen",
  "p:pda-antworten": "Die vielen F's",
  "p:pda-strategien": "Sozialstrategien",
  "p:pda-masking": "Maskierung",
  "p:pda-geschlecht": "Frauen & PDA",
  "p:pda-erwachsene": "PDA erwachsen",
  "p:pda-familie": "Familie & Schule",
  "p:pda-beziehung": "PDA & Beziehung",
  "p:pda-adhs": "PDA & ADHS",
  "p:pda-audhd": "PDA & AuDHD",
  "p:pda-kptbs": "PDA & Komplextrauma",
};

/** Anzeige-Label im Graph: Kurzform, sonst gekürzt. */
export function shortLabel(id: string, label: string): string {
  const s = SHORT_NAMES[id];
  if (s) return s;
  return label.length > 24 ? label.slice(0, 22) + "…" : label;
}
