// 3D-Meer-Canvas: Himmel, Wasser, Kapitel-Formationen, Bojen, Arme,
// Kielwasser — liest den Ocean-Store imperativ pro Frame
// (keine React-Re-Renders in der Szene).

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z, x2w, z2w } from "./coords";
import { projStore, registerScreenToWater } from "./projStore";
import { CameraRig } from "./CameraRig";
import { OceanWater } from "./OceanWater";
import { SkyDome } from "./SkyDome";
import { Chapters3D } from "./Chapters3D";
import { DriftParticles } from "./DriftParticles";
import { Phenomena3D } from "./Phenomena3D";
import { WakeRibbon } from "./WakeRibbon";
import { Constellations3D } from "./Constellations3D";
import { Swimmer } from "./SwimmerBody";
import { Wildlife3D } from "./Wildlife3D";

const _v = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

/** Registriert den Bildschirm→Wasser-Raycast (Klick-segeln aus der DOM-Stage). */
function ScreenToWaterBridge() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    registerScreenToWater((cx, cy) => {
      const rect = gl.domElement.getBoundingClientRect();
      _ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      _ray.setFromCamera(_ndc, camera);
      if (!_ray.ray.intersectPlane(_plane, _hit)) return null;
      // Weltgrenzen der Wasserebene beachten (Plane ist 640×640 um den Ursprung)
      if (Math.abs(_hit.x) > 300 || Math.abs(_hit.z) > 300) return null;
      return { wx: x2w(_hit.x), wy: z2w(_hit.z) };
    });
    return () => registerScreenToWater(null);
  }, [camera, gl, size]);
  return null;
}

/** Projiziert Kapitel-Anker ins Bild und schreibt sie in den projStore (DOM-Labels). */
function LabelsBridge() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    for (let i = 0; i < ISLANDS.length; i++) {
      const isl = ISLANDS[i];
      // Anker knapp über der Formation (Schwebehöhe ~0.35 + Ringebene 1.7)
      _v.set(w2x(isl.x), 3.3, w2z(isl.y));
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
      {/* Nacht-Grundstimmung: kühles Ambient + Hemisphären-Bounce vom Wasser.
          Die Szene trägt sich über additive, leuchtende Körper — die Lichter
          hier dienen nur den wenigen nicht-emissiven Teilen (Bojen-Sockel). */}
      <ambientLight intensity={0.5} color="#364763" />
      <hemisphereLight args={["#33476b", "#0c1018", 1.0]} />
      <directionalLight position={[-30, 26, -57]} intensity={0.8} color="#d8e2f0" />
      <CameraRig />
      <LabelsBridge />
      <ScreenToWaterBridge />
      <SkyDome />
      <OceanWater mobile={mobile} />
      <Swimmer />
      <Wildlife3D />
      <WakeRibbon />
      <Chapters3D />
      <Constellations3D />
      <DriftParticles mobile={mobile} />
      <Phenomena3D />
    </Canvas>
  );
}
