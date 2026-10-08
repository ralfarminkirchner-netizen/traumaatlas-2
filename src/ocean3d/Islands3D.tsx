// Prozedurale 3D-Inseln: radiale Ridge-Noise-Heightmap, Fels/Sand-Kanten,
// warmer Votivlicht-Kern mit Halo-Sprite. Geometrie + Vertexfarben werden
// einmalig auf der CPU gebaut (pro Insel deterministisch geseedet).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ISLANDS, getOceanState, type IslandDef } from "../ocean/world";
import { w2x, w2z, S } from "./coords";
import { MOON_DIR } from "./SkyDome";

// ── Deterministisches Value-Noise (CPU) ──────────────────────────────────────

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2(ix: number, iz: number, seed: number): number {
  let h = ix * 374761393 + iz * 668265263 + seed * 2246822519;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** Ridge-FBM: scharfe Kämme */
function ridgeFbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    const n = vnoise(x * freq, z * freq, seed + o * 131);
    const ridge = Math.pow(1 - Math.abs(2 * n - 1), 2);
    sum += ridge * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum; // ~0..1.1
}

// ── Insel-Geometrie ──────────────────────────────────────────────────────────

interface IslandGeo {
  geometry: THREE.BufferGeometry;
  peakY: number;
  radius: number;
}

function buildIsland(isl: IslandDef, seed: number): IslandGeo {
  const radius = isl.r * S; // Welteinheiten
  const R = radius * 1.4; // inkl. Unterwasser-Shelf
  const segs = 72;
  const peakH = radius * (0.34 + 0.12 * hash2(seed, 7, seed));

  const geo = new THREE.PlaneGeometry(R * 2, R * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  const c0 = new THREE.Color(isl.ground[0]);
  const c1 = new THREE.Color(isl.ground[1]);
  const c2 = new THREE.Color(isl.ground[2]);
  const sand = new THREE.Color("#6e5b40");
  const deep = new THREE.Color("#08131a");
  const amber = new THREE.Color("#e2b35c");
  const moonAz = new THREE.Vector2(MOON_DIR.x, MOON_DIR.z).normalize();

  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z) / R; // 0..1 (1 = Rand des Patches)
    const ang = Math.atan2(z, x);

    // radiale Unregelmäßigkeit der Küstenlinie
    const coast = 0.78 + 0.2 * vnoise(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, seed);
    const rc = r / coast;

    // Höhenprofil: Kernplateau → Abfall → Shelf unter Wasser
    let h: number;
    if (rc < 1) {
      const ridge = ridgeFbm(x * 0.55 + 11, z * 0.55 + 11, seed);
      const profile = Math.pow(Math.max(0, 1 - rc), 0.62);
      h = profile * (0.42 + 0.58 * Math.min(1, ridge)) * peakH + 0.12 * (1 - rc);
    } else {
      // Shelf: sanft unter die Wasserlinie tauchen
      h = -0.18 - (rc - 1) * 2.2;
    }
    pos.setY(i, h);

    // ── Vertexfarbe ──
    const t = THREE.MathUtils.clamp(h / peakH, 0, 1);
    if (h < 0) {
      col.copy(deep).lerp(c0, Math.max(0, 1 + h * 1.6));
    } else {
      col.copy(c0).lerp(c1, Math.pow(t, 1.3));
      // warme, helle Kuppen
      col.lerp(c2, THREE.MathUtils.smoothstep(t, 0.55, 0.95) * 0.65);
      // Sandkante nahe der Wasserlinie
      const band = THREE.MathUtils.smoothstep(h, 0.02, 0.1) * (1 - THREE.MathUtils.smoothstep(h, 0.22, 0.55));
      col.lerp(sand, band * 0.55);
      // Votiv-Wärme zum Zentrum
      col.lerp(amber, (1 - THREE.MathUtils.smoothstep(r, 0, 0.42)) * 0.5);
      // Mondseitiger Rim (statisch gebacken)
      const rim = Math.max(0, (x / R) * moonAz.x + (z / R) * moonAz.y);
      col.lerp(new THREE.Color("#42506a"), rim * 0.16 * t);
    }
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return { geometry: geo, peakY: peakH + 0.12, radius };
}

// ── Halo-Textur (einmalig geteilt) ───────────────────────────────────────────

let haloTex: THREE.CanvasTexture | null = null;
function getHaloTexture(): THREE.CanvasTexture {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255, 226, 176, 0.85)");
  g.addColorStop(0.25, "rgba(240, 190, 120, 0.34)");
  g.addColorStop(0.6, "rgba(200, 140, 70, 0.10)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

// ── Eine Insel ───────────────────────────────────────────────────────────────

/** Höhe der Kuppe — auch für Label-Anker/Lichtpositionen gebraucht. */
export function islandPeakY(isl: IslandDef, seed: number): number {
  return isl.r * S * (0.34 + 0.12 * hash2(seed, 7, seed)) + 0.12;
}

function Island3D({ isl, seed }: { isl: IslandDef; seed: number }) {
  const { geometry, peakY, radius } = useMemo(() => buildIsland(isl, seed), [isl, seed]);
  const haloRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const phase = useMemo(() => makeRng(seed)() * Math.PI * 2, [seed]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const visited = getOceanState().progress.visited.includes(isl.id);
    const breathe = 0.72 + 0.14 * Math.sin(t * 0.7 + phase);
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = breathe * (visited ? 1 : 0.62);
    }
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.color.set("#ffdca6");
      m.color.multiplyScalar(0.85 + 0.25 * Math.sin(t * 0.9 + phase));
    }
    if (lightRef.current) {
      lightRef.current.intensity = radius * 2.4 * (0.8 + 0.2 * Math.sin(t * 0.9 + phase)) * (visited ? 1.15 : 0.85);
    }
  });

  return (
    <group position={[w2x(isl.x), 0, w2z(isl.y)]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
      </mesh>
      {/* warmes Votivlicht: echtes Punktlicht auf Fels + Wasser */}
      <pointLight
        ref={lightRef}
        position={[0, peakY * 0.72, 0]}
        color="#f0be78"
        intensity={radius * 2.2}
        distance={radius * 5.5}
        decay={2}
      />
      {/* Votivlicht-Kern, leicht in die Kuppe eingebettet */}
      <mesh ref={coreRef} position={[0, peakY * 0.6, 0]}>
        <sphereGeometry args={[radius * 0.09, 16, 16]} />
        <meshBasicMaterial color="#ffdca6" toneMapped={false} />
      </mesh>
      {/* additiver Halo (erscheint auch in der Wasser-Reflexion) */}
      <sprite ref={haloRef} position={[0, peakY * 0.78, 0]} scale={[radius * 2.3, radius * 2.3, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.7}
        />
      </sprite>
    </group>
  );
}

export function Islands3D() {
  return (
    <>
      {ISLANDS.map((isl, i) => (
        <Island3D key={isl.id} isl={isl} seed={101 + i * 17} />
      ))}
    </>
  );
}
