// 3D-Meer-Canvas: Himmel, Wasser, Inseln, Bojen, Kielwasser — liest den
// Ocean-Store imperativ pro Frame (keine React-Re-Renders in der Szene).

import { useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { projStore } from "./projStore";
import { CameraRig } from "./CameraRig";
import { OceanWater } from "./OceanWater";
import { SkyDome } from "./SkyDome";

const _v = new THREE.Vector3();

/** Projiziert Insel-Anker ins Bild und schreibt sie in den projStore (DOM-Labels). */
function LabelsBridge() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    for (const isl of ISLANDS) {
      _v.set(w2x(isl.x), 2.6, w2z(isl.y));
      _v.project(camera);
      const behind = _v.z > 1;
      const sx = (_v.x * 0.5 + 0.5) * size.width;
      const sy = (-_v.y * 0.5 + 0.5) * size.height;
      const dist = camera.position.distanceTo(new THREE.Vector3(w2x(isl.x), 0, w2z(isl.y)));
      projStore.labels.set(isl.id, {
        sx,
        sy,
        visible: !behind && sx > -200 && sx < size.width + 200 && sy > -120 && sy < size.height + 200,
        scale: THREE.MathUtils.clamp(26 / Math.max(dist, 8), 0.55, 1.25),
      });
    }
  });
  return null;
}

/** Provisorische Insel (Meilenstein 1) — wird zu Islands3D ausgebaut. */
function ProvisionalIsland() {
  const nav = useMemo(() => ISLANDS.find((i) => i.id === "navigator")!, []);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(nav.r * 0.02, 2.4, 48, 6, true);
    return g;
  }, [nav]);
  return (
    <group position={[w2x(nav.x), 0, w2z(nav.y)]}>
      <mesh geometry={geo} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#3d2b33" roughness={0.9} metalness={0} />
      </mesh>
      {/* Votivlicht-Kern */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
    </group>
  );
}

export function OceanCanvas({ mobile = false }: { mobile?: boolean }) {
  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 1100, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fogExp2 attach="fog" args={["#071120", 0.0095]} />
      <ambientLight intensity={0.22} color="#2a3a55" />
      <directionalLight position={[-38, 40, -83]} intensity={0.5} color="#cfd8e8" />
      <CameraRig />
      <LabelsBridge />
      <SkyDome />
      <OceanWater mobile={mobile} />
      <ProvisionalIsland />
    </Canvas>
  );
}
