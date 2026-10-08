// Kapitel-Formationen: abstrakte, leuchtende Zeichen über dem Wasser —
// KEINE Inseln. Drei langsam rotierende Lichtringe + vertikale Lichtsäule
// + Kapitel-Glyphe als Rune. Die Formation schwebt auf dem Wellengang
// (physikalisch mitbewegt), färbt das Wasser über das Lichtfeld und wird
// mit dem Besuch heller (Dunkelheit, die sich lichtet).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { ISLANDS, getOceanState, type IslandDef } from "../ocean/world";
import { w2x, w2z, S } from "./coords";
import { waveHeight, waveNormal } from "./waves";
import { projStore } from "./projStore";
import { setWaterPools, type FieldLight } from "./OceanWater";
import { getHaloTexture, getShaftTexture } from "./textures";

/** Glyphen-Rune als Canvas-Textur (pro Kapitel einmalig). */
function makeGlyphTexture(glyph: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = "84px Fraunces, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255, 220, 170, 0.9)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(glyph, 64, 70);
  return new THREE.CanvasTexture(c);
}

function ChapterFormation({ isl }: { isl: IslandDef }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const haloRef = useRef<THREE.Sprite>(null);
  const glyphRef = useRef<THREE.Sprite>(null);
  const goldRef = useRef<THREE.Mesh>(null);
  const shaftRef = useRef<THREE.Group>(null);

  const baseX = w2x(isl.x);
  const baseZ = w2z(isl.y);
  const color = useMemo(
    () => new THREE.Color(isl.ground[2]).lerp(new THREE.Color("#ffd9a0"), 0.12),
    [isl],
  );
  const glyphTex = useMemo(() => makeGlyphTexture(isl.glyph), [isl.glyph]);
  const phase = useMemo(() => Math.abs(isl.x * 0.37 + isl.y * 0.11) % (Math.PI * 2), [isl]);
  const ringGeos = useMemo(
    () => [1.45, 1.9, 2.35].map((r) => new THREE.TorusGeometry(r, 0.022, 8, 72)),
    [],
  );

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const visited = getOceanState().progress.visited.includes(isl.id);
    const dim = visited ? 1 : 0.55;
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.8 + phase);

    // Schweben auf dem Wellengang + leichte Neigung aus der Normale
    g.position.y = 0.35 + waveHeight(baseX, baseZ, t, calm) * 0.45;
    const [nx, , nz] = waveNormal(baseX, baseZ, t, calm);
    g.rotation.z = -nx * 0.3;
    g.rotation.x = nz * 0.3;

    // Ringe: langsam gegenläufig, Helligkeit nach Besuch
    ringRefs.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.z += (i % 2 === 0 ? 1 : -1) * 0.0009 * (i + 1);
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (0.8 - i * 0.12) * dim * pulse;
    });
    if (haloRef.current) {
      (haloRef.current.material as THREE.SpriteMaterial).opacity = 0.62 * dim * pulse;
    }
    if (glyphRef.current) {
      (glyphRef.current.material as THREE.SpriteMaterial).opacity = 0.9 * dim;
    }
    if (goldRef.current) {
      const m = (goldRef.current.material as THREE.MeshBasicMaterial);
      m.opacity += ((visited ? 0.5 : 0) - m.opacity) * 0.03;
      goldRef.current.rotation.z += 0.0012;
    }
    if (shaftRef.current) {
      shaftRef.current.children.forEach((p) => {
        ((p as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.42 * dim * pulse;
      });
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    projStore.hitAt = performance.now(); // Stage: kein Wasser-Klick-Segeln dahinter
    projStore.onSail?.(isl.id);
  };
  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = "pointer"; };
  const out = () => { document.body.style.cursor = ""; };

  return (
    <group ref={groupRef} position={[baseX, 0, baseZ]}>
      {/* drei Lichtringe, leicht gegeneinander geneigt */}
      {ringGeos.map((geo, i) => (
        <mesh
          key={i}
          geometry={geo}
          position={[0, 1.7, 0]}
          rotation={[Math.PI / 2 + (i - 1) * 0.16, 0, i * 0.7]}
          ref={(m) => { ringRefs.current[i] = m; }}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* vertikale Lichtsäule (zwei gekreuzte Gradient-Planes) */}
      <group ref={shaftRef} position={[0, 1.55, 0]}>
        {[0, Math.PI / 2].map((ry, i) => (
          <mesh key={i} rotation={[0, ry, 0]}>
            <planeGeometry args={[1.7, 3.8]} />
            <meshBasicMaterial
              map={getShaftTexture()}
              color={color}
              transparent
              opacity={0.42}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* Kern-Halo */}
      <sprite ref={haloRef} position={[0, 1.7, 0]} scale={[3.4, 3.4, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.62}
        />
      </sprite>
      {/* Kapitel-Glyphe als schwebende Rune */}
      <sprite ref={glyphRef} position={[0, 1.78, 0]} scale={[1.05, 1.05, 1]}>
        <spriteMaterial
          map={glyphTex}
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.9}
        />
      </sprite>
      {/* goldener Ring für besuchte Kapitel */}
      <mesh ref={goldRef} geometry={ringGeos[2]} position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color="#e2b35c"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* unsichtbarer Klick-Körper */}
      <mesh visible={false} position={[0, 1.6, 0]} onClick={click} onPointerOver={over} onPointerOut={out}>
        <cylinderGeometry args={[2.6, 2.6, 3.6, 12]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

const _poolCache: FieldLight[] = [];

export function Chapters3D() {
  // Lichtpools fürs Wasser (pulsierend, besucht = heller)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = getOceanState();
    _poolCache.length = 0;
    for (const isl of ISLANDS) {
      const visited = s.progress.visited.includes(isl.id);
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.8 + isl.x * 0.01);
      _poolCache.push({
        x: w2x(isl.x),
        z: w2z(isl.y),
        r: isl.r * S * 1.5,
        i: (visited ? 0.5 : 0.2) * pulse,
        c: new THREE.Color(isl.ground[2]).lerp(new THREE.Color("#ffd9a0"), 0.12),
      });
    }
    setWaterPools(_poolCache);
  });

  return (
    <>
      {ISLANDS.map((isl) => (
        <ChapterFormation key={isl.id} isl={isl} />
      ))}
    </>
  );
}
