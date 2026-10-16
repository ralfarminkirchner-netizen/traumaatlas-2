// Basis-Einbettung des Atlas: einmal berechnetes, deterministisches
// Force-Layout aus der Topologie (atlasGraph). Jede Welt verzerrt DIESE
// Basis (metrics.ts) — niemals wird je Welt eine neue Karte gelegt.
// Rein + deterministisch: gleicher Graph → gleiche Koordinaten, 3 Läufe.

import { atlasGraph } from "@/data/graph";

export interface BasisPunkt {
  x: number;
  y: number;
  z: number;
}

/** LCG wie in kosmos/layout.ts — stabile Hydration/StrictMode. */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const R0 = 30; // Repulsionskonstante
const KS = 0.08; // Feder-Konstante
const RUHE = 2.0; // Kante: Wunschabstand
const SCHWERPUNKT = 0.02; // Zentrumszug
const ITERATIONEN = 260;
const SEED = 20261012;

function bilden(): Map<string, BasisPunkt> {
  const n = atlasGraph.nodes.length;
  const rand = seededRandom(SEED);

  // Start: goldenes Dreieck, deterministisch statt Kugel-Zufall
  const pos: BasisPunkt[] = atlasGraph.nodes.map((_, i) => {
    const t = i / Math.max(n - 1, 1);
    const winkel = i * 2.399963229728653; // goldener Winkel
    const r = 3.5 + 5.5 * Math.sqrt(t);
    return {
      x: Math.cos(winkel) * r + (rand() - 0.5) * 0.6,
      y: (rand() - 0.5) * 4,
      z: Math.sin(winkel) * r + (rand() - 0.5) * 0.6,
    };
  });
  const vel = pos.map(() => ({ x: 0, y: 0, z: 0 }));

  const index = new Map<string, number>();
  atlasGraph.nodes.forEach((node, i) => index.set(node.id, i));
  const kanten = atlasGraph.edges
    .map((e) => [index.get(e.from)!, index.get(e.to)!] as const)
    .filter(([a, b]) => a !== undefined && b !== undefined);

  for (let it = 0; it < ITERATIONEN; it++) {
    const temperatur = 1 - it / ITERATIONEN;
    const kraft = pos.map(() => ({ x: 0, y: 0, z: 0 }));

    // Abstoßung (alle Paare — 139² ist trivial)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dz = pos[i].z - pos[j].z;
        const d2 = dx * dx + dy * dy + dz * dz + 0.01;
        const f = R0 / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        const fz = (dz / d) * f;
        kraft[i].x += fx; kraft[i].y += fy; kraft[i].z += fz;
        kraft[j].x -= fx; kraft[j].y -= fy; kraft[j].z -= fz;
      }
    }
    // Federn entlang der Kanten
    for (const [a, b] of kanten) {
      const dx = pos[b].x - pos[a].x;
      const dy = pos[b].y - pos[a].y;
      const dz = pos[b].z - pos[a].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
      const f = KS * (d - RUHE);
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      const fz = (dz / d) * f;
      kraft[a].x += fx; kraft[a].y += fy; kraft[a].z += fz;
      kraft[b].x -= fx; kraft[b].y -= fy; kraft[b].z -= fz;
    }
    // Zentrum + Integration mit Dämpfung
    for (let i = 0; i < n; i++) {
      kraft[i].x -= pos[i].x * SCHWERPUNKT;
      kraft[i].y -= pos[i].y * SCHWERPUNKT;
      kraft[i].z -= pos[i].z * SCHWERPUNKT;
      vel[i].x = (vel[i].x + kraft[i].x) * 0.5 * temperatur;
      vel[i].y = (vel[i].y + kraft[i].y) * 0.5 * temperatur;
      vel[i].z = (vel[i].z + kraft[i].z) * 0.5 * temperatur;
      pos[i].x += vel[i].x;
      pos[i].y += vel[i].y;
      pos[i].z += vel[i].z;
    }
  }

  // Normalisieren: Maximalradius 12, sanft in die Ebene gedrückt
  const maxR = Math.max(...pos.map((p) => Math.hypot(p.x, p.y, p.z)));
  const skala = 12 / Math.max(maxR, 1e-6);
  const ergebnis = new Map<string, BasisPunkt>();
  atlasGraph.nodes.forEach((node, i) => {
    ergebnis.set(node.id, {
      x: pos[i].x * skala,
      y: pos[i].y * skala * 0.82,
      z: pos[i].z * skala,
    });
  });
  return ergebnis;
}

/** id → Basisposition. Eine einzige Instanz für die ganze App. */
export const BASIS: ReadonlyMap<string, BasisPunkt> = bilden();

/** Test-/Proben-Helfer: Layout neu rechnen (muss bitgleich identisch sein). */
export function basisPruefung(): Map<string, BasisPunkt> {
  return bilden();
}
