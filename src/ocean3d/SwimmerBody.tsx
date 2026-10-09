// Der Schwimmer-Körper: würdevolle Silhouette auf der Wasseroberfläche.
// Kernlicht + weiche Wasser-Haut, bobbt auf den Gerstner-Wellen, neigt sich
// aus Wellennormale + eigenem Verdrängungs-Gradienten, stößt Eigenwellen aus.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useOcean, getOceanState } from "../ocean/world";
import { waveHeight, waveNormal, bodyDisplacement, bodyGradient } from "./waves";
import { swimmer, stepSwimmer, acceptPhenomenon, WakeEmitter } from "./swimmer";
import { projStore, splat3D } from "./projStore";
import { w2x, w2z, x2w, z2w } from "./coords";
import { getHaloTexture } from "./textures";

const _up = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();

export function Swimmer() {
  const gRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const skinRef = useRef<THREE.Mesh>(null);
  const haloInRef = useRef<THREE.Sprite>(null);
  const haloOutRef = useRef<THREE.Sprite>(null);
  const wake = useRef(new WakeEmitter());
  const fieldT = useRef(0);

  const { selected, view } = useOcean();

  // Begegnung = Annehmen: ein Phänomen öffnen lässt den Körper wachsen
  useEffect(() => {
    if (selected) acceptPhenomenon(selected);
  }, [selected]);

  const haloTex = useMemo(() => getHaloTexture(), []);

  useFrame(({ clock }, delta) => {
    const g = gRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05) || 0.016;
    const t = clock.elapsedTime;

    const { speed, field } = stepSwimmer(dt);
    wake.current.step(dt, speed);

    // Feld-Atem: Sog = einströmende Ringe zwischen Körper und Phänomen,
    // Barriere = Gischt-Wall am Widerstand (Felder atmen mit den Wellen)
    fieldT.current += dt;
    if (field.kind && field.nearId) {
      const p = getOceanState().phenomena.find((q) => q.id === field.nearId);
      if (p) {
        const px = w2x(p.x);
        const pz = w2z(p.y);
        const breath = 0.6 + 0.4 * Math.sin(t * 1.1 + waveHeight(px, pz, t, projStore.calm) * 4);
        if (field.kind === "sog" && fieldT.current > 0.85) {
          fieldT.current = 0;
          const mx = swimmer.x + (px - swimmer.x) * 0.4;
          const mz = swimmer.z + (pz - swimmer.z) * 0.4;
          splat3D(x2w(mx), z2w(mz), 0.3 * breath);
        } else if (field.kind === "barriere" && fieldT.current > 0.5) {
          fieldT.current = 0;
          const mx = swimmer.x + (px - swimmer.x) * 0.55;
          const mz = swimmer.z + (pz - swimmer.z) * 0.55;
          splat3D(x2w(mx), z2w(mz), 0.65 * breath);
        }
      }
    }

    // Auf-und-Ab: Wellengang + eigene Mulde (der Körper liegt IM Wasser)
    const x = swimmer.x;
    const z = swimmer.z;
    const calm = projStore.calm;
    const y = waveHeight(x, z, t, calm) + bodyDisplacement(x, z) * 0.55;
    g.position.set(x, y + 0.12, z);

    // Neigung: Wellennormale + Verdrängungs-Gradient (weich gedämpft)
    const [nx, ny, nz] = waveNormal(x, z, t, calm);
    const [bgx, bgz] = bodyGradient(x, z);
    _n.set(nx - bgx * 0.5, ny, nz - bgz * 0.5).normalize();
    _q.setFromUnitVectors(_up, _n);
    g.quaternion.slerp(_q, 1 - Math.pow(0.02, dt));

    // Wachstum: ruhige Präsenz-Zunahme
    const lvl = swimmer.level;
    const grow = 1 + 0.12 * Math.sqrt(lvl);

    // Atmen: ein langsamer, tiefer Zug — keine Fanfare
    const breath = 1 + Math.sin(t * 0.55) * 0.05;
    const act = swimmer.smActive;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(grow * breath);
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.95 * act;
    }
    if (skinRef.current) {
      // Wasser-Haut: Ring auf der Oberfläche, spannt sich um den Körper
      const sr = (swimmer.smR / 4.2) * (1 + Math.sin(t * 0.55 + 0.6) * 0.03);
      skinRef.current.scale.setScalar(sr);
      const m = skinRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.22 * act * breath;
    }
    if (haloInRef.current) {
      haloInRef.current.scale.setScalar(1.7 * grow * breath);
      const m = haloInRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.38 * act;
    }
    if (haloOutRef.current) {
      haloOutRef.current.scale.setScalar(3.4 * grow * breath);
      const m = haloOutRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.09 * act;
    }

    // Sichtbarkeit hart ausblenden, wenn ein Kapitel offen ist
    g.visible = act > 0.03 && !view;
  });

  return (
    <group ref={gRef} position={[swimmer.x, 0.1, swimmer.z]}>
      {/* Kernlicht — ruhig, warm, kein Spielzeug */}
      <mesh ref={coreRef} position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshBasicMaterial color="#ffe9c4" toneMapped={false} transparent opacity={0.95} />
      </mesh>
      {/* innere Aura */}
      <sprite ref={haloInRef} position={[0, 0.28, 0]}>
        <spriteMaterial
          map={haloTex}
          color="#ffd9a0"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.5}
        />
      </sprite>
      {/* weite, stille Aura */}
      <sprite ref={haloOutRef} position={[0, 0.3, 0]}>
        <spriteMaterial
          map={haloTex}
          color="#e8b86d"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.16}
        />
      </sprite>
      {/* Wasser-Haut: weiche Oberflächen-Spannung um den Körper */}
      <mesh ref={skinRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.55, 1.0, 48]} />
        <meshBasicMaterial
          color="#cfe3e0"
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
