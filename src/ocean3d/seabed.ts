// Das Tiefenfeld: prozedurale Bathymetrie des Meeresbodens — Untiefen um die
// Inseln (hell, sichtbar, dort lebt das Meer), offene See tief und dunkel.
// EINE Quelle (depthAt) für: Wasserfarbe (Shader-Textur), Boden-Geometrie,
// Seegras/Felsen/Fische (Platzierung), Caustics-Maske, Probes.

import * as THREE from "three";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z, S } from "./coords";

/** Basis-Tiefe der offenen See (Welteinheiten unter y=0) */
export const DEEP_SEA = 15.5;

/** Wertiges Rauschen für Boden-Relief (deterministisch, ohne Textur) */
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const h = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return (
    h(xi, zi) * (1 - u) * (1 - v) +
    h(xi + 1, zi) * u * (1 - v) +
    h(xi, zi + 1) * (1 - u) * v +
    h(xi + 1, zi + 1) * u * v
  );
}

interface Shoal { x: number; z: number; r: number; h: number }

/** Untiefen-Platten um die Inseln — dort trägt der Boden Licht und Leben. */
export const SHOALS: Shoal[] = ISLANDS.map((isl) => ({
  x: w2x(isl.x),
  z: w2z(isl.y),
  r: isl.r * S * 3.4,
  h: DEEP_SEA - 3.1 - ((isl.r - 220) / 80) * 1.2, // größere Insel → flacher (2.5..3.7 Resttiefe)
}));

/**
 * Wassertiefe an (x,z) auf der 3D-Ebene — 0..DEEP_SEA.
 * Untiefen steigen weich an (Gauß-Platten), Relief bricht die Monotonie.
 */
export function depthAt(x: number, z: number): number {
  let d = DEEP_SEA;
  // breites Relief der offenen See (±1.8)
  d += (vnoise(x * 0.018 + 7.3, z * 0.018 + 2.1) - 0.5) * 3.6;
  for (const s of SHOALS) {
    const dx = x - s.x;
    const dz = z - s.z;
    const d2 = dx * dx + dz * dz;
    const fall = Math.exp(-d2 / (s.r * s.r));
    d -= s.h * fall;
    // feines Relief auf den Platten (±0.5)
    d += (vnoise(x * 0.11 + s.x, z * 0.11 + s.z) - 0.5) * fall * 1.0;
  }
  return Math.max(1.4, Math.min(DEEP_SEA + 1.8, d));
}

/** Sandkante: bis hierhin liest sich der Boden sandig-hell (Caustics, Seegras) */
export const SHALLOW_MAX = 9.0;

// ── Textur für den Wasser-Shader (Untiefen heller) ───────────────────────────

export const DEPTH_TEX_SIZE = 256;
export const WORLD_EXTENT = 640; // Wasser-Plane 640×640, Textur deckt sie ganz

let _depthTex: THREE.DataTexture | null = null;

/** Depth-Textur (R32F/R8: Tiefe in Welteinheiten) — einmalig bauen, teilen. */
export function getDepthTexture(): THREE.DataTexture {
  if (_depthTex) return _depthTex;
  const n = DEPTH_TEX_SIZE;
  const data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * WORLD_EXTENT;
      const z = (j / (n - 1) - 0.5) * WORLD_EXTENT;
      data[j * n + i] = depthAt(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.FloatType);
  // R32F ist ohne OES_texture_float_linear nicht filterbar (Vertex-Fetch!)
  // → NearestFilter, sonst liest der Boden überall 0 und liegt bei y=0.
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  _depthTex = tex;
  return tex;
}

/** GLSL: Sampler + Helfer — Tiefe an Weltposition lesen (Plane 640, zentriert). */
export const DEPTH_GLSL = /* glsl */ `
uniform sampler2D tDepth;
float depthAtWorld(vec2 xz) {
  vec2 uv = xz / ${WORLD_EXTENT.toFixed(1)} + 0.5;
  return texture2D(tDepth, uv).r;
}
`;

// QA-/Debug-Spiegel
if (typeof window !== "undefined") {
  (window as unknown as { __ta3depth?: typeof depthAt }).__ta3depth = depthAt;
}
