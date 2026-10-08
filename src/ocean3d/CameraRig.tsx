// Kamera-Rig: liest getOceanState().cam (2D-Welt + zoom) und übersetzt in eine
// kinematische 3D-Kamera — niedrig über dem Wasser beim Segeln, hoher Aufstieg
// in der Übersicht, weiches Schweben im Leerlauf, FOV-/Pitch-Choreografie.

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getOceanState } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { waveHeight } from "./waves";
import { projStore } from "./projStore";

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

export function CameraRig() {
  const smoothed = useRef({ x: 0, z: 0, h: 10, dist: 12, fov: 50, yaw: 0, roll: 0 });
  const lastCam = useRef({ x: 2600, y: 1600, t: 0 });

  useFrame(({ camera, clock }, delta) => {
    const cam = (camera as THREE.PerspectiveCamera);
    const s = getOceanState();
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05) || 0.016;

    const tx = w2x(s.cam.x);
    const tz = w2z(s.cam.y);

    // Übersichts-Faktor: 0 = nah/segeln, 1 = hohe Karte
    const ovF = THREE.MathUtils.clamp((0.62 - s.cam.zoom) / 0.4, 0, 1);

    // niedrig über dem Wasser beim Segeln (Horizont sichtbar), steil in der Karte
    const h = 2.8 + 53 * Math.pow(ovF, 2.0);
    const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(12, 65, Math.pow(ovF, 1.5)));
    const dist = h / Math.tan(pitch);
    const fov = THREE.MathUtils.lerp(50, 60, ovF);

    // Kurs: aus Kamera-Verschiebung ableiten (Segelrichtung)
    const vx = (s.cam.x - lastCam.current.x) / Math.max(dt, 1e-3);
    const vy = (s.cam.y - lastCam.current.y) / Math.max(dt, 1e-3);
    lastCam.current = { x: s.cam.x, y: s.cam.y, t };
    const speed = Math.hypot(vx, vy);
    let targetYaw = 0;
    if (speed > 40) {
      // nur noch eine leise Andeutung von Kurs — kein Kippen der Welt
      targetYaw = THREE.MathUtils.clamp(Math.atan2(vx, -vy) * 0.12, -0.2, 0.2);
    }
    const targetRoll = -targetYaw * 0.1;

    // Beim Drag: direkte Kopplung (kein Gummi), Schweben fast aus
    const dragging = projStore.dragging;

    // Leerlauf-Schweben: Wellengang an der Kameraposition + langsames Atmen
    const bobAmp = dragging ? 0.12 : 0.35;
    const bob = waveHeight(tx, tz, t, projStore.calm) * bobAmp;
    const sway = Math.sin(t * 0.23) * 0.15 * (1 - ovF) * (dragging ? 0.3 : 1);

    const sm = smoothed.current;
    const k = dragging ? 1 - Math.pow(0.00005, dt) : 1 - Math.pow(0.002, dt);
    const kSlow = 1 - Math.pow(0.02, dt);
    sm.x += (tx - sm.x) * k;
    sm.z += (tz - sm.z) * k;
    sm.h += (h - sm.h) * kSlow;
    sm.dist += (dist - sm.dist) * kSlow;
    sm.fov += (fov - sm.fov) * kSlow;
    sm.yaw += (targetYaw - sm.yaw) * kSlow;
    sm.roll += (targetRoll - sm.roll) * kSlow;

    // Position: hinter/über dem Ziel (Süden, Blick nach Norden), Yaw versetzt die Kamera seitlich
    const yaw = sm.yaw + sway * 0.01;
    _pos.set(
      sm.x + Math.sin(yaw) * sm.dist,
      sm.h + bob,
      sm.z + Math.cos(yaw) * sm.dist,
    );

    // Blickziel: auf den Zielpunkt, beim Segeln leicht voraus
    const ahead = Math.min(speed * 0.0016, 0.9) * (1 - ovF);
    _look.set(
      sm.x - Math.sin(yaw) * ahead * 8,
      bob * 0.4,
      sm.z - Math.cos(yaw) * ahead * 8 - (1 - ovF) * 3.5,
    );

    cam.position.copy(_pos);
    _m.lookAt(_pos, _look, _up);
    _q.setFromRotationMatrix(_m);
    cam.quaternion.slerp(_q, 1 - Math.pow(0.008, dt));
    cam.rotateZ(sm.roll);

    if (Math.abs(cam.fov - sm.fov) > 0.05) {
      cam.fov = sm.fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
