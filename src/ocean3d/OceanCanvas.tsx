// 3D-Meer-Canvas: Himmel, Wasser, Inseln, Bojen, Kielwasser — liest den
// Ocean-Store imperativ pro Frame (keine React-Re-Renders in der Szene).

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { projStore } from "./projStore";
import { CameraRig } from "./CameraRig";
import { OceanWater } from "./OceanWater";
import { SkyDome } from "./SkyDome";
import { Islands3D, islandPeakY } from "./Islands3D";

const _v = new THREE.Vector3();

/** Projiziert Insel-Anker ins Bild und schreibt sie in den projStore (DOM-Labels). */
function LabelsBridge() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    for (let i = 0; i < ISLANDS.length; i++) {
      const isl = ISLANDS[i];
      const peakY = islandPeakY(isl);
      _v.set(w2x(isl.x), peakY + 1.5, w2z(isl.y));
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

/** 3D-Wurzel: Canvas + Choreografie der Szene. */
export function OceanCanvas({ mobile = false }: { mobile?: boolean }) {
  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 1100, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fogExp2 attach="fog" args={["#071120", 0.0095]} />
      {/* Nacht-Grundstimmung: kühles Ambient + Hemisphären-Bounce vom Wasser */}
      <ambientLight intensity={0.44} color="#364763" />
      <hemisphereLight args={["#33476b", "#0c1018", 0.85]} />
      {/* Mondlicht: aus NW, moderate Elevation — formt die Inseln lesbar */}
      <directionalLight position={[-30, 26, -57]} intensity={1.15} color="#d8e2f0" />
      {/* schwaches Gegenlicht aus SO, damit Schattenseiten nicht kollabieren */}
      <directionalLight position={[42, 16, 55]} intensity={0.5} color="#50628a" />
      <CameraRig />
      <LabelsBridge />
      <SkyDome />
      <OceanWater mobile={mobile} />
      <Islands3D mobile={mobile} />
    </Canvas>
  );
}
