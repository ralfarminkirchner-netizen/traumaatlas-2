// Der Schwarm: entdeckbare Phänomene rund um die Inseln.
// Um jede Insel treiben die zu ihrem Thema gehörenden Phänomene, Situationen
// und Muster-Varianten — manche schwirren zwischen zwei Themenfeldern hin und
// her. Wer mit dem Körper hingeht (Berührung), begegnet ihnen: sie steigen
// als echte Atlas-Phänomene ins Meer ein. Catch 'em all — die Sammlung zählt.
//
// Reines TypeScript OHNE three.js.

import { WORLD, islandById, addAtlasPhenomenon, setOcean, getOceanState, type IslandId } from "./world";
import { symptomCategories } from "@/data/symptoms";
import { exercises } from "@/data/exercises";
import { methods } from "@/data/methods";
import { TYPE_COLORS, type TargetType } from "./mapping";

// ── Katalog ──────────────────────────────────────────────────────────────────

export interface Wildling {
  id: string;          // "wild:<type>:<targetId>"
  targetId: string;
  type: TargetType;
  label: string;
  color: string;
  home: IslandId;
  /** zweiter Anker für Schwirrer (Muster, die zwischen Feldern wandern) */
  away?: IslandId;
  seed: number;        // deterministische Phase
  orbitR: number;      // Bahnradius um die Insel (Welt-Einheiten)
  orbitV: number;      // Bahngeschwindigkeit (rad/s, vorzeichenbehaftet)
}

function seeded(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Themen-Brücken für Schwirrer: welche Inselpaare verbunden sind */
const WANDER_PAIRS: [IslandId, IslandId][] = [
  ["navigator", "toleranz"],
  ["navigator", "polyvagal"],
  ["lexikon", "toleranz"],
  ["lexikon", "polyvagal"],
  ["kosmos", "wegweiser"],
  ["navigator", "lexikon"],
];

function buildCatalog(): Wildling[] {
  const out: Wildling[] = [];
  let wanderIdx = 0;
  const push = (targetId: string, type: TargetType, label: string, home: IslandId) => {
    const s = seeded(`${type}:${targetId}`);
    const s2 = seeded(`${targetId}:${type}`);
    // jeder vierte wird zum Schwirrer zwischen zwei Themenfeldern
    let away: IslandId | undefined;
    if (out.length % 4 === 3) {
      const pair = WANDER_PAIRS[wanderIdx % WANDER_PAIRS.length];
      wanderIdx += 1;
      if (pair[0] === home) away = pair[1];
      else if (pair[1] === home) away = pair[0];
      else away = pair[0];
    }
    out.push({
      id: `wild:${type}:${targetId}`,
      targetId,
      type,
      label,
      color: TYPE_COLORS[type],
      home,
      away,
      seed: s * Math.PI * 2,
      orbitR: 1.45 + s2 * 1.3, // Faktor auf Inselradius
      orbitV: (s > 0.5 ? 1 : -1) * (0.014 + s2 * 0.02),
    });
  };

  for (const cat of symptomCategories) {
    push(cat.id, "category", cat.title, "navigator");
    for (const s of cat.symptoms) push(s.id, "symptom", s.label, "navigator");
  }
  for (const e of exercises) push(e.id, "exercise", `Übung: ${e.title}`, "lexikon");
  for (const m of methods) push(m.id, "method", m.name, "kosmos");
  return out;
}

export const WILDLINGS: Wildling[] = buildCatalog();

// ── Laufzeit-Zustand ─────────────────────────────────────────────────────────

export interface WildState {
  x: number; // Welt-2D
  y: number;
  noticed: boolean;
  caught: boolean;
}

const CAUGHT_KEY = "ta4-wildlife-v1";

function loadCaught(): Set<string> {
  try {
    const raw = localStorage.getItem(CAUGHT_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* frisch */ }
  return new Set();
}

export const wildState = new Map<string, WildState>();
const caught = loadCaught();

for (const w of WILDLINGS) {
  const isl = islandById.get(w.home)!;
  const a = w.seed;
  wildState.set(w.id, {
    x: isl.x + Math.cos(a) * isl.r * w.orbitR,
    y: isl.y + Math.sin(a) * isl.r * w.orbitR,
    noticed: false,
    caught: caught.has(w.id),
  });
}

// QA-/Debug-Spiegel
if (typeof window !== "undefined") {
  (window as unknown as { __ta4wild?: typeof wildState }).__ta4wild = wildState;
}

const NOTICE_DIST = 430;
const CATCH_DIST = 70;

/** Sammlungsstand */
export function wildProgress(): { caught: number; total: number } {
  return { caught: caught.size, total: WILDLINGS.length };
}
export function isCaught(id: string): boolean {
  return caught.has(id);
}

/**
 * Bewegung: Treiben auf Bahnen um die Heimat-Insel, Schwirrer wandern
 * sinusförmig zwischen Heimat- und Zweit-Anker. Aufruf pro Frame.
 */
export function stepWildlife(t: number) {
  for (const w of WILDLINGS) {
    const st = wildState.get(w.id)!;
    if (st.caught) continue;
    const isl = islandById.get(w.home)!;
    const wob = Math.sin(t * 0.4 + w.seed * 3) * 0.14;
    if (w.away) {
      // Schwirrer: langsames Pendel zwischen zwei Inseln + Seitendrift
      const other = islandById.get(w.away)!;
      const k = 0.5 + 0.5 * Math.sin(t * 0.045 + w.seed);
      const mx = isl.x + (other.x - isl.x) * k;
      const my = isl.y + (other.y - isl.y) * k;
      const dx = other.x - isl.x;
      const dy = other.y - isl.y;
      const len = Math.hypot(dx, dy) || 1;
      const side = Math.sin(t * 0.11 + w.seed * 2) * 130;
      st.x = mx + (-dy / len) * side + Math.cos(t * 0.5 + w.seed) * 24;
      st.y = my + (dx / len) * side + Math.sin(t * 0.44 + w.seed) * 24;
    } else {
      const a = w.seed + t * w.orbitV;
      const r = isl.r * (w.orbitR + wob);
      st.x = isl.x + Math.cos(a) * r;
      st.y = isl.y + Math.sin(a) * r;
    }
    // Weltgrenzen
    st.x = Math.min(WORLD.w - 80, Math.max(80, st.x));
    st.y = Math.min(WORLD.h - 80, Math.max(80, st.y));
  }
}

/**
 * Berührungs-Check: der Körper nahe/bei einem Wildling.
 * noticed ab NOTICE_DIST, Fang ab CATCH_DIST. Liefert gefangene Wildlinge.
 */
export function touchWildlife(wx: number, wy: number): Wildling[] {
  const caughtNow: Wildling[] = [];
  for (const w of WILDLINGS) {
    const st = wildState.get(w.id)!;
    if (st.caught) continue;
    const d = Math.hypot(st.x - wx, st.y - wy);
    st.noticed = d < NOTICE_DIST;
    if (d < CATCH_DIST) caughtNow.push(catchWildling(w));
  }
  return caughtNow;
}

/** Fang: dauerhaft markieren, als Atlas-Phänomen ins Meer einsteigen lassen. */
export function catchWildling(w: Wildling): Wildling {
  const st = wildState.get(w.id)!;
  if (st.caught) return w;
  st.caught = true;
  caught.add(w.id);
  try { localStorage.setItem(CAUGHT_KEY, JSON.stringify([...caught])); } catch { /* ok */ }
  // Begegnung wird real: steigt als Phänomen-Boje ins Meer (öffnet die Lesefläche)
  addAtlasPhenomenon(w.targetId, w.type, w.label);
  setOcean({}); // HUD-Zähler aktualisieren
  void getOceanState();
  return w;
}
