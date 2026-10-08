// Prozedurale 3D-Inseln: unverwechselbare Silhouetten pro Kapitel (Shape-Typen
// aus islandShapes.ts), Fels-Strata, Nassband an der Wasserlinie, warmer
// Votivlicht-Kern mit gestuftem Halo. Geometrie + Vertexfarben werden
// einmalig auf der CPU gebaut (pro Insel deterministisch geseedet).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ISLANDS, getOceanState, type IslandDef } from "../ocean/world";
import { w2x, w2z, S } from "./coords";
import { MOON_DIR } from "./SkyDome";
import { ISLAND_SPECS, islandHeight, specPeakY, specLightXZ, makeRng, vnoise, type ShapeSpec } from "./islandShapes";

// ── Insel-Geometrie ──────────────────────────────────────────────────────────

interface IslandGeo {
  geometry: THREE.BufferGeometry;
  peakY: number;
  radius: number;
  lightAnchor: [number, number, number];
  spec: ShapeSpec;
}

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function buildIsland(isl: IslandDef, seed: number, mobile: boolean): IslandGeo {
  const spec = ISLAND_SPECS[isl.id];
  const radius = isl.r * S; // Welteinheiten
  const R = radius * 1.4; // inkl. Unterwasser-Shelf
  const segs = mobile ? 64 : 96;
  const peakH = radius * spec.hMul;
  const peakY = specPeakY(spec, radius);
  // Licht-Anker: XZ aus der Spezifikation, Höhe direkt aus der Heightmap gelesen
  const [lx, lz] = specLightXZ(spec, radius);
  const lightAnchor: [number, number, number] = [lx, islandHeight(spec, lx, lz, seed, radius) + radius * 0.06, lz];

  const geo = new THREE.PlaneGeometry(R * 2, R * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  // Albedo für PBR anheben: die 2D-Palette ist für Nacht-PBR zu dunkel,
  // sonst kollabieren die Schattenseiten zu Schwarz
  const c0 = new THREE.Color(isl.ground[0]).multiplyScalar(1.85);
  const c1 = new THREE.Color(isl.ground[1]).multiplyScalar(1.5);
  const c2 = new THREE.Color(isl.ground[2]);
  const sand = new THREE.Color("#7a6647");
  const deep = new THREE.Color("#08131a");
  const wet = new THREE.Color("#060a0c");
  const amber = new THREE.Color("#e2b35c");
  const rimCol = new THREE.Color("#4a5a76");
  const moonAz = new THREE.Vector2(MOON_DIR.x, MOON_DIR.z).normalize();

  // sandige Formen bekommen ein breiteres Strandband
  const sandMul = spec.shape === "atoll" ? 0.95 : spec.shape === "dune" ? 0.85 : 0.35;

  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(spec, x, z, seed, radius);
    pos.setY(i, h);

    // ── Vertexfarbe ──
    const t = THREE.MathUtils.clamp(h / Math.max(peakH, 1e-3), 0, 1);
    if (h < 0) {
      col.copy(deep).lerp(c0, Math.max(0, 1 + h * 1.6));
    } else {
      col.copy(c0).lerp(c1, Math.pow(t, 1.3));
      // warme, helle Kuppen
      col.lerp(c2, THREE.MathUtils.smoothstep(t, 0.55, 0.95) * 0.65);
      // Sandkante nahe der Wasserlinie (schmal, nur echte Strandzone)
      const band = THREE.MathUtils.smoothstep(h, 0.02, 0.08) * (1 - THREE.MathUtils.smoothstep(h, 0.16, 0.34));
      col.lerp(sand, band * 0.6 * sandMul);
      // Fels-Strata: höhengestreifte Bänder, pro Insel variiert
      if (spec.strata > 0 && t > 0.08) {
        const grain = vnoise(x * 1.7 + 13, z * 1.7 + 13, seed + 77);
        const bands = Math.sin(h * 2.7 + grain * 2.4 + seed * 0.13);
        col.multiplyScalar(1 + bands * 0.085 * spec.strata);
        col.lerp(c0, Math.max(0, -bands) * 0.16 * spec.strata);
      }
      // Votiv-Wärme um den Licht-Anker (eng gefasst)
      const dl = Math.hypot(x - lightAnchor[0], z - lightAnchor[2]) / radius;
      col.lerp(amber, (1 - sstep(0, 0.40, dl)) * 0.38);
      // Nassband an der Wasserlinie (zugleich Kontakt-AO)
      const wetBand = 1 - sstep(0.06, 0.34, h);
      col.lerp(wet, wetBand * 0.52);
      // Mondseitiger Rim (statisch gebacken)
      const rim = Math.max(0, (x / R) * moonAz.x + (z / R) * moonAz.y);
      col.lerp(rimCol, rim * 0.22 * t);
    }
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return { geometry: geo, peakY, radius, lightAnchor, spec };
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
export function islandPeakY(isl: IslandDef): number {
  return specPeakY(ISLAND_SPECS[isl.id], isl.r * S);
}

function Island3D({ isl, seed, mobile }: { isl: IslandDef; seed: number; mobile: boolean }) {
  const { geometry, peakY, radius, lightAnchor } = useMemo(() => buildIsland(isl, seed, mobile), [isl, seed, mobile]);
  const haloRef = useRef<THREE.Sprite>(null);
  const poolRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const phase = useMemo(() => makeRng(seed)() * Math.PI * 2, [seed]);

  // Lichtfarbe aus der Boden-Signatur der Insel (mit Wärme verschnitten, kein Kitsch)
  const lightColor = useMemo(
    () => new THREE.Color(isl.ground[2]).lerp(new THREE.Color("#ffd9a0"), 0.42),
    [isl],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const visited = getOceanState().progress.visited.includes(isl.id);
    const breathe = 0.72 + 0.14 * Math.sin(t * 0.7 + phase);
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = breathe * (visited ? 1 : 0.62);
    }
    if (poolRef.current) {
      const m = poolRef.current.material as THREE.SpriteMaterial;
      m.opacity = breathe * 0.26 * (visited ? 1 : 0.7);
    }
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.color.set("#ffdca6");
      m.color.multiplyScalar(0.85 + 0.25 * Math.sin(t * 0.9 + phase));
    }
    if (lightRef.current) {
      lightRef.current.intensity = radius * 1.7 * (0.8 + 0.2 * Math.sin(t * 0.9 + phase)) * (visited ? 1.15 : 0.85);
    }
  });

  return (
    <group position={[w2x(isl.x), 0, w2z(isl.y)]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.02} />
      </mesh>
      {/* warmes Votivlicht in Inselfarbe: echtes Punktlicht auf Fels + Wasser */}
      <pointLight
        ref={lightRef}
        position={[lightAnchor[0], lightAnchor[1] + peakY * 0.1, lightAnchor[2]]}
        color={lightColor}
        intensity={radius * 1.7}
        distance={radius * 4.6}
        decay={2}
      />
      {/* Votivlicht-Kern: klein, halb im Gestein versenkt */}
      <mesh ref={coreRef} position={[lightAnchor[0], lightAnchor[1] - radius * 0.02, lightAnchor[2]]}>
        <sphereGeometry args={[radius * 0.045, 16, 16]} />
        <meshBasicMaterial color="#ffdca6" toneMapped={false} />
      </mesh>
      {/* additiver Halo (erscheint auch in der Wasser-Reflexion) */}
      <sprite ref={haloRef} position={[lightAnchor[0], lightAnchor[1] + peakY * 0.14, lightAnchor[2]]} scale={[radius * 2.2, radius * 2.2, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          color={lightColor}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.7}
        />
      </sprite>
      {/* großer, weicher Lichtpool als zweite, schwächere Stufe */}
      <sprite ref={poolRef} position={[lightAnchor[0], lightAnchor[1] * 0.55, lightAnchor[2]]} scale={[radius * 4.6, radius * 3.4, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          color={lightColor}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.2}
        />
      </sprite>
    </group>
  );
}

export function Islands3D({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      {ISLANDS.map((isl, i) => (
        <Island3D key={isl.id} isl={isl} seed={101 + i * 17} mobile={mobile} />
      ))}
    </>
  );
}
