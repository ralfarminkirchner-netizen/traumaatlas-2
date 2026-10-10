// Aufsteigende Blasen über den Untiefen: physische Bläschen (feine Kugeln)
// und stille Leuchtblasen (additive Punkte) — sie steigen mit leichtem
// Schlingern auf und vergehen knapp unter der Oberfläche. Recycelt, billig.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SHOALS, depthAt } from "./seabed";
import { getHaloTexture } from "./textures";

const BUBBLES = 26;
const GLOWS = 9;

export function Bubbles() {
  const phys = useRef(new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#cfe8ea", transparent: true, opacity: 0.3, depthWrite: false }),
    BUBBLES,
  ));
  const pts = useRef<THREE.Points>(null);

  const state = useMemo(() => {
    let seed = 424243;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const items: { x: number; y: number; z: number; v: number; wob: number; r: number; bed: number }[] = [];
    const spawn = () => {
      const s = SHOALS[Math.floor(rnd() * SHOALS.length)];
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * s.r * 0.7;
      const x = s.x + Math.cos(a) * rr;
      const z = s.z + Math.sin(a) * rr;
      const bed = -depthAt(x, z);
      return { x, y: bed + 0.2, z, v: 0.5 + rnd() * 0.55, wob: rnd() * Math.PI * 2, r: 0.03 + rnd() * 0.075, bed };
    };
    for (let i = 0; i < BUBBLES + GLOWS; i++) {
      const b = spawn();
      b.y = -0.4 - rnd() * Math.max(1, -b.bed - 0.6); // gestaffelt unterwegs
      items.push(b);
    }
    return { items, spawn, rnd };
  }, []);

  const glowGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const glowMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: getHaloTexture(),
        color: "#9fd8cf",
        size: 0.16,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    [],
  );

  const _m = useRef(new THREE.Matrix4());
  const _p = useRef(new THREE.Vector3());
  const _q = useRef(new THREE.Quaternion());
  const _s = useRef(new THREE.Vector3());

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05) || 0.016;
    const t = clock.elapsedTime;
    const glowPos: number[] = [];
    for (let i = 0; i < state.items.length; i++) {
      const b = state.items[i];
      b.y += b.v * dt;
      b.x += Math.sin(t * 1.7 + b.wob) * 0.16 * dt;
      b.z += Math.cos(t * 1.3 + b.wob) * 0.16 * dt;
      if (b.y > -0.45) Object.assign(b, state.spawn());
      if (i < BUBBLES) {
        _p.current.set(b.x, b.y, b.z);
        _s.current.setScalar(b.r);
        _m.current.compose(_p.current, _q.current, _s.current);
        phys.current.setMatrixAt(i, _m.current);
      } else {
        glowPos.push(b.x, b.y, b.z);
      }
    }
    phys.current.instanceMatrix.needsUpdate = true;
    glowGeo.setAttribute("position", new THREE.Float32BufferAttribute(glowPos, 3));
  });

  return (
    <>
      <primitive object={phys.current} />
      <points geometry={glowGeo} material={glowMat} ref={pts} frustumCulled={false} name="ocean-glowbubbles" />
    </>
  );
}
