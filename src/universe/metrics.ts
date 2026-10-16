// Metrik-Profile: die Gummiband-Schicht. Die Basis-Einbettung wird pro Welt
// verzerrt — KantenLÄNGE ist Welt-Parameter, KantenEXISTENZ ist Invariante.
// Adjazenz wird hier NIEMALS angefasst (Probe: k-NN-Overlap ≥ 90 %).

import { atlasGraph } from "@/data/graph";
import { BASIS, type BasisPunkt } from "./baseEmbedding";

export interface MetrikProfil {
  id: string;
  /** globaler radialer Stretch um den Ursprung */
  stretchGlobal: number;
  /** Y-Quetschung (Scheiben-Charakter) */
  flattenY: number;
  /** Atem-Amplitude der Positionen (0 = still) */
  breathAmp: number;
  /** Atem-Frequenz in Hz (langsam!) */
  breathHz: number;
  /** Regionen, die Richtung Zentrum geschrumpft werden (Schutzräume) */
  regionShrink: { um: string; faktor: number }[];
}

export const METRIKEN: Record<string, MetrikProfil> = {
  meer: {
    id: "meer",
    stretchGlobal: 1,
    flattenY: 1,
    breathAmp: 0,
    breathHz: 0,
    regionShrink: [],
  },
  schatten: {
    id: "schatten",
    stretchGlobal: 1.06,
    flattenY: 0.94,
    breathAmp: 0.045,
    breathHz: 0.3,
    regionShrink: [{ um: "state:dorsal", faktor: 0.93 }],
  },
  // Nur Profil-Eintrag, kein Renderer (Weltensystem-Brief, Phase 1):
  // radiale Dehnung nach außen — alles weiter auseinander, Kanten 3–5×.
  orbital: {
    id: "orbital",
    stretchGlobal: 3.5,
    flattenY: 0.6,
    breathAmp: 0,
    breathHz: 0,
    regionShrink: [],
  },
};

// ── Regionen (einmal, memoisiert) ─────────────────────────────────

interface Zentrum {
  x: number;
  y: number;
  z: number;
}

const zentrenCache = new Map<string, Zentrum>();

function regionZentrum(um: string): Zentrum | null {
  const cached = zentrenCache.get(um);
  if (cached) return cached;
  const nachbarn = [...atlasGraph.edges]
    .filter((e) => e.from === um || e.to === um)
    .map((e) => (e.from === um ? e.to : e.from));
  const punkte = nachbarn
    .map((id) => BASIS.get(id))
    .filter((p): p is BasisPunkt => p !== undefined);
  if (punkte.length === 0) return null;
  const z: Zentrum = {
    x: punkte.reduce((s, p) => s + p.x, 0) / punkte.length,
    y: punkte.reduce((s, p) => s + p.y, 0) / punkte.length,
    z: punkte.reduce((s, p) => s + p.z, 0) / punkte.length,
  };
  zentrenCache.set(um, z);
  return z;
}

// ── Projektion ────────────────────────────────────────────────────

/** Stabile Atem-Phase pro Knoten-ID (kein RNG zur Laufzeit nötig). */
export function atmungsPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 * Math.PI * 2;
}

/**
 * Basisposition durch ein Metrik-Profil projizieren.
 * Rein & deterministisch: gleiche Eingaben → gleicher Punkt (t fest = statisch).
 */
export function projizierePunkt(
  profil: MetrikProfil,
  basis: BasisPunkt,
  id: string,
  tSec = 0,
): BasisPunkt {
  let { x, y, z } = basis;

  // 1) Regionsschrumpfung Richtung Regionzentrum (Schutzräume enger)
  for (const region of profil.regionShrink) {
    const zentrum = regionZentrum(region.um);
    if (!zentrum) continue;
    // nur Knoten in der Region (Nachbarn des Zentrums) schrumpfen
    const istInRegion = atlasGraph.edges.some(
      (e) => (e.from === region.um && e.to === id) || (e.to === region.um && e.from === id),
    );
    if (!istInRegion) continue;
    x = zentrum.x + (x - zentrum.x) * region.faktor;
    y = zentrum.y + (y - zentrum.y) * region.faktor;
    z = zentrum.z + (z - zentrum.z) * region.faktor;
  }

  // 2) Atmen: radial um den Ursprung, langsames Ein- und Ausatmen der Karte
  if (profil.breathAmp > 0) {
    const atem = 1 + profil.breathAmp * Math.sin(2 * Math.PI * profil.breathHz * tSec + atmungsPhase(id));
    x *= atem;
    y *= atem;
    z *= atem;
  }

  // 3) Globaler Stretch + Scheiben-Quetschung
  return {
    x: x * profil.stretchGlobal,
    y: y * profil.flattenY * profil.stretchGlobal,
    z: z * profil.stretchGlobal,
  };
}

export function projiziere(
  profil: MetrikProfil,
  tSec = 0,
): Map<string, BasisPunkt> {
  const ergebnis = new Map<string, BasisPunkt>();
  for (const [id, basis] of BASIS) {
    ergebnis.set(id, projizierePunkt(profil, basis, id, tSec));
  }
  return ergebnis;
}
