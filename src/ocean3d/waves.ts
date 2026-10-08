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
