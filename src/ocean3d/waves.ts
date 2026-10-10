// Gerstner-Wellen: gemeinsame Parameter für GPU (Shader) und CPU (Bobbing/Kamera).
// Die CPU-Sampler müssen exakt die Shader-Mathematik spiegeln.

export interface GerstnerComp {
  /** normierte Ausbreitungsrichtung in der XZ-Ebene */
  dx: number;
  dz: number;
  /** Amplitude (Welteinheiten) */
  amp: number;
  /** Wellenlänge (Welteinheiten) */
  len: number;
  /** Steilheit Q (0..1, skaliert die horizontale Verdrängung) */
  q: number;
  /** Zeit-Skalierung (Dispersion künstlich verlangsamt: Nachtmeer) */
  speed: number;
}

// 6 Komponenten, Richtungen um die Mondrichtung gefächert (kohärenter Glitzerpfad)
export const GERSTNER: GerstnerComp[] = [
  { dx: 0.84, dz: -0.54, amp: 0.145, len: 24.0, q: 0.42, speed: 0.9 },
  { dx: 0.97, dz: 0.24, amp: 0.105, len: 14.0, q: 0.46, speed: 1.05 },
  { dx: -0.42, dz: -0.91, amp: 0.08, len: 9.2, q: 0.5, speed: 1.0 },
  { dx: 0.55, dz: 0.83, amp: 0.055, len: 5.6, q: 0.45, speed: 1.25 },
  { dx: -0.9, dz: 0.44, amp: 0.04, len: 3.5, q: 0.38, speed: 1.45 },
  { dx: 0.18, dz: -0.98, amp: 0.026, len: 2.2, q: 0.32, speed: 1.7 },
];

const G = 9.81;
/** künstliche Zeitdilatation, damit das Meer würdevoll langsam atmet */
const TIME_DILATION = 0.16;

export function angularFreq(len: number): number {
  return Math.sqrt(G * ((2 * Math.PI) / len));
}

/** Wellenhöhe an Weltposition (x,z) zur Zeit t — deckungsgleich mit dem Shader. */
export function waveHeight(x: number, z: number, t: number, calm = 0): number {
  let y = 0;
  const ampScale = 1 - 0.68 * calm;
  const tt = t * TIME_DILATION;
  for (const w of GERSTNER) {
    const k = (2 * Math.PI) / w.len;
    const w_t = angularFreq(w.len) * w.speed;
    const phi = k * (w.dx * x + w.dz * z) + w_t * tt;
    y += w.amp * ampScale * Math.sin(phi);
  }
  return y;
}

/** Approximierte Normale (nur Vertikalanteil der Gerstner-Summe; reicht für Bobbing). */
export function waveNormal(x: number, z: number, t: number, calm = 0): [number, number, number] {
  let nx = 0;
  let nz = 0;
  const ampScale = 1 - 0.68 * calm;
  const tt = t * TIME_DILATION;
  for (const w of GERSTNER) {
    const k = (2 * Math.PI) / w.len;
    const w_t = angularFreq(w.len) * w.speed;
    const phi = k * (w.dx * x + w.dz * z) + w_t * tt;
    const c = Math.cos(phi) * w.amp * ampScale * k;
    nx += c * w.dx;
    nz += c * w.dz;
  }
  const inv = 1 / Math.hypot(nx, 1, nz);
  return [-nx * inv, inv, -nz * inv];
}

// ── Schwimmer-Verdrängung (Druckfeld) ────────────────────────────────────────
// Der Körper drückt das Wasser weg: Gauß-Mulde unter ihm + Randwulst ringsherum.
// CPU- und GPU-Seite MÜSSEN deckungsgleich bleiben — gleiche Konstanten,
// gleiche Formel (BODY_GLSL spiegelt bodyDisplacement/bodyGradient).

export const BODY_PROFILE = {
  /** Mulden-Profil: exp(-d² / (r² · BOWL_K)) */
  BOWL_K: 0.85,
  /** Randwulst: Radius-Faktor, Breite (rel. r), Höhe (rel. Muldentiefe) */
  RIM_R: 1.5,
  RIM_W: 0.62,
  RIM_H: 0.38,
} as const;

/**
 * Körperzustand auf der 3D-Ebene (Einheiten der 3D-Welt, nicht 2D-Weltkoordinaten).
 * strength = Muldentiefe in Welteinheiten; active 0..1 blendet das Feld weich ein.
 */
export const bodyState = {
  x: 0,
  z: -2,
  r: 4.2,
  strength: 0.55,
  active: 1,
};

/** Höhenbeitrag der Verdrängung an (x,z) — deckungsgleich mit bodyHeight() im Shader. */
export function bodyDisplacement(x: number, z: number): number {
  const w = bodyState.strength * bodyState.active;
  if (w <= 0.0001) return 0;
  const dx = x - bodyState.x;
  const dz = z - bodyState.z;
  const r = Math.max(bodyState.r, 0.001);
  const d2 = dx * dx + dz * dz;
  const s = Math.sqrt(d2);
  const bowl = Math.exp(-d2 / (r * r * BODY_PROFILE.BOWL_K));
  const u = (s - r * BODY_PROFILE.RIM_R) / (r * BODY_PROFILE.RIM_W);
  const rim = BODY_PROFILE.RIM_H * Math.exp(-u * u);
  return w * (rim - bowl);
}

/** Gradient (∂h/∂x, ∂h/∂z) der Verdrängung — für Neigung/Normale, gleiche Mathematik wie der Shader. */
export function bodyGradient(x: number, z: number): [number, number] {
  const w = bodyState.strength * bodyState.active;
  if (w <= 0.0001) return [0, 0];
  const dx = x - bodyState.x;
  const dz = z - bodyState.z;
  const r = Math.max(bodyState.r, 0.001);
  const d2 = dx * dx + dz * dz;
  const s = Math.sqrt(d2);
  const bowl = Math.exp(-d2 / (r * r * BODY_PROFILE.BOWL_K));
  const u = (s - r * BODY_PROFILE.RIM_R) / (r * BODY_PROFILE.RIM_W);
  const rimE = BODY_PROFILE.RIM_H * Math.exp(-u * u);
  // ∂bowl/∂xz = bowl · (-2/(r²·K)) · d
  const kb = bowl * (-2 / (r * r * BODY_PROFILE.BOWL_K));
  // ∂rim/∂xz = rimE · (-2u/(r·W)) · (d/s)
  const kr = s > 1e-4 ? (rimE * (-2 * u)) / (r * BODY_PROFILE.RIM_W) / s : 0;
  const k = w * (kr - kb);
  return [k * dx, k * dz];
}

/** GLSL: Uniform + Funktion, exakte Spiegelung der CPU-Mathematik oben. */
export const BODY_GLSL = /* glsl */ `
uniform vec4 uBody; // x, z, radius, stärke·aktiv (0 = aus)

// Verdrängung des Schwimmer-Körpers: Mulde + Randwulst, mit Gradient für die Normale.
float bodyHeight(vec2 xz, out vec2 grad) {
  grad = vec2(0.0);
  if (uBody.w <= 0.0001) return 0.0;
  vec2 d = xz - uBody.xy;
  float r = max(uBody.z, 0.001);
  float d2 = dot(d, d);
  float s = sqrt(d2);
  float bowl = exp(-d2 / (r * r * ${BODY_PROFILE.BOWL_K}));
  float u = (s - r * ${BODY_PROFILE.RIM_R}) / (r * ${BODY_PROFILE.RIM_W});
  float rimE = ${BODY_PROFILE.RIM_H} * exp(-u * u);
  float h = uBody.w * (rimE - bowl);
  float kb = bowl * (-2.0 / (r * r * ${BODY_PROFILE.BOWL_K}));
  float kr = s > 1e-4 ? (rimE * (-2.0 * u)) / (r * ${BODY_PROFILE.RIM_W}) / s : 0.0;
  grad = uBody.w * (kr - kb) * d;
  return h;
}
`;

// QA-/Debug-Spiegel: Körperzustand am Window lesbar/stellbar (Probes, shot.mjs)
if (typeof window !== "undefined") {
  (window as unknown as { __ta3body?: typeof bodyState }).__ta3body = bodyState;
}

// ── Das Wellenpaket (das Selbst) ─────────────────────────────────────────────
// Gerichtetes Gauß-Paket als laufende Welle: Gauß-Hüllkurve (entlang σu, quer
// σv) × Trägerwelle sin(k·u − ω·t) mit Tiefwasser-Dispersion ω = √(g·k) — die
// Kämme laufen mit Phasengeschwindigkeit durchs Paket (c = 2·c_gruppe), kein
// statischer Tropf. Horizontale Verdrängung Gerstner-artig entlang der
// Richtung → Jacobi-Determinante als Brech-Kriterium (Steilheitsschwelle).
// CPU- und GPU-Seite MÜSSEN deckungsgleich bleiben (PACKET_GLSL spiegelt
// wavePacket). Das Körper-Druckfeld (BODY_GLSL) bleibt als Mulde darunter.

export const PACKET_PROFILE = {
  /** Wellenlänge der Trägerwelle (Welteinheiten) — ≥ 4 Vertices pro Periode */
  LEN: 10.0,
  /** Hüllkurven-Breite entlang der Fahrtrichtung (kurzer Wellenzug) */
  SIGMA_U: 7.6,
  /** Hüllkurven-Breite quer (die Kammlinie trägt seitlich aus) */
  SIGMA_V: 11.0,
  /** Steilheitsparameter der Horizontalverdrängung (Jacobi; < 1/(k·A_max) = 1.18) */
  Q: 1.05,
  /** eigene Zeitdehnung — lebendiger als das Meer (0.16), würdevoller als echt */
  DILATION: 0.55,
  /** Amplituden-Gewinn: A = GAIN · √(2E), E = ½v² → A ∝ v */
  GAIN: 0.03,
  /** Würde-Deckel: nie Monsterwelle */
  MAX_AMP: 1.35,
  /** Aufladerate des Energie-Reservoirs (1/s) — schnelle Antwort auf Zeiger */
  FILL: 6.0,
  /** Zerfallsrate beim Abbremsen (1/s) — die Welle läuft aus, nicht abrupt aus */
  DECAY: 1.1,
  /** Jacobi-Schwelle: darunter bricht die Welle (Weißkapsel + Gischt) */
  BREAK_J: 0.42,
} as const;

/**
 * Paketzustand auf der 3D-Ebene. energy = Reservoir (∝ v²), amp folgt √(2E).
 * pinned = QA-Modus: stepPacket rührt nichts an (starrer Test-Sweep).
 */
export const packetState = {
  x: 6,
  z: 5,
  dirX: 0,
  dirZ: -1,
  energy: 0,
  amp: 0,
  len: PACKET_PROFILE.LEN,
  sigmaU: PACKET_PROFILE.SIGMA_U,
  sigmaV: PACKET_PROFILE.SIGMA_V,
  active: 0,
  pinned: false,
  /** QA-Zähler: kumulativ abgegebene Energie (Ringwellen-Train beim Abbremsen) */
  shedTotal: 0,
};

/** Zweites unabhängiges Paket: zweiter Finger (Touch), bei Maus beide
 *  Maustasten ODER Cmd. Gleiche Physik, eigener Zustand — die Pakete
 *  superponieren sich im Shader per linearer Addition (Beugung beim Kreuzen). */
export const packet2State = {
  x: 0,
  z: 0,
  dirX: 0,
  dirZ: -1,
  energy: 0,
  amp: 0,
  len: PACKET_PROFILE.LEN,
  sigmaU: PACKET_PROFILE.SIGMA_U,
  sigmaV: PACKET_PROFILE.SIGMA_V,
  active: 0,
  pinned: false,
  shedTotal: 0,
};

/** Kreisfrequenz der Trägerwelle: Tiefwasser-Dispersion ω = √(g·k), gedehnt. */
export function packetOmega(len: number = packetState.len): number {
  return angularFreq(len) * PACKET_PROFILE.DILATION;
}

export interface PacketSample {
  h: number;
  gx: number;
  gz: number;
  /** Jacobi-Determinante der Horizontalverdrängung (1 = ungestört, ≤ BREAK_J = bricht) */
  j: number;
  /** Hüllkurvenwert 0..1 (für Glanz/Gischt-Masken) */
  env: number;
  /** horizontale Verdrängung entlang der Richtung (Scheitel-Schrägstellung) */
  disp: number;
}

/** Struktur, die ein Paket zum Samplen braucht (packetState / packet2State). */
interface PacketLike {
  x: number; z: number; dirX: number; dirZ: number;
  amp: number; active: number; len: number; sigmaU: number; sigmaV: number;
}

/** Gemeinsame Paket-Mathematik — deckungsgleich mit packetCore() im Shader. */
function wavePacketAt(x: number, z: number, t: number, pk: PacketLike): PacketSample {
  const A = pk.amp * pk.active;
  if (A <= 1e-5) return { h: 0, gx: 0, gz: 0, j: 1, env: 0, disp: 0 };
  const dx = x - pk.x;
  const dz = z - pk.z;
  const ux = pk.dirX;
  const uz = pk.dirZ;
  const px = -uz;
  const pz = ux;
  const u = ux * dx + uz * dz;
  const v = px * dx + pz * dz;
  const su = Math.max(pk.sigmaU, 0.3);
  const sv = Math.max(pk.sigmaV, 0.3);
  const eu = (-2 * u) / (su * su);
  const ev = (-2 * v) / (sv * sv);
  const env = Math.exp(-(u * u) / (su * su) - (v * v) / (sv * sv));
  const k = (2 * Math.PI) / pk.len;
  const w = packetOmega(pk.len);
  const phi = k * u - w * t;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const h = A * env * s;
  // Höhengradient: ∂h/∂xz = A·(∇env·sinφ + env·cosφ·k·dir)
  const denvx = env * (eu * ux + ev * px);
  const denvz = env * (eu * uz + ev * pz);
  const gx = A * (denvx * s + env * c * k * ux);
  const gz = A * (denvz * s + env * c * k * uz);
  // Horizontale Verdrängung D·dir (Gerstner-artig): J = 1 + ∂D/∂u
  const disp = PACKET_PROFILE.Q * A * env * c;
  const j = 1 + PACKET_PROFILE.Q * A * env * (eu * c - k * s);
  return { h, gx, gz, j, env, disp };
}

/** Paket 1 (das Selbst) — deckungsgleich mit packetHeight() im Shader. */
export function wavePacket(x: number, z: number, t: number): PacketSample {
  return wavePacketAt(x, z, t, packetState);
}

/** Paket 2 (die zweite Welle) — deckungsgleich mit packet2Height() im Shader. */
export function wavePacket2(x: number, z: number, t: number): PacketSample {
  return wavePacketAt(x, z, t, packet2State);
}

/** GLSL: Uniforms + Funktionen, exakte Spiegelung der CPU-Mathematik oben. */
export const PACKET_GLSL = /* glsl */ `
uniform vec4 uPackA; // Paket 1 (das Selbst): x, z, dirX, dirZ
uniform vec4 uPackB; // amp·aktiv, k, sigmaU, sigmaV
uniform vec2 uPackC; // omega, q (Steilheit)
uniform vec4 uPack2A; // Paket 2 (zweiter Finger / Cmd): x, z, dirX, dirZ
uniform vec4 uPack2B; // amp·aktiv, k, sigmaU, sigmaV
uniform vec2 uPack2C; // omega, q

// Gemeinsamer Kern: laufendes gerichtetes Gauß-Wellenpaket.
// Liefert Höhe; out: Höhengradient, Jacobi, Hüllkurve, horiz. Verdrängung.
float packetCore(vec2 xz, vec4 pA, vec4 pB, vec2 pC, out vec2 grad, out float j, out float env, out float disp) {
  grad = vec2(0.0); j = 1.0; env = 0.0; disp = 0.0;
  float A = pB.x;
  if (A <= 1e-5) return 0.0;
  vec2 d = xz - pA.xy;
  vec2 dir = pA.zw;
  vec2 per = vec2(-dir.y, dir.x);
  float u = dot(dir, d);
  float v = dot(per, d);
  float su = max(pB.z, 0.3);
  float sv = max(pB.w, 0.3);
  float eu = -2.0 * u / (su * su);
  float ev = -2.0 * v / (sv * sv);
  env = exp(-u * u / (su * su) - v * v / (sv * sv));
  float k = pB.y;
  float phi = k * u - pC.x * uTime;
  float s = sin(phi);
  float c = cos(phi);
  float h = A * env * s;
  vec2 denv = env * (eu * dir + ev * per);
  grad = A * (denv * s + env * c * k * dir);
  disp = pC.y * A * env * c;
  j = 1.0 + pC.y * A * env * (eu * c - k * s);
  return h;
}

// Paket 1 (das Selbst) — deckungsgleich mit wavePacket() auf der CPU.
float packetHeight(vec2 xz, out vec2 grad, out float j, out float env, out float disp) {
  return packetCore(xz, uPackA, uPackB, uPackC, grad, j, env, disp);
}

// Paket 2 (die zweite Welle) — deckungsgleich mit wavePacket2() auf der CPU.
float packet2Height(vec2 xz, out vec2 grad, out float j, out float env, out float disp) {
  return packetCore(xz, uPack2A, uPack2B, uPack2C, grad, j, env, disp);
}
`;

// QA-/Debug-Spiegel: Paketzustände am Window lesbar/stellbar (Probes, shot.mjs)
if (typeof window !== "undefined") {
  const w = window as unknown as { __ta3pack?: typeof packetState; __ta3pack2?: typeof packet2State };
  w.__ta3pack = packetState;
  w.__ta3pack2 = packet2State;
}

// ── GLSL ─────────────────────────────────────────────────────────────────────

export const GERSTNER_COUNT = GERSTNER.length;

/** GLSL: Konstanten + Funktion, die Position verdrängt, Normale & Kamm-Faktor liefert. */
export const GERSTNER_GLSL = /* glsl */ `
const int G_COUNT = ${GERSTNER.length};
// dirX, dirZ, amp, k
const vec4 G_A[G_COUNT] = vec4[G_COUNT](
${GERSTNER.map((w) => `  vec4(${w.dx.toFixed(4)}, ${w.dz.toFixed(4)}, ${w.amp.toFixed(4)}, ${(2 * Math.PI / w.len).toFixed(5)})`).join(",\n")}
);
// omega, Q
const vec2 G_B[G_COUNT] = vec2[G_COUNT](
${GERSTNER.map((w) => `  vec2(${(angularFreq(w.len) * w.speed * TIME_DILATION).toFixed(5)}, ${w.q.toFixed(3)})`).join(",\n")}
);

uniform float uTime;
uniform float uCalm; // 0 = normal, 1 = ganz still

// Verdrängt p (xz bleiben Referenz), liefert Normale und Kamm-Faktor (Schaum).
vec3 gerstner(vec2 xz, out vec3 nrm, out float crest) {
  float ampScale = 1.0 - 0.68 * uCalm;
  vec3 p = vec3(xz.x, 0.0, xz.y);
  vec3 dPdx = vec3(1.0, 0.0, 0.0);
  vec3 dPdz = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < G_COUNT; i++) {
    vec4 a = G_A[i];
    vec2 b = G_B[i];
    float amp = a.z * ampScale;
    float phi = a.w * (a.x * xz.x + a.y * xz.y) + b.x * uTime;
    float s = sin(phi);
    float c = cos(phi);
    float qa = b.y * amp;
    p.x += qa * a.x * c;
    p.y += amp * s;
    p.z += qa * a.y * c;
    float wa = a.w * amp;
    float qwa = b.y * wa;
    dPdx += vec3(-qwa * a.x * a.x * s, wa * a.x * c, -qwa * a.x * a.y * s);
    dPdz += vec3(-qwa * a.x * a.y * s, wa * a.y * c, -qwa * a.y * a.y * s);
  }
  nrm = normalize(cross(dPdz, dPdx));
  // Jacobi-Determinante der XZ-Verdrängung: Kamm-Schätzung.
  // Kalibriert an der gemessenen Verteilung (j ≈ 0.87..1.15): vereinzelt
  // brechende Kämme, nie flächendeckend.
  float j = dPdx.x * dPdz.z - dPdx.z * dPdz.x;
  crest = smoothstep(0.945, 0.885, j);
  return p;
}
`;

/** Ringwellen (Zeigerkontakt, Phänomen-Wurf): bis zu 16 aktive Ringe als Uniforms. */
export const RIPPLE_COUNT = 16;
export const RIPPLE_GLSL = /* glsl */ `
uniform vec4 uRipples[${RIPPLE_COUNT}]; // x, z, startTime, stärke

// Additive Ringwelle auf die Höhe; foamRing sammelt Gischt entlang der Front.
float rippleHeight(vec2 xz, out float foamRing) {
  float h = 0.0;
  foamRing = 0.0;
  for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
    vec4 rp = uRipples[i];
    if (rp.w <= 0.001) continue;
    float age = uTime - rp.z;
    if (age < 0.0 || age > 6.0) continue;
    float r = distance(xz, rp.xy);
    float front = age * 3.4;
    float band = exp(-pow((r - front) * 1.6, 2.0));
    float decay = exp(-age * 0.9) * rp.w;
    h += band * decay * 0.16 * sin((r - front) * 7.0 + age * 2.0);
    foamRing += band * decay * smoothstep(0.0, 0.4, age);
  }
  return h;
}
`;
