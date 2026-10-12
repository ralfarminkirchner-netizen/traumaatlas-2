// Fels- und Stein-Formationen auf den Untiefen: instanzierte Findlinge,
// flach gedrückt, gedreht, in drei Würden (Geröll → Fels → Brocken).
// MeshStandardMaterial — sie lesen sich über das Szenenlicht mit.

import { useMemo } from "react";
import * as THREE from "three";
import { SHOALS, depthAt } from "./seabed";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROCKS_PER_SHOAL = 16;

export function Rocks() {
  const mesh = useMemo(() => {
    const rng = mulberry32(114466);
    const geo = new THREE.IcosahedronGeometry(1, 0);
    // Silhouette brechen: Vertices leicht verziehen (deterministisch)
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const n = Math.sin(vx * 12.9 + vy * 7.7 + vz * 5.3) * 0.14;
      pos.setXYZ(i, vx * (1 + n), vy * (1 - n * 0.6), vz * (1 + n * 0.7));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: "#2c3e46",
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    });

    const mats: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    for (const s of SHOALS) {
      let placed = 0;
      let guard = 0;
      while (placed < ROCKS_PER_SHOAL && guard++ < 300) {
        const a = rng() * Math.PI * 2;
        const r = (0.35 + Math.sqrt(rng()) * 0.75) * s.r;
        const x = s.x + Math.cos(a) * r;
        const z = s.z + Math.sin(a) * r;
        const d = depthAt(x, z);
        if (d < 3.5 || d > 15.0) continue;
        const sc = 0.28 + rng() * rng() * 1.5;
        eul.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
        q.setFromEuler(eul);
        m.compose(
          new THREE.Vector3(x, -d + sc * 0.28, z),
          q,
          new THREE.Vector3(sc * (0.8 + rng() * 0.5), sc * 0.62, sc * (0.8 + rng() * 0.5)),
        );
        mats.push(m.clone());
        placed++;
      }
    }

    const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
    for (let i = 0; i < mats.length; i++) mesh.setMatrixAt(i, mats[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.name = "ocean-rocks";
    return mesh;
  }, []);

  return <primitive object={mesh} />;
}
