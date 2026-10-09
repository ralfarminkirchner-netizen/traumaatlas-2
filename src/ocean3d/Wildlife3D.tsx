// Der Schwarm in 3D: kleine, stille Lichtpunkte, die auf den Wellen treiben.
// Gedämpft sichtbar, bis der Schwimmer nahe kommt (noticed → hell + Label),
// gefangen bei Berührung (steigt als Atlas-Phänomen ins Meer ein).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { WILDLINGS, wildState, stepWildlife, touchWildlife, catchWildling, type Wildling } from "../ocean/wildlife";
import { w2x, w2z, x2w, z2w } from "./coords";
import { waveHeight } from "./waves";
import { swimmer } from "./swimmer";
import { projStore, splat3D } from "./projStore";
import { getHaloTexture } from "./textures";

const _v = new THREE.Vector3();

function Mote({ w, tex }: { w: Wildling; tex: THREE.Texture }) {
  const gRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(w.color), [w.color]);
  const st = wildState.get(w.id)!;

  useFrame(({ clock }) => {
    const g = gRef.current;
    if (!g) return;
    if (st.caught) { g.visible = false; return; }
    const t = clock.elapsedTime;
    const bx = w2x(st.x);
    const bz = w2z(st.y);
    const y = waveHeight(bx, bz, t, projStore.calm) * 0.9;
    g.position.set(bx, y + 0.16, bz);
    // stilles Pulsieren; Noticed leuchtet auf
    const pulse = 1 + Math.sin(t * 1.3 + w.seed * 5) * 0.18;
    const glow = st.noticed ? 1 : 0.32;
    if (haloRef.current) {
      haloRef.current.scale.setScalar((st.noticed ? 1.5 : 0.8) * pulse);
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.75 * glow * pulse;
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(st.noticed ? 1.25 : 0.8);
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.9 * glow + 0.1;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    projStore.hitAt = performance.now();
    catchWildling(w);
    splat3D(st.x, st.y, 1.5);
  };

  return (
    <group ref={gRef}>
      <mesh ref={coreRef} onClick={click}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
      </mesh>
      <sprite ref={haloRef} onClick={click}>
        <spriteMaterial
          map={tex}
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.3}
        />
      </sprite>
    </group>
  );
}

/** Bewegung + Berührung + Label-Projektion der bemerkten Wildlinge. */
function SwarmBridge() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    stepWildlife(t);
    // Berührung durch den Schwimmer-Körper
    const caughtNow = touchWildlife(x2w(swimmer.x), z2w(swimmer.z));
    for (const w of caughtNow) {
      const st = wildState.get(w.id)!;
      splat3D(st.x, st.y, 1.6);
    }
    // Label-Projektion: nur bemerkte, ungefangene Wildlinge
    const seen = new Set<string>();
    for (const w of WILDLINGS) {
      const st = wildState.get(w.id)!;
      if (st.caught || !st.noticed) continue;
      const bx = w2x(st.x);
      const bz = w2z(st.y);
      _v.set(bx, waveHeight(bx, bz, t, projStore.calm) * 0.9 + 0.7, bz).project(camera);
      if (_v.z > 1) continue;
      const sx = (_v.x * 0.5 + 0.5) * size.width;
      const sy = (-_v.y * 0.5 + 0.5) * size.height;
      if (sx < -80 || sx > size.width + 80 || sy < -60 || sy > size.height + 80) continue;
      seen.add(w.id);
      projStore.wildLabels.set(w.id, { sx, sy, visible: true });
    }
    for (const key of [...projStore.wildLabels.keys()]) {
      if (!seen.has(key)) projStore.wildLabels.delete(key);
    }
  });
  return null;
}

export function Wildlife3D() {
  const tex = useMemo(() => getHaloTexture(), []);
  return (
    <>
      {WILDLINGS.map((w) => (
        <Mote key={w.id} w={w} tex={tex} />
      ))}
      <SwarmBridge />
    </>
  );
}
