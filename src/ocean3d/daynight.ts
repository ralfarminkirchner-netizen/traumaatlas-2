// Tag/Nacht-Zyklus: EINE Himmelslichtquelle (Sonne ↔ Mond) auf gemeinsamer
// Bahn. phase ∈ [0,1): 0 = Mitternacht, 0.25 = Morgengrau, 0.5 = Mittag,
// 0.75 = Abendrot. Default ~12 Echtminuten pro Vollzyklus; der HUD-Schieber
// scrubbt (pausiert kurz), QA pinnt über __ta3day.
// Reine Daten + Mathematik (THREE nur für Color/Vector3 als Behälter).

import * as THREE from "three";

export const DAY_LENGTH_S = 720; // 12 Echtminuten

/** Lebender Zustand — Szene liest pro Frame, HUD/QA schreiben. */
export const dayState = {
  phase: 0.82, // Start: späte Nacht, niedriger Mond (bewahrt die TA4-Stimmung)
  paused: false,
  resumeAt: 0,
};

export function stepDay(dt: number) {
  if (dayState.paused) {
    if (dayState.resumeAt && performance.now() > dayState.resumeAt) dayState.paused = false;
    else return;
  }
  dayState.phase = (dayState.phase + dt / DAY_LENGTH_S) % 1;
}

/** HUD-Schieber: Phase setzen, Zyklus kurz anhalten (20 s), dann weiterlaufen. */
export function scrubDay(p: number) {
  dayState.phase = ((p % 1) + 1) % 1;
  dayState.paused = true;
  dayState.resumeAt = performance.now() + 20000;
}

// ── Himmelslicht-Bahn ────────────────────────────────────────────────────────
// Sonne: a = 2π(p − 0.25) → Aufgang 0.25 (Osten), Zenith 0.5, Untergang 0.75.
// Mond läuft versetzt (a − π): auf bei Abendrot, hoch um Mitternacht.
// CELESTIAL_DIR zeigt immer auf den AKTIVEN Körper — eine Quelle, zwei Gesichter.

export function celestialDirAt(phase: number, out: THREE.Vector3): THREE.Vector3 {
  const a = 2 * Math.PI * (phase - 0.25);
  const sunY = Math.sin(a);
  if (sunY >= 0) {
    return out.set(Math.cos(a) * 0.9, sunY, -0.45).normalize();
  }
  const am = a - Math.PI;
  return out.set(Math.cos(am) * 0.75, Math.sin(am) * 0.62, -0.55).normalize();
}

/** Sonnen-Elevation (−1..1) — Vorzeichen entscheidet Tag/Nacht. */
export function sunElevation(phase: number): number {
  return Math.sin(2 * Math.PI * (phase - 0.25));
}

// ── Palette ──────────────────────────────────────────────────────────────────

export interface DayPalette {
  zenith: THREE.Color;
  horizon: THREE.Color;
  amber: THREE.Color;
  deep: THREE.Color;
  shallow: THREE.Color;
  foam: THREE.Color;
  celestial: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  ambient: THREE.Color;
  ambientI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  dirI: number;
  /** Sterne-Sichtbarkeit 0..1 */
  stars: number;
  /** Sonnenscheibe 0..1 (Mondscheibe = 1 − sunDisc bei Nacht) */
  sunDisc: number;
  /** Wolkenschleier 0..1 */
  clouds: number;
  /** Lesbarkeit der Phänomen-Lichter (Tag braucht mehr) */
  lightBoost: number;
  /** Reflexionsstärke-Skalierung (Tag: ruhigerer, klarerer Spiegel) */
  reflBoost: number;
  exposure: number;
}

interface Key {
  at: number;
  zenith: string; horizon: string; amber: string;
  deep: string; shallow: string; foam: string;
  celestial: string; fog: string; fogDensity: number;
  ambient: string; ambientI: number;
  hemiSky: string; hemiGround: string; hemiI: number;
  dirI: number; stars: number; sunDisc: number; clouds: number;
  lightBoost: number; reflBoost: number; exposure: number;
}

const NIGHT: Key = {
  at: 0, zenith: "#050a16", horizon: "#0e1a26", amber: "#b06f24",
  deep: "#071423", shallow: "#10404a", foam: "#aebdb6",
  celestial: "#f7e7c2", fog: "#071120", fogDensity: 0.0095,
  ambient: "#364763", ambientI: 0.5,
  hemiSky: "#33476b", hemiGround: "#0c1018", hemiI: 1.0,
  dirI: 0.8, stars: 1, sunDisc: 0, clouds: 0.12, lightBoost: 1.0, reflBoost: 1.0, exposure: 1.0,
};
const DAWN: Key = {
  at: 0.28, zenith: "#20305a", horizon: "#e8935a", amber: "#ff8a3d",
  deep: "#0c1f38", shallow: "#1a4753", foam: "#cfd8ce",
  celestial: "#ffc98e", fog: "#262033", fogDensity: 0.008,
  ambient: "#4a5068", ambientI: 0.6,
  hemiSky: "#5a6a94", hemiGround: "#1a1a24", hemiI: 1.05,
  dirI: 1.1, stars: 0.3, sunDisc: 0.9, clouds: 0.3, lightBoost: 1.2, reflBoost: 1.05, exposure: 1.05,
};
const DAY: Key = {
  at: 0.5, zenith: "#3f6ea6", horizon: "#b9d3e0", amber: "#d99a4e",
  deep: "#0a3550", shallow: "#1f7a82", foam: "#e6f1ec",
  celestial: "#fff2d0", fog: "#9fbdd0", fogDensity: 0.0058,
  ambient: "#b8cfe0", ambientI: 0.75,
  hemiSky: "#bcd8ea", hemiGround: "#3a5a6a", hemiI: 1.15,
  dirI: 1.6, stars: 0, sunDisc: 1, clouds: 0.55, lightBoost: 1.45, reflBoost: 1.18, exposure: 1.12,
};
const DUSK: Key = {
  at: 0.75, zenith: "#1c2b52", horizon: "#e07b39", amber: "#ff6b1f",
  deep: "#0d2036", shallow: "#1a4a56", foam: "#d8d2c4",
  celestial: "#ffb168", fog: "#241d2e", fogDensity: 0.008,
  ambient: "#4c4862", ambientI: 0.58,
  hemiSky: "#565480", hemiGround: "#181420", hemiI: 1.05,
  dirI: 1.1, stars: 0.25, sunDisc: 0.9, clouds: 0.35, lightBoost: 1.2, reflBoost: 1.05, exposure: 1.05,
};

// Wickel-sichere Schlüssel: Nacht am Anfang UND am Ende
const KEYS: Key[] = [
  NIGHT,
  { ...NIGHT, at: 0.22 },
  DAWN,
  { ...DAY, at: 0.4 },
  DAY,
  { ...DAY, at: 0.58 },
  DUSK,
  { ...NIGHT, at: 0.8 },
  { ...NIGHT, at: 1.0 },
];

const _ca = new THREE.Color();
const _cb = new THREE.Color();
function lerpColor(out: THREE.Color, a: string, b: string, t: number): THREE.Color {
  return out.copy(_ca.set(a)).lerp(_cb.set(b), t);
}

/** Palette zu einer Phase — rein, deterministisch, wickel-sicher. */
export function sampleDay(phase: number): DayPalette {
  const p = ((phase % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].at <= p) i++;
  const A = KEYS[i];
  const B = KEYS[i + 1];
  const t = THREE.MathUtils.clamp((p - A.at) / Math.max(B.at - A.at, 1e-6), 0, 1);
  const L = (x: number, y: number) => x + (y - x) * t;
  return {
    zenith: lerpColor(new THREE.Color(), A.zenith, B.zenith, t),
    horizon: lerpColor(new THREE.Color(), A.horizon, B.horizon, t),
    amber: lerpColor(new THREE.Color(), A.amber, B.amber, t),
    deep: lerpColor(new THREE.Color(), A.deep, B.deep, t),
    shallow: lerpColor(new THREE.Color(), A.shallow, B.shallow, t),
    foam: lerpColor(new THREE.Color(), A.foam, B.foam, t),
    celestial: lerpColor(new THREE.Color(), A.celestial, B.celestial, t),
    fog: lerpColor(new THREE.Color(), A.fog, B.fog, t),
    fogDensity: L(A.fogDensity, B.fogDensity),
    ambient: lerpColor(new THREE.Color(), A.ambient, B.ambient, t),
    ambientI: L(A.ambientI, B.ambientI),
    hemiSky: lerpColor(new THREE.Color(), A.hemiSky, B.hemiSky, t),
    hemiGround: lerpColor(new THREE.Color(), A.hemiGround, B.hemiGround, t),
    hemiI: L(A.hemiI, B.hemiI),
    dirI: L(A.dirI, B.dirI),
    stars: L(A.stars, B.stars),
    sunDisc: L(A.sunDisc, B.sunDisc),
    clouds: L(A.clouds, B.clouds),
    lightBoost: L(A.lightBoost, B.lightBoost),
    reflBoost: L(A.reflBoost, B.reflBoost),
    exposure: L(A.exposure, B.exposure),
  };
}

// QA-/Debug-Spiegel: Tageszeit am Window lesbar/stellbar (Probes, shot.mjs)
if (typeof window !== "undefined") {
  (window as unknown as { __ta3day?: typeof dayState }).__ta3day = dayState;
}
