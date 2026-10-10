// Der Schwimmer IST der Mauszeiger: die Verdrängung sitzt direkt unter dem
// Cursor und malt Wellen ins Wasser — kein Nachhinken, keine Fernsteuerung.
// Alternativ direkte Fahrt per WASD/Pfeiltasten + Maus-Look (Third-Person-
// Rennspiel): A/D und Maus-X lenken, W/S Schub und Bremse.
// Vertikal: der Körper hüpft über die Kämme (Wave-Race-Prinzip): Airtime bei
// Tempo über die Wellenflanke, Ballistik, Lande-Gischt.
//
// Reines TypeScript OHNE three.js — die 2D-/Legacy-Seite darf das importieren.

import { getOceanState, setOcean } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { bodyState, waveHeight, packetState, packet2State, packetOmega, wavePacket, wavePacket2, PACKET_PROFILE } from "./waves";
import { projStore, screenToWater, splat3D } from "./projStore";
import { x2w, z2w } from "./coords";

// ── Zustand ──────────────────────────────────────────────────────────────────

export const swimmer = {
  /** Position auf der 3D-Ebene (Start: freies Wasser südöstlich des Navigators) */
  x: 6,
  z: 5,
  /** geglättete Bewegungsgeschwindigkeit (für Wellen, Hopfen, Kamera) */
  vx: 0,
  vz: 0,
  /** Fahrtrichtung in Radiant (0 = Nord = -z) — Maus-Look + A/D lenken */
  heading: 0,
  /** Vertikal-Dynamik: Höhe über y=0, Vertikalgeschwindigkeit, Airtime */
  y: 0,
  vy: 0,
  air: false,
  /** 0 = Zeiger direkt, 1 = Tastatur-Fahrt (weicher Übergang) */
  driveMix: 0,
  /** Lande-Stoß: verstärkt kurz das Druckfeld nach Airtime */
  landPulse: 0,
  /** Zeitpunkt des letzten Fahrt-Beginns / -Endes (Zeiger-Übergabe ohne Ruck) */
  driveStartT: -1e9,
  lastDriveEndT: -1e9,
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

/** Tastatur-Fahrt: gehaltene Richtungstasten ("w"|"a"|"s"|"d") */
export const driveKeys = new Set<string>();
/** Maus-Look: horizontale Zeiger-Deltas, werden pro Frame verbraucht */
export const mouseLook = { dx: 0 };

// QA-/Debug-Spiegel
if (typeof window !== "undefined") {
  (window as unknown as { __ta3swim?: typeof swimmer }).__ta3swim = swimmer;
}

// ── Parameter ────────────────────────────────────────────────────────────────

export const SWIM = {
  baseR: 4.2,          // Druckfeld-Radius (3D-Einheiten)
  baseStrength: 0.55,  // Muldentiefe
  thrust: 30,          // Schubbeschleunigung (Tastatur-Fahrt)
  drag: 2.0,           // Wasserwiderstand
  maxSpeed: 30,        // 3D-Einheiten/s in der Fahrt
  turnRate: 2.2,       // Lenkrate A/D (rad/s, Basis)
  lookRate: 0.0042,    // Maus-Look-Empfindlichkeit (rad/px)
  gravity: 5.4,        // Fallbeschleunigung beim Hüpfen (Spielgefühl, nicht real)
  launchSlope: 1.1,    // min. vertikale Oberflächengeschwindigkeit für Airtime
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
      const f = 7.5 * fall * fall;
      fx += ux * f;
      fz += uz * f;
      if (d < nearD) { nearD = d; kind = "sog"; nearId = p.id; }
    } else {
      const f = 30 * Math.pow(fall, 1.6);
      fx -= ux * f;
      fz -= uz * f;
      const vin = swimmer.vx * ux + swimmer.vz * uz;
      if (vin > 0) {
        fx -= ux * vin * 2.2;
        fz -= uz * vin * 2.2;
      }
      if (d < nearD) { nearD = d; kind = "barriere"; nearId = p.id; }
    }
  }
  return { fx, fz, kind, nearId };
}

// ── Schritt (pro Frame aus SwimmerBody) ──────────────────────────────────────

export interface SwimStepOut {
  speed: number;
  mode: "zeiger" | "fahrt" | "ruhe";
  field: FieldForce;
  landed: number; // Lande-Stärke diesen Frame (0 = keine Landung)
}

let _prevH = 0;

// ── Das Wellenpaket: Energie-Physik ──────────────────────────────────────────
// E ∝ v²: das Reservoir lädt sich aus der Fahrgeschwindigkeit, die Amplitude
// folgt physikalisch korrekt als A ∝ √(2E). Beim Abbremsen zerfällt das Paket
// mit DECAY — die abgegebene Energie speist den Ringwellen-Train (Ripple-
// System). Bricht die Welle (Jacobi < BREAK_J an der Steilflanke), sprüht
// Gischt (Splat an der Kammposition).

let _shedAcc = 0;
let _lastRingT = -1e9;
let _lastSprayT = -1e9;

export function stepPacket(dt: number, t: number, speed: number, inactive: boolean) {
  const pk = packetState;
  if (pk.pinned) return; // QA: starrer Test-Sweep
  const P = PACKET_PROFILE;

  // Richtung nur aus echter Fahrt — im Stand nicht nachdrehen (wrap-sicher
  // als Vektor-Mischung, Heading kommt nur aus echter Zeiger-/Tastatur-Fahrt)
  if (speed > 2.5 && !inactive) {
    const hx = Math.sin(swimmer.heading);
    const hz = -Math.cos(swimmer.heading);
    const k = 1 - Math.pow(0.05, dt);
    const mx = pk.dirX + (hx - pk.dirX) * k;
    const mz = pk.dirZ + (hz - pk.dirZ) * k;
    const n = Math.hypot(mx, mz);
    if (n > 1e-4) { pk.dirX = mx / n; pk.dirZ = mz / n; }
  }
  pk.x = swimmer.x;
  pk.z = swimmer.z;

  // Energie-Reservoir: Zufluss E = ½v² (gedeckelt), Zerfall beim Abbremsen
  const target = inactive ? 0 : 0.5 * Math.min(speed, 45) ** 2;
  if (target >= pk.energy) {
    pk.energy += (target - pk.energy) * (1 - Math.exp(-P.FILL * dt));
  } else {
    const shed = (pk.energy - target) * (1 - Math.exp(-P.DECAY * dt));
    pk.energy -= shed;
    _shedAcc += shed;
    pk.shedTotal += shed;
  }
  pk.amp = Math.min(P.MAX_AMP, P.GAIN * Math.sqrt(2 * Math.max(pk.energy, 0)));
  pk.active = swimmer.smActive;

  // Ringwellen-Train: abgebremste Energie läuft als Ringe aus (gedrosselt)
  if (_shedAcc > 55 && t - _lastRingT > 0.35) {
    _lastRingT = t;
    splat3D(x2w(pk.x), z2w(pk.z), Math.min(1.2, 0.35 + _shedAcc / 280));
    _shedAcc *= 0.25;
  }

  // Brechen: Jacobi-Minimum an der Steilflanke (sin φ = 1) → Gischt-Spray
  if (pk.amp > 0.45 && t - _lastSprayT > 0.28) {
    const kW = (2 * Math.PI) / pk.len;
    const w = packetOmega(pk.len);
    const twoPi = 2 * Math.PI;
    // u-Offset der steilsten Flanke, ins Intervall [-λ/2, λ/2) um das Zentrum
    let uStar = ((w * t + Math.PI / 2) % twoPi) / kW;
    if (uStar >= pk.len / 2) uStar -= pk.len;
    const sx = pk.x + pk.dirX * uStar;
    const sz = pk.z + pk.dirZ * uStar;
    const smp = wavePacket(sx, sz, t);
    if (smp.j < P.BREAK_J && smp.env > 0.35) {
      _lastSprayT = t;
      splat3D(x2w(sx), z2w(sz), Math.min(1.6, 0.5 + (P.BREAK_J - smp.j) * 2.6));
    }
  }
}

// ── Die zweite Welle: eigener Zeiger, eigene Energie ─────────────────────────
// Zweiter Finger (Touch) bzw. beide Maustasten / Cmd (Maus) führen ein zweites,
// unabhängiges Paket — gleiche Energie-Physik (E ∝ v², A ∝ √(2E)), gleiche
// Würde. Ohne zweiten Zeiger zerfällt es mit DECAY zum Ringwellen-Train.

let _shedAcc2 = 0;
let _lastRing2T = -1e9;
let _lastSpray2T = -1e9;
let _act2 = 0;
let _v2x = 0;
let _v2z = 0;

export function stepPacket2(dt: number, t: number, inactive: boolean) {
  const pk = packet2State;
  if (pk.pinned) return; // QA: starrer Test-Sweep
  const P = PACKET_PROFILE;
  const ptr2 = projStore.pointer2;
  const live = !inactive && ptr2.alive;

  // Aktiv-Blende weich (wie swimmer.smActive, aber am zweiten Zeiger hängend)
  _act2 += ((live ? 1 : 0) - _act2) * (1 - Math.exp(-5 * dt));

  if (live) {
    const w = screenToWater(ptr2.cx, ptr2.cy);
    if (w) {
      const tx = w2x(w.wx);
      const tz = w2z(w.wy);
      // Momentangeschwindigkeit des zweiten Zeigers (geglättet wie Paket 1)
      const ivx = (tx - pk.x) / dt;
      const ivz = (tz - pk.z) / dt;
      _v2x = _v2x * 0.7 + ivx * 0.3;
      _v2z = _v2z * 0.7 + ivz * 0.3;
      pk.x = tx;
      pk.z = tz;
      // Richtung nur aus echter Bewegung — im Stand nicht nachdrehen
      const sp = Math.hypot(_v2x, _v2z);
      if (sp > 2.5) {
        const hx = _v2x / sp;
        const hz = _v2z / sp;
        const k = 1 - Math.pow(0.05, dt);
        const mx = pk.dirX + (hx - pk.dirX) * k;
        const mz = pk.dirZ + (hz - pk.dirZ) * k;
        const n = Math.hypot(mx, mz);
        if (n > 1e-4) { pk.dirX = mx / n; pk.dirZ = mz / n; }
      }
    }
  } else {
    _v2x = 0;
    _v2z = 0;
  }

  // Energie-Reservoir: Zufluss E = ½v² (gedeckelt), Zerfall beim Loslassen
  const sp2 = Math.hypot(_v2x, _v2z);
  const target = live ? 0.5 * Math.min(sp2, 45) ** 2 : 0;
  if (target >= pk.energy) {
    pk.energy += (target - pk.energy) * (1 - Math.exp(-P.FILL * dt));
  } else {
    const shed = (pk.energy - target) * (1 - Math.exp(-P.DECAY * dt));
    pk.energy -= shed;
    _shedAcc2 += shed;
    pk.shedTotal += shed;
  }
  pk.amp = Math.min(P.MAX_AMP, P.GAIN * Math.sqrt(2 * Math.max(pk.energy, 0)));
  pk.active = _act2;

  // Ringwellen-Train beim Loslassen (gedrosselt)
  if (_shedAcc2 > 55 && t - _lastRing2T > 0.35) {
    _lastRing2T = t;
    splat3D(x2w(pk.x), z2w(pk.z), Math.min(1.2, 0.35 + _shedAcc2 / 280));
    _shedAcc2 *= 0.25;
  }

  // Brechen: Jacobi-Minimum an der Steilflanke → Gischt-Spray
  if (pk.amp > 0.45 && t - _lastSpray2T > 0.28) {
    const kW = (2 * Math.PI) / pk.len;
    const w = packetOmega(pk.len);
    const twoPi = 2 * Math.PI;
    let uStar = ((w * t + Math.PI / 2) % twoPi) / kW;
    if (uStar >= pk.len / 2) uStar -= pk.len;
    const sx = pk.x + pk.dirX * uStar;
    const sz = pk.z + pk.dirZ * uStar;
    const smp = wavePacket2(sx, sz, t);
    if (smp.j < P.BREAK_J && smp.env > 0.35) {
      _lastSpray2T = t;
      splat3D(x2w(sx), z2w(sz), Math.min(1.6, 0.5 + (P.BREAK_J - smp.j) * 2.6));
    }
  }
}


export function stepSwimmer(dt: number, t: number): SwimStepOut {
  const s = getOceanState();
  const inactive = !!s.view || !!s.sailing;
  const ptr = projStore.pointer;

  // Fahr-Modus-Mischung: Tasten gehalten → Fahrt, sonst Zeiger
  const now = performance.now();
  const driving = driveKeys.size > 0 && !inactive;
  const wasDriving = swimmer.driveMix > 0.5;
  swimmer.driveMix += ((driving ? 1 : 0) - swimmer.driveMix) * (1 - Math.pow(0.015, dt));
  if (driving && !wasDriving && swimmer.driveMix > 0.5) swimmer.driveStartT = now;
  if (!driving && wasDriving && swimmer.driveMix <= 0.5) swimmer.lastDriveEndT = now;

  // Maus-Look: Heading aus horizontalem Zeiger-Delta (wirkt voll in der Fahrt,
  // leicht auch im Zeiger-Modus, damit der Übergang weich bleibt)
  swimmer.heading += mouseLook.dx * SWIM.lookRate * Math.max(swimmer.driveMix, 0.2);
  mouseLook.dx = 0;

  let mode: SwimStepOut["mode"] = "ruhe";
  let speed = Math.hypot(swimmer.vx, swimmer.vz);

  if (swimmer.driveMix > 0.5) {
    // ── Tastatur-Fahrt (Third-Person-Rennspiel) ──
    mode = "fahrt";
    const fwd = (driveKeys.has("w") ? 1 : 0) - (driveKeys.has("s") ? 0.55 : 0);
    const steer = (driveKeys.has("d") ? 1 : 0) - (driveKeys.has("a") ? 1 : 0);
    // A/D lenkt — stärker bei Tempo (Rennspiel), nicht im Stand
    swimmer.heading -= steer * dt * SWIM.turnRate * (0.35 + Math.min(1, speed / 14));
    const hx = Math.sin(swimmer.heading);
    const hz = -Math.cos(swimmer.heading);
    swimmer.vx += hx * fwd * SWIM.thrust * dt;
    swimmer.vz += hz * fwd * SWIM.thrust * dt;
    const dragF = Math.exp(-SWIM.drag * dt);
    swimmer.vx *= dragF;
    swimmer.vz *= dragF;
    // Feld-Kräfte wirken in der Fahrt voll
    const field = fieldForces();
    swimmer.vx += field.fx * dt;
    swimmer.vz += field.fz * dt;
    const maxV = swimmerMaxSpeed();
    const v = Math.hypot(swimmer.vx, swimmer.vz);
    if (v > maxV) {
      swimmer.vx = (swimmer.vx / v) * maxV;
      swimmer.vz = (swimmer.vz / v) * maxV;
    }
    swimmer.x += swimmer.vx * dt;
    swimmer.z += swimmer.vz * dt;
    speed = Math.min(v, maxV);
  } else if (
    !inactive && ptr && ptr.alive &&
    now - swimmer.lastDriveEndT > 1200 && // Schonfrist nach der Fahrt: kein Rücksprung
    ptr.t > swimmer.driveStartT           // erst wenn der Zeiger wieder bewegt wurde
  ) {
    // ── Der Schwimmer IST der Zeiger: direkte Projektion, kein Nachhinken ──
    const w = screenToWater(ptr.cx, ptr.cy);
    if (w) {
      mode = "zeiger";
      const tx = w2x(w.wx);
      const tz = w2z(w.wy);
      // Momentangeschwindigkeit aus der Zeigerbewegung (geglättet) — treibt
      // Wellen, Verdrängungsdynamik, Hopfen und Kamera, nie die Position
      const ivx = (tx - swimmer.x) / dt;
      const ivz = (tz - swimmer.z) / dt;
      swimmer.vx = swimmer.vx * 0.7 + ivx * 0.3;
      swimmer.vz = swimmer.vz * 0.7 + ivz * 0.3;
      swimmer.x = tx;
      swimmer.z = tz;
      const sp = Math.hypot(swimmer.vx, swimmer.vz);
      // Heading nur aus echter Zeigerbewegung — nicht aus Kamera-Bob-Jitter,
      // sonst kippt die Fahrtrichtung beim Übergang in die Tastatur-Fahrt
      if (sp > 2 && performance.now() - ptr.t < 300) {
        swimmer.heading = Math.atan2(swimmer.vx, -swimmer.vz);
      }
      speed = Math.min(sp, 45);
    }
  } else {
    // ── Ruhe: ausgleiten ──
    const dragF = Math.exp(-SWIM.drag * 1.4 * dt);
    swimmer.vx *= dragF;
    swimmer.vz *= dragF;
    swimmer.x += swimmer.vx * dt;
    swimmer.z += swimmer.vz * dt;
    speed = Math.hypot(swimmer.vx, swimmer.vz);
  }

  // Weltgrenzen (weich)
  const BX = 49;
  const BZ = 30;
  if (swimmer.x < -BX) { swimmer.x = -BX; swimmer.vx = Math.abs(swimmer.vx) * 0.4; }
  if (swimmer.x > BX) { swimmer.x = BX; swimmer.vx = -Math.abs(swimmer.vx) * 0.4; }
  if (swimmer.z < -BZ) { swimmer.z = -BZ; swimmer.vz = Math.abs(swimmer.vz) * 0.4; }
  if (swimmer.z > BZ) { swimmer.z = BZ; swimmer.vz = -Math.abs(swimmer.vz) * 0.4; }

  // ── Wave-Race-Hopfen: Airtime über der Wellenflanke ──
  const H = waveHeight(swimmer.x, swimmer.z, t, projStore.calm);
  let landed = 0;
  if (!swimmer.air) {
    // vertikale Oberflächengeschwindigkeit entlang der Fahrt (Wellen + eigenes Tempo)
    const dH = dt > 0 ? (H - _prevH) / dt : 0;
    if (speed > 6.5 && dH > SWIM.launchSlope) {
      swimmer.vy = Math.min(7, dH * 1.05 + speed * 0.05);
      swimmer.air = true;
    } else {
      swimmer.y = H;
    }
  }
  _prevH = H;
  if (swimmer.air) {
    swimmer.vy -= SWIM.gravity * dt;
    swimmer.y += swimmer.vy * dt;
    if (swimmer.y <= H && swimmer.vy < 0) {
      // Landung: Gischt + Druckstoß
      swimmer.air = false;
      swimmer.y = H;
      landed = Math.min(2, 0.5 + Math.abs(swimmer.vy) * 0.32);
      swimmer.landPulse = Math.min(1.6, Math.abs(swimmer.vy) * 0.28);
      splat3D(x2w(swimmer.x), z2w(swimmer.z), landed);
      swimmer.vy = 0;
    }
  }
  swimmer.landPulse *= Math.exp(-2.6 * dt);

  // ── Druckfeld-Zustand (weich geglättet in die Uniforms) ──
  const k = 1 - Math.pow(0.01, dt);
  swimmer.smR += (swimmerRadius() - swimmer.smR) * k;
  swimmer.smStrength += (swimmerStrength() - swimmer.smStrength) * k;
  const activeT = inactive ? 0 : 1;
  swimmer.smActive += (activeT - swimmer.smActive) * (1 - Math.pow(0.05, dt));
  bodyState.x = swimmer.x;
  bodyState.z = swimmer.z;
  bodyState.r = swimmer.smR;
  // Lande-Stoß + Tempo drücken die Mulde tiefer (Gewicht spürbar)
  const dyn = 1 + swimmer.landPulse + Math.min(0.35, speed * 0.008);
  bodyState.strength = swimmer.smStrength * dyn;
  bodyState.active = swimmer.smActive;

  // Das Wellenpaket: Energie ∝ v² → Amplitude, Zerfall, Brechen
  stepPacket(dt, t, speed, inactive);
  // Die zweite Welle: zweiter Finger / beide Tasten / Cmd
  stepPacket2(dt, t, inactive);

  return { speed, mode, field: fieldForces(), landed };
}

/** Eigenwellen-Emission: das Wasser wird direkt bemalt — Stakkato nach Tempo,
 *  Gischt-Burst bei hartem Wendepunkt oder plötzlichem Halt. */
export class WakeEmitter {
  private acc = 0;
  private prevVx = 0;
  private prevVz = 0;
  step(dt: number, speed: number) {
    const lvl = swimmer.level;
    const size = 1 + 0.25 * Math.sqrt(lvl);
    this.acc += dt;
    const interval = Math.max(0.1, 0.5 - speed * 0.014);
    if (speed > 2 && this.acc > interval) {
      this.acc = 0;
      splat3D(x2w(swimmer.x), z2w(swimmer.z), Math.min(1.1, (0.16 + speed * 0.02) * size));
    }
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
