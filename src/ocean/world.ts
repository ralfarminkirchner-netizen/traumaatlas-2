// Zentraler Store des Meeres: Kamera, Inseln, Phänomene, Fortschritt.
// useSyncExternalStore, persistenter Fortschritt in localStorage.

import { useSyncExternalStore } from "react";
import { mapTextToAtlas, arousalOfSymptom, TYPE_COLORS, type MappedLink, type TargetType } from "./mapping";

// ── Weltgeometrie ────────────────────────────────────────────────────────────

export const WORLD = { w: 5200, h: 3200 };

export type IslandId =
  | "kosmos" | "kaskade" | "polyvagal" | "toleranz" | "navigator"
  | "lexikon" | "stammbaum" | "baukasten" | "wechsel" | "wegweiser";

export interface IslandDef {
  id: IslandId;
  index: string;
  title: string;
  kicker: string;
  x: number; // Weltkoordinaten
  y: number;
  r: number; // Radius
  /** Boden-/Lichtsignatur der Insel */
  ground: [string, string, string];
  glyph: string; // kurzes Symbol
}

export const ISLANDS: IslandDef[] = [
  { id: "navigator", index: "05", title: "Symptom-Navigator", kicker: "Orientierung", x: 2600, y: 1500, r: 270, ground: ["#3d2b33", "#6b4653", "#d98a7e"], glyph: "◈" },
  { id: "kosmos", index: "01", title: "Der große Graph", kicker: "Kosmos", x: 2600, y: 640, r: 300, ground: ["#2a2b3d", "#4a4a6b", "#9aa8c7"], glyph: "✦" },
  { id: "kaskade", index: "02", title: "Die Stresskaskade", kicker: "Körper", x: 1200, y: 880, r: 240, ground: ["#3a2e22", "#6b543a", "#d9a05b"], glyph: "〜" },
  { id: "polyvagal", index: "03", title: "Drei Ebenen", kicker: "Nervensystem", x: 4000, y: 880, r: 240, ground: ["#1f3436", "#35605f", "#8fd8cf"], glyph: "☍" },
  { id: "toleranz", index: "04", title: "Toleranzfenster", kicker: "Regulation", x: 950, y: 2100, r: 250, ground: ["#2e3a26", "#4f6b41", "#a3b18a"], glyph: "◠" },
  { id: "lexikon", index: "06", title: "Übungs-Lexikon", kicker: "Selbsthilfe", x: 4250, y: 2050, r: 250, ground: ["#33302a", "#5c5647", "#e2b35c"], glyph: "✧" },
  { id: "stammbaum", index: "07", title: "Halle der Ahnen", kicker: "Geschichte", x: 1850, y: 2560, r: 270, ground: ["#33262e", "#5d4451", "#b48ea3"], glyph: "❦" },
  { id: "baukasten", index: "08", title: "Programm-Baukasten", kicker: "Struktur", x: 3350, y: 2560, r: 250, ground: ["#26333a", "#41565f", "#7fa8b8"], glyph: "▦" },
  { id: "wechsel", index: "09", title: "Wechselwirkungen", kicker: "System", x: 620, y: 1470, r: 220, ground: ["#36282a", "#5f4448", "#c98a8a"], glyph: "⇄" },
  { id: "wegweiser", index: "10", title: "Wegweiser", kicker: "Hilfe finden", x: 4580, y: 1460, r: 220, ground: ["#2b3038", "#49525e", "#9fb4c7"], glyph: "⚓" },
];

export const islandById = new Map(ISLANDS.map((i) => [i.id, i]));

// ── Phänomene ────────────────────────────────────────────────────────────────

export interface Phenomenon {
  id: string;
  label: string;
  user: boolean; // frei eingegeben vs. Atlas-Phänomen
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Leuchtfarbe */
  color: string;
  /** Mapping-Ergebnisse (Atlas-Anbindung) */
  links: MappedLink[];
  /** Brücken, die der Nutzer bestätigt hat */
  confirmed: string[];
  bornAt: number;
  /** beruhigt-sich-Wirbel: dieses Phänomen reagiert auf Innehalten */
  calm: boolean;
}

export interface Arm {
  a: string;
  b: string;
  strength: number;
  growth: number; // 0..1
  latched: boolean;
  reason: string;
}

// ── Fortschritt (Fog of War & Wachstum) ─────────────────────────────────────

export interface Progress {
  visited: IslandId[];
  understood: string[];  // Symptom-/Verfahrens-IDs, die geöffnet wurden
  practiced: string[];   // Übungs-IDs, die angesehen/geübt wurden
  bridges: number;       // bestätigte Brücken ins Uferlose
  calmMoments: number;   // erlebte Momente des Innehaltens
}

export const STAGES = ["Orientierung", "Verstehen", "Üben", "Meisterschaft"] as const;

export function stageOf(p: Progress): number {
  const score = p.visited.length + p.understood.length + p.practiced.length * 2 + p.bridges * 2 + Math.min(p.calmMoments, 5);
  if (score >= 30) return 3;
  if (score >= 16) return 2;
  if (score >= 6) return 1;
  return 0;
}

const PROGRESS_KEY = "ta3-progress-v1";
const PHENOMENA_KEY = "ta3-phenomena-v1";

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { visited: [], understood: [], practiced: [], bridges: 0, calmMoments: 0, ...JSON.parse(raw) };
  } catch { /* frisch starten */ }
  return { visited: [], understood: [], practiced: [], bridges: 0, calmMoments: 0 };
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* Speicher voll — ignorieren */ }
}

// ── Kamera ───────────────────────────────────────────────────────────────────

export interface Camera {
  x: number;
  y: number;
  zoom: number; // 1 = nah, ~0.22 = Übersicht
}

// ── State ────────────────────────────────────────────────────────────────────

export interface OceanState {
  cam: Camera;
  camTarget: Camera;
  sailing: boolean;
  overview: boolean;
  /** geöffnetes Kapitel (Vollbühne) — null = man ist auf dem Meer */
  view: IslandId | null;
  phenomena: Phenomenon[];
  arms: Arm[];
  selected: string | null;
  progress: Progress;
  /** Lexikon-Tür glimmt nur bei langsamer, ruhiger Zeigerbewegung (stille Mechanik) */
  lexikonDoorGlowing: boolean;
}

const initialCam: Camera = { x: 2600, y: 1500, zoom: 0.5 };

let state: OceanState = {
  cam: { ...initialCam },
  camTarget: { ...initialCam },
  sailing: false,
  overview: false,
  view: null,
  phenomena: [],
  arms: [],
  selected: null,
  progress: loadProgress(),
  lexikonDoorGlowing: false,
};

// Phänomene wiederherstellen
try {
  const raw = localStorage.getItem(PHENOMENA_KEY);
  if (raw) {
    const arr = JSON.parse(raw) as Phenomenon[];
    state.phenomena = arr;
    rebuildArms();
  }
} catch { /* ignorieren */ }

function persistPhenomena() {
  try { localStorage.setItem(PHENOMENA_KEY, JSON.stringify(state.phenomena)); } catch { /* ok */ }
}

// ── Store-Mechanik ───────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function getOceanState(): OceanState {
  return state;
}

// QA-/Debug-Spiegel: Zustand am Window lesbar (Smoke-Tests prüfen Arme/Auswahl)
if (typeof window !== "undefined") {
  (window as unknown as { __ta3ocean?: typeof getOceanState }).__ta3ocean = getOceanState;
}

export function subscribeOcean(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setOcean(partial: Partial<OceanState>) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn());
}

export function useOcean(): OceanState {
  return useSyncExternalStore(subscribeOcean, getOceanState, getOceanState);
}

// ── Aktionen ─────────────────────────────────────────────────────────────────

let nextPhenId = 1;
function genId() {
  return `ph-${Date.now().toString(36)}-${nextPhenId++}`;
}

/** Phänomen-Position aus Inseln heraushalten (Bojen gehören auf offenes Wasser). */
function avoidIslands(x: number, y: number): { x: number; y: number } {
  for (const isl of ISLANDS) {
    const dx = x - isl.x;
    const dy = y - isl.y;
    const d = Math.hypot(dx, dy);
    const min = isl.r * 1.45;
    if (d < min) {
      const push = (min - d) / Math.max(d, 1);
      x += dx * push;
      y += dy * push;
    }
  }
  return {
    x: Math.min(WORLD.w - 120, Math.max(120, x)),
    y: Math.min(WORLD.h - 120, Math.max(120, y)),
  };
}

/** Freitext-Phänomen ins Meer geben. Erscheint als leuchtender Körper nahe der Mitte. */
export function addPhenomenon(label: string): Phenomenon {
  const links = mapTextToAtlas(label);
  const jitter = () => (Math.random() - 0.5) * 360;
  const pos = avoidIslands(state.cam.x + jitter(), state.cam.y + jitter() * 0.6);
  const ph: Phenomenon = {
    id: genId(),
    label: label.trim().slice(0, 80),
    user: true,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    color: "#e8b86d",
    links,
    confirmed: links.filter((l) => l.strength >= 0.8).map((l) => `${l.targetType}:${l.targetId}`),
    bornAt: performance.now(),
    calm: Math.random() < 0.3,
  };
  state = { ...state, phenomena: [...state.phenomena, ph], selected: ph.id };
  persistPhenomena();
  rebuildArms();
  listeners.forEach((fn) => fn());
  return ph;
}

/** Atlas-Phänomen (Symptom/Verfahren/Übung) ins Meer werfen. */
export function addAtlasPhenomenon(targetId: string, type: TargetType, label: string): Phenomenon {
  const key = `${type}:${targetId}`;
  const existing = state.phenomena.find((p) => !p.user && p.confirmed.includes(key));
  if (existing) {
    setOcean({ selected: existing.id });
    return existing;
  }
  const jitter = () => (Math.random() - 0.5) * 500;
  const pos = avoidIslands(state.cam.x + jitter(), state.cam.y + jitter());
  const ph: Phenomenon = {
    id: genId(),
    label,
    user: false,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    color: TYPE_COLORS[type],
    links: [],
    confirmed: [key],
    bornAt: performance.now(),
    calm: false,
  };
  state = { ...state, phenomena: [...state.phenomena, ph], selected: ph.id };
  persistPhenomena();
  rebuildArms();
  listeners.forEach((fn) => fn());
  return ph;
}

export function removePhenomenon(id: string) {
  state = {
    ...state,
    phenomena: state.phenomena.filter((p) => p.id !== id),
    arms: state.arms.filter((a) => a.a !== id && a.b !== id),
    selected: state.selected === id ? null : state.selected,
  };
  persistPhenomena();
  listeners.forEach((fn) => fn());
}

export function selectPhenomenon(id: string | null) {
  setOcean({ selected: id });
}

/** Brücke ins Uferlose bestätigen (Atlas-Anbindung wird dauerhaft). */
export function confirmBridge(phenId: string, targetType: TargetType, targetId: string) {
  const key = `${targetType}:${targetId}`;
  const p = state.phenomena.find((x) => x.id === phenId);
  if (!p || p.confirmed.includes(key)) return;
  state = {
    ...state,
    phenomena: state.phenomena.map((x) => (x.id === phenId ? { ...x, confirmed: [...x.confirmed, key] } : x)),
    progress: { ...state.progress, bridges: state.progress.bridges + 1 },
  };
  saveProgress(state.progress);
  persistPhenomena();
  rebuildArms();
  listeners.forEach((fn) => fn());
}

export function markVisited(id: IslandId) {
  if (state.progress.visited.includes(id)) return;
  state = { ...state, progress: { ...state.progress, visited: [...state.progress.visited, id] } };
  saveProgress(state.progress);
  listeners.forEach((fn) => fn());
}

export function markUnderstood(id: string) {
  if (state.progress.understood.includes(id)) return;
  state = { ...state, progress: { ...state.progress, understood: [...state.progress.understood, id] } };
  saveProgress(state.progress);
  listeners.forEach((fn) => fn());
}

export function markPracticed(id: string) {
  if (state.progress.practiced.includes(id)) return;
  state = { ...state, progress: { ...state.progress, practiced: [...state.progress.practiced, id] } };
  saveProgress(state.progress);
  listeners.forEach((fn) => fn());
}

export function calmPulse() {
  state = { ...state, progress: { ...state.progress, calmMoments: state.progress.calmMoments + 1 } };
  saveProgress(state.progress);
  listeners.forEach((fn) => fn());
}

export function setLexikonDoorGlowing(v: boolean) {
  if (state.lexikonDoorGlowing !== v) setOcean({ lexikonDoorGlowing: v });
}

// ── Arme („Ärmchen") ─────────────────────────────────────────────────────────

function relatedness(a: Phenomenon, b: Phenomenon): { strength: number; reason: string } | null {
  const keysA = new Set(a.confirmed);
  const keysB = new Set(b.confirmed);
  // Direkt geteilte Atlas-Ziele → starke Verbindung
  for (const k of keysA) {
    if (keysB.has(k)) {
      const [type, id] = k.split(":");
      return { strength: 0.95, reason: type === "symptom" ? `Gemeinsames Symptom: ${id}` : "Gemeinsame Atlas-Verbindung" };
    }
  }
  // Mapping-Vorschläge zählen als schwächere Verbindung
  for (const la of a.links) {
    for (const lb of b.links) {
      if (la.targetType === lb.targetType && la.targetId === lb.targetId) {
        return { strength: 0.6, reason: "Verwandte Atlas-Nähe" };
      }
    }
  }
  // Erregungslage: gleiche Richtung zieht sich an, Gegensätze stoßen sich ab
  const arousalA = a.links[0] ? arousalOfSymptom(a.links[0].targetId) : null;
  const arousalB = b.links[0] ? arousalOfSymptom(b.links[0].targetId) : null;
  if (arousalA && arousalB) {
    if (arousalA === arousalB) return { strength: 0.5, reason: "Gleiche Erregungslage" };
    if (arousalA !== "both" && arousalB !== "both") return { strength: -0.5, reason: "Gegensätzliche Erregungslage" };
  }
  return null;
}

function rebuildArms() {
  const arms: Arm[] = [];
  const ps = state.phenomena;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const rel = relatedness(ps[i], ps[j]);
      // Anziehung wie Abstoßung (Schattenarbeit) wird ein Arm — Vorzeichen entscheidet
      if (rel && (rel.strength > 0.3 || rel.strength < -0.3)) {
        const existing = state.arms.find((a) => (a.a === ps[i].id && a.b === ps[j].id) || (a.a === ps[j].id && a.b === ps[i].id));
        arms.push({
          a: ps[i].id,
          b: ps[j].id,
          strength: rel.strength,
          growth: existing?.growth ?? 0,
          latched: existing?.latched ?? false,
          reason: rel.reason,
        });
      }
    }
  }
  state = { ...state, arms };
}

// ── Physik-Schritt (wird vom rAF-Loop der Stage aufgerufen) ─────────────────

const LINK_DIST = 620;   // Abstand, ab dem Arme wachsen
const LATCH_DIST = 300;  // Abstand, bei dem sie festhaken

export function stepPhysics(dt: number) {
  const ps = state.phenomena;
  if (ps.length === 0 && state.arms.length === 0) return;
  let changed = false;

  // Paarweise Kräfte
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 1) continue;
      const d = Math.sqrt(d2);
      const ux = dx / d;
      const uy = dy / d;
      const rel = relatedness(a, b);
      let f = 0;
      if (rel) {
        if (rel.strength > 0.3) {
          // Anziehung mit weicher Ruhedistanz — sie schweben einander entgegen
          f = Math.min(1, (d - 260) / LINK_DIST) * rel.strength * 14;
        } else if (rel.strength < -0.3) {
          // Abstoßung
          f = (1 - Math.min(1, d / 700)) * rel.strength * 60;
        }
      } else {
        // Fremde Phänomene weichen sich sacht aus
        f = -(1 - Math.min(1, d / 560)) * 26;
      }
      a.vx += ux * f * dt;
      a.vy += uy * f * dt;
      b.vx -= ux * f * dt;
      b.vy -= uy * f * dt;
    }
  }

  // Integration: Trägheit, sanftes Schweben, Weltgrenzen
  const t = performance.now() / 1000;
  for (const p of ps) {
    const bobX = Math.sin(t * 0.5 + p.bornAt / 1000) * 2.2;
    const bobY = Math.cos(t * 0.4 + p.bornAt / 700) * 2.2;
    p.vx = (p.vx + bobX * dt) * 0.94;
    p.vy = (p.vy + bobY * dt) * 0.94;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 120) { p.x = 120; p.vx = Math.abs(p.vx) * 0.5; }
    if (p.x > WORLD.w - 120) { p.x = WORLD.w - 120; p.vx = -Math.abs(p.vx) * 0.5; }
    if (p.y < 120) { p.y = 120; p.vy = Math.abs(p.vy) * 0.5; }
    if (p.y > WORLD.h - 120) { p.y = WORLD.h - 120; p.vy = -Math.abs(p.vy) * 0.5; }
  }

  // Arme wachsen / haken fest
  const arms = state.arms.map((arm) => {
    const a = ps.find((p) => p.id === arm.a);
    const b = ps.find((p) => p.id === arm.b);
    if (!a || !b) return arm;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    let growth = arm.growth;
    let latched = arm.latched;
    if (arm.strength > 0) {
      if (d < LINK_DIST) growth = Math.min(1, growth + dt * 0.8);
      if (d < LATCH_DIST && !latched) latched = true;
      if (d > LINK_DIST * 1.5) { growth = Math.max(0, growth - dt * 0.6); latched = false; }
    } else {
      // Abstoßung: sichtbar, solange sich die Phänomene nahe sind; hakt nie fest
      if (d < LINK_DIST * 1.4) growth = Math.min(1, growth + dt * 0.8);
      else growth = Math.max(0, growth - dt * 0.6);
    }
    if (growth !== arm.growth || latched !== arm.latched) changed = true;
    return { ...arm, growth, latched };
  });

  if (changed || ps.length > 0) {
    state = { ...state, arms };
    listeners.forEach((fn) => fn());
  }
}

// ── Kamera-Navigation ────────────────────────────────────────────────────────

export const MIN_ZOOM = 0.22;
export const MAX_ZOOM = 1.15;

export function setCamTarget(t: Partial<Camera>) {
  state = {
    ...state,
    camTarget: {
      x: Math.min(WORLD.w, Math.max(0, t.x ?? state.camTarget.x)),
      y: Math.min(WORLD.h, Math.max(0, t.y ?? state.camTarget.y)),
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, t.zoom ?? state.camTarget.zoom)),
    },
  };
  listeners.forEach((fn) => fn());
}

/** Kamera ein Stück dem Ziel annähern — Aufruf im rAF-Loop. */
export function stepCamera(dt: number): boolean {
  const c = state.cam;
  const t = state.camTarget;
  const k = 1 - Math.pow(0.0001, dt); // weiches Exponential
  const nx = c.x + (t.x - c.x) * k;
  const ny = c.y + (t.y - c.y) * k;
  const nz = c.zoom + (t.zoom - c.zoom) * k;
  const settled = Math.abs(nx - c.x) < 0.3 && Math.abs(ny - c.y) < 0.3 && Math.abs(nz - c.zoom) < 0.0005;
  state = { ...state, cam: { x: nx, y: ny, zoom: nz } };
  if (!settled) listeners.forEach((fn) => fn());
  return settled;
}

export function toggleOverview() {
  const ov = !state.overview;
  state = { ...state, overview: ov };
  if (ov) {
    state.camTarget = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 0.24 };
  } else {
    const home = islandById.get("navigator")!;
    state.camTarget = { x: home.x, y: home.y, zoom: 0.5 };
  }
  listeners.forEach((fn) => fn());
}

/** Zu einer Insel segeln (Kamerafahrt übers Wasser). */
export function sailTo(id: IslandId) {
  const isl = islandById.get(id)!;
  state = { ...state, sailing: true, view: null, selected: null };
  state.camTarget = { x: isl.x, y: isl.y, zoom: 0.62 };
  listeners.forEach((fn) => fn());
}

export function arrive() {
  if (!state.sailing) return;
  state = { ...state, sailing: false };
  listeners.forEach((fn) => fn());
}

export function openView(id: IslandId) {
  markVisited(id);
  state = { ...state, view: id };
  listeners.forEach((fn) => fn());
}

export function closeView() {
  state = { ...state, view: null };
  listeners.forEach((fn) => fn());
}
