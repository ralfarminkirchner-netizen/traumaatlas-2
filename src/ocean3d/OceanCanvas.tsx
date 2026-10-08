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
import { DriftParticles } from "./DriftParticles";
import { Phenomena3D } from "./Phenomena3D";
import { WakeRibbon } from "./WakeRibbon";

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
      shadows={!mobile}
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 1100, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fogExp2 attach="fog" args={["#071120", 0.0095]} />
      {/* Nacht-Grundstimmung: kühles Ambient + Hemisphären-Bounce vom Wasser */}
      <ambientLight intensity={0.5} color="#364763" />
      <hemisphereLight args={["#33476b", "#0c1018", 1.0]} />
      {/* Mondlicht: aus NW, moderate Elevation — formt die Inseln lesbar,
          wirft echte Schatten (Selbstbeschattung der Felsen) */}
      <directionalLight
        position={[-30, 26, -57]}
        intensity={1.25}
        color="#d8e2f0"
        castShadow={!mobile}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.9}
      />
      {/* schwaches Gegenlicht aus SO, damit Schattenseiten nicht kollabieren */}
      <directionalLight position={[42, 16, 55]} intensity={0.62} color="#50628a" />
      <CameraRig />
      <LabelsBridge />
      <SkyDome />
      <OceanWater mobile={mobile} />
      <WakeRibbon />
      <Islands3D mobile={mobile} />
      <DriftParticles mobile={mobile} />
      <Phenomena3D />
    </Canvas>
  );
}
