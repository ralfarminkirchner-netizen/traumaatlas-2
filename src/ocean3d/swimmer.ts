// Der Schwimmer: ein Körper mit Gewicht auf der Oberfläche.
// Zeiger-Führung per Feder-Dämpfung (der Körper schwimmt, teleportiert nicht),
// Phänomen-Felder (Sog/Barriere) als echte Kräfte, Wachstum durch Annehmen.
//
// Reines TypeScript OHNE three.js — die 2D-/Legacy-Seite darf das importieren.
// Koordinaten: 3D-Ebene (x,z), Umrechnung über coords.ts.

import { getOceanState, setOcean } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { bodyState } from "./waves";
import { projStore, screenToWater, splat3D } from "./projStore";
import { x2w, z2w } from "./coords";

// ── Zustand ──────────────────────────────────────────────────────────────────

export const swimmer = {
  /** Position auf der 3D-Ebene (Start: freies Wasser südöstlich des Navigators) */
  x: 6,
  z: 5,
  vx: 0,
  vz: 0,
  /** Wachstumsstufe (Anzahl angenommener Phänomene) */
  level: 0,
  /** bereits angenommene Phänomen-Ids (Wachstum nur einmal pro Begegnung) */
  accepted: [] as string[],
  /** Klick-Ziel auf freiem Wasser (Zeiger-Führung schlägt es sofort) */
  swimTarget: null as { x: number; z: number } | null,
  /** weich geglättete Sollwerte für das Druckfeld */
  smR: 4.2,
  smStrength: 0.55,
  smActive: 0,
};

// QA-/Debug-Spiegel
if (typeof window !== "undefined") {
  (window as unknown as { __ta3swim?: typeof swimmer }).__ta3swim = swimmer;
}

// ── Parameter ────────────────────────────────────────────────────────────────

export const SWIM = {
  baseR: 4.2,          // Druckfeld-Radius (3D-Einheiten)
  baseStrength: 0.55,  // Muldentiefe
  spring: 4.2,         // Feder zum Führungspunkt
  damp: 3.6,           // Dämpfung (Gleiten)
  maxSpeed: 24,        // 3D-Einheiten/s — er schwimmt, teleportiert nicht
  fieldBase: 11,       // Feldreichweite der Phänomene
} as const;

/** Druckfeld-Radius skaliert mit dem Wachstum (würdevoll, wurzelförmig). */
export function swimmerRadius(level = swimmer.level): number {
  return SWIM.baseR * (1 + 0.16 * Math.sqrt(level));
}
export function swimmerStrength(level = swimmer.level): number {
  return SWIM.baseStrength * (1 + 0.13 * Math.sqrt(level));
}
/** Feld-Reichweite des Körpers (wie weit Phänomene ihn spüren / er sie spürt). */
export function swimmerReach(level = swimmer.level): number {
  return SWIM.fieldBase * (1 + 0.12 * Math.sqrt(level));
}
/** Masse dämpft die Höchstgeschwindigkeit leicht. */
export function swimmerMaxSpeed(level = swimmer.level): number {
  return SWIM.maxSpeed / (1 + 0.06 * Math.sqrt(level));
}

/** Begegnung annehmen: der Körper wächst (einmalig pro Phänomen). */
export function acceptPhenomenon(id: string): boolean {
  if (swimmer.accepted.includes(id)) return false;
  swimmer.accepted.push(id);
  swimmer.level += 1;
  setOcean({}); // HUD/Karte wachsen mit
  return true;
}

// ── Phänomen-Felder ──────────────────────────────────────────────────────────

/**
 * Feld-Vorzeichen eines Phänomens aus seinen Armen:
 * stärkster Arm entscheidet — negativ = Schattenarbeit (Barriere),
 * positiv = zugehörig (Sog). Ohne Arme neutral.
 */
export function fieldSign(phenId: string): number {
  const { arms } = getOceanState();
  let best = 0;
  for (const a of arms) {
    if (a.a !== phenId && a.b !== phenId) continue;
    if (Math.abs(a.strength) > Math.abs(best)) best = a.strength;
  }
  if (best > 0.3) return 1;
  if (best < -0.3) return -1;
  return 0;
}

export interface FieldForce { fx: number; fz: number; kind: "sog" | "barriere" | null; nearId: string | null }

/**
 * Kräfte der Phänomen-Felder auf den Körper (3D-Einheiten/s²).
 * Sog: weiche Anziehung mit Feldabfall. Barriere: steile Abdrängung nahe am
 * Phänomen plus Gegen-Dämpfung — Durchbrechen nur mit Schwung.
 */
export function fieldForces(): FieldForce {
  const { phenomena } = getOceanState();
  let fx = 0;
  let fz = 0;
  let kind: FieldForce["kind"] = null;
  let nearId: string | null = null;
  let nearD = Infinity;
  const reach = swimmerReach();
  for (const p of phenomena) {
    const sign = fieldSign(p.id);
    if (sign === 0) continue;
    const px = w2x(p.x);
    const pz = w2z(p.y);
    const dx = px - swimmer.x;
    const dz = pz - swimmer.z;
    const d = Math.hypot(dx, dz);
    const R = reach * (sign > 0 ? 1 : 0.8);
    if (d > R || d < 1e-3) continue;
    const ux = dx / d;
    const uz = dz / d;
    const fall = 1 - d / R;
    if (sign > 0) {
      // Sog: sanft, wächst zur Mitte
      const f = 7.5 * fall * fall;
      fx += ux * f;
      fz += uz * f;
      if (d < nearD) { nearD = d; kind = "sog"; nearId = p.id; }
    } else {
      // Barriere: steil, kalt — drückt zurück und frisst Annäherungs-Schwung
      const f = 30 * Math.pow(fall, 1.6);
      fx -= ux * f;
      fz -= uz * f;
      const vin = swimmer.vx * ux + swimmer.vz * uz; // Geschwindigkeit Richtung Phänomen
      if (vin > 0) {
        fx -= ux * vin * 2.2;
        fz -= uz * vin * 2.2;
      }
      if (d < nearD) { nearD = d; kind = "barriere"; nearId = p.id; }
    }
  }
  return { fx, fz, kind, nearId };
}

// ── Schritt (pro Frame aus Swimmer.tsx) ──────────────────────────────────────

export interface SwimStepOut {
  speed: number;
  guidance: boolean;
  field: FieldForce;
}

export function stepSwimmer(dt: number): SwimStepOut {
  const s = getOceanState();
  const inactive = !!s.view || !!s.sailing;

  // ── Führungspunkt bestimmen: Zeiger (frisch) schlägt Klick-Ziel ──
  let gx = swimmer.x;
  let gz = swimmer.z;
  let guidance = false;
  const ptr = projStore.pointer;
  if (!inactive && ptr && ptr.alive) {
    const w = screenToWater(ptr.cx, ptr.cy);
    if (w) {
      swimmer.swimTarget = null; // Zeiger-Führung schlägt Klick-segeln
      gx = w2x(w.wx);
      gz = w2z(w.wy);
      guidance = true;
    }
  }
  if (!guidance && swimmer.swimTarget && !inactive) {
    gx = swimmer.swimTarget.x;
    gz = swimmer.swimTarget.z;
    guidance = true;
    if (Math.hypot(gx - swimmer.x, gz - swimmer.z) < 1.2) swimmer.swimTarget = null;
  }

  // ── Feder-Dämpfung (Masse) ──
  if (guidance) {
    swimmer.vx += (gx - swimmer.x) * SWIM.spring * dt;
    swimmer.vz += (gz - swimmer.z) * SWIM.spring * dt;
  }

  // ── Phänomen-Felder ──
  const field = fieldForces();
  swimmer.vx += field.fx * dt;
  swimmer.vz += field.fz * dt;

  // ── Integration: gleiten, Tempo-Deckel, Weltgrenzen (weich) ──
  const dampF = Math.exp(-SWIM.damp * dt);
  swimmer.vx *= dampF;
  swimmer.vz *= dampF;
  const maxV = swimmerMaxSpeed();
  const v = Math.hypot(swimmer.vx, swimmer.vz);
  if (v > maxV) {
    swimmer.vx = (swimmer.vx / v) * maxV;
    swimmer.vz = (swimmer.vz / v) * maxV;
  }
  swimmer.x += swimmer.vx * dt;
  swimmer.z += swimmer.vz * dt;
  // Weltgrenzen: Plane ist 640×640, Welt 104×64 → ±50 / ±30 mit Rand
  const BX = 49;
  const BZ = 30;
  if (swimmer.x < -BX) { swimmer.x = -BX; swimmer.vx = Math.abs(swimmer.vx) * 0.4; }
  if (swimmer.x > BX) { swimmer.x = BX; swimmer.vx = -Math.abs(swimmer.vx) * 0.4; }
  if (swimmer.z < -BZ) { swimmer.z = -BZ; swimmer.vz = Math.abs(swimmer.vz) * 0.4; }
  if (swimmer.z > BZ) { swimmer.z = BZ; swimmer.vz = -Math.abs(swimmer.vz) * 0.4; }

  // ── Druckfeld-Zustand (weich geglättet in die Uniforms) ──
  const k = 1 - Math.pow(0.01, dt); // schnelles, weiches Nachführen
  swimmer.smR += (swimmerRadius() - swimmer.smR) * k;
  swimmer.smStrength += (swimmerStrength() - swimmer.smStrength) * k;
  const activeT = inactive ? 0 : 1;
  swimmer.smActive += (activeT - swimmer.smActive) * (1 - Math.pow(0.05, dt));
  bodyState.x = swimmer.x;
  bodyState.z = swimmer.z;
  bodyState.r = swimmer.smR;
  bodyState.strength = swimmer.smStrength;
  bodyState.active = swimmer.smActive;

  return { speed: Math.min(v, maxV), guidance, field };
}

/** Eigenwellen-Emission: Stakkato nach Tempo, Gischt-Burst bei hartem Wendepunkt/Halt. */
export class WakeEmitter {
  private acc = 0;
  private prevVx = 0;
  private prevVz = 0;
  step(dt: number, speed: number) {
    const lvl = swimmer.level;
    const size = 1 + 0.25 * Math.sqrt(lvl);
    // fortlaufende Fronten bei ausreichendem Tempo
    this.acc += dt;
    const interval = Math.max(0.14, 0.55 - speed * 0.016);
    if (speed > 3 && this.acc > interval) {
      this.acc = 0;
      splat3D(x2w(swimmer.x), z2w(swimmer.z), Math.min(1.1, (0.16 + speed * 0.02) * size));
    }
    // Gischt-Burst: schneller Richtungswechsel oder plötzlicher Halt
    const pv = Math.hypot(this.prevVx, this.prevVz);
    if (pv > 8 && speed > 4) {
      const cos = (this.prevVx * swimmer.vx + this.prevVz * swimmer.vz) / (pv * speed);
      if (cos < -0.2) splat3D(x2w(swimmer.x), z2w(swimmer.z), Math.min(2, 1.4 * size));
    } else if (pv > 10 && speed < 2) {
      splat3D(x2w(swimmer.x), z2w(swimmer.z), Math.min(2, 1.2 * size));
    }
    this.prevVx = swimmer.vx;
    this.prevVz = swimmer.vz;
  }
}
