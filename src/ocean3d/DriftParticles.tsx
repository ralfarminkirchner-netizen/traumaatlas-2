// Treibende Lichter zwischen den Inseln: sparsame, warme Partikel, die auf
// den Wellen schweben und langsam driften. Eine Points-Wolke, CPU-animiert
// (wenige Dutzend Punkte — kein nennenswerter Aufwand pro Frame).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { waveHeight } from "./waves";
import { projStore } from "./projStore";
import { makeRng } from "./islandShapes";
import { getHaloTexture } from "./textures";

const COUNT_DESKTOP = 70;
const COUNT_MOBILE = 30;

interface P {
  x: number;
  z: number;
  phase: number;
  drift: number; // Driftgeschwindigkeit
  ang: number;   // Driftrichtung
  size: number;
}

export function DriftParticles({ mobile = false }: { mobile?: boolean }) {
  const count = mobile ? COUNT_MOBILE : COUNT_DESKTOP;
  const ref = useRef<THREE.Points>(null);

  const { geometry, particles } = useMemo(() => {
    const rng = makeRng(4711);
    const particles: P[] = [];
    // Insel-Mitten zum Freihalten (Mindestabstand zur Küste)
    const isl = ISLANDS.map((i) => ({ x: w2x(i.x), z: w2z(i.y), r: i.r * 0.02 * 1.7 }));
    let guard = 0;
    while (particles.length < count && guard++ < count * 40) {
      const x = (rng() - 0.5) * 100;
      const z = (rng() - 0.5) * 60;
      if (isl.some((i) => Math.hypot(x - i.x, z - i.z) < i.r)) continue;
      particles.push({
        x, z,
        phase: rng() * Math.PI * 2,
        drift: 0.14 + rng() * 0.3,
        ang: rng() * Math.PI * 2,
        size: 0.5 + rng() * 0.9,
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return { geometry, particles };
  }, [count]);

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      // langsames Driften + Pendeln, Weltgrenzen weich umlaufen
      p.x += Math.cos(p.ang) * p.drift * 0.016;
      p.z += Math.sin(p.ang) * p.drift * 0.016;
      p.ang += Math.sin(t * 0.05 + p.phase) * 0.002;
      if (p.x > 52) p.x = -52;
      if (p.x < -52) p.x = 52;
      if (p.z > 32) p.z = -32;
      if (p.z < -32) p.z = 32;
      const y = waveHeight(p.x, p.z, t, calm) + 0.22 + Math.sin(t * 0.6 + p.phase) * 0.08;
      pos.setXYZ(i, p.x, y, p.z);
    }
    pos.needsUpdate = true;
    const m = pts.material as THREE.PointsMaterial;
    m.opacity = 0.42 + 0.08 * Math.sin(t * 0.4);
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} name="drift-particles">
      <pointsMaterial
        color="#f0cf98"
        size={mobile ? 0.34 : 0.26}
        map={getHaloTexture()}
        alphaTest={0.01}
        sizeAttenuation
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
