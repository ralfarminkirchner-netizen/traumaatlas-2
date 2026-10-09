// Phänomene in 3D: leuchtende Bojen auf der Wasserlinie (bobben mit den
// Gerstner-Wellen, CPU-gesampelt aus waves.ts), Verbindungs-Arme als
// additive Lichtbögen, Raycast-Klick → Brücken-Karte via projStore.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  useOcean, selectPhenomenon, type Phenomenon,
} from "../ocean/world";
import { w2x, w2z } from "./coords";
import { waveHeight, waveNormal } from "./waves";
import { swimmer } from "./swimmer";
import { projStore, splat3D } from "./projStore";
import { getHaloTexture } from "./textures";
import { Arms3D } from "./Arms3D";
import { setWaterBuoys, type FieldLight } from "./OceanWater";

const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();

// ── Eine Boje ────────────────────────────────────────────────────────────────

function Buoy({ p, selected }: { p: Phenomenon; selected: boolean }) {
  const gRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(p.color), [p.color]);
  const bx = w2x(p.x);
  const bz = w2z(p.y);

  useFrame(({ clock }) => {
    const g = gRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const y = waveHeight(bx, bz, t, calm) * 0.9;
    g.position.set(bx, y + 0.02, bz);
    // Neigung aus der Wellennormalen (weich gedämpft)
    const [nx, ny, nz] = waveNormal(bx, bz, t, calm);
    _n.set(nx, ny, nz);
    _q.setFromUnitVectors(_up, _n);
    g.quaternion.slerp(_q, 0.08);
    // Puls + Auswahl
    const pulse = 1 + Math.sin(t * 1.6 + p.bornAt / 900) * 0.07;
    if (glowRef.current) glowRef.current.scale.setScalar(pulse * (selected ? 1.3 : 1));
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = (selected ? 0.85 : 0.5) * pulse;
    }
    // Kielspur: schnell driftende Boje bricht das Wasser auf
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 70 && Math.random() < 0.06) splat3D(p.x, p.y, Math.min(0.5, speed / 500));
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    projStore.hitAt = performance.now(); // Stage: kein Wasser-Klick-Segeln dahinter
    selectPhenomenon(selected ? null : p.id);
  };

  return (
    <group ref={gRef} onClick={click}>
      {/* Holzsockel */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.13, 0.17, 0.14, 8]} />
        <meshStandardMaterial color="#241c14" roughness={0.9} />
      </mesh>
      {/* leuchtende Kugel in Phänomenfarbe */}
      <mesh ref={glowRef} position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.115, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Halo (spiegelt sich im Wasser) */}
      <sprite ref={haloRef} position={[0, 0.3, 0]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          map={getHaloTexture()}
          color={color}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0.5}
        />
      </sprite>
      {/* Auswahlring auf der Wasserlinie */}
      {selected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.36, 32]} />
          <meshBasicMaterial color="#ede4d4" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* großzügiger, unsichtbarer Klick-Körper */}
      <mesh visible={false} onClick={click}>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

// ── Projektions-Brücke: Bojen-Positionen → projStore (DOM-Karte/Labels) ─────

function PhenProjBridge({ phenomena }: { phenomena: Phenomenon[] }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const seen = new Set<string>();
    for (const p of phenomena) {
      const bx = w2x(p.x);
      const bz = w2z(p.y);
      const y = waveHeight(bx, bz, t, projStore.calm) * 0.9 + 0.55;
      _v.set(bx, y, bz).project(camera);
      const behind = _v.z > 1;
      const sx = (_v.x * 0.5 + 0.5) * size.width;
      const sy = (-_v.y * 0.5 + 0.5) * size.height;
      seen.add(p.id);
      projStore.phen.set(p.id, {
        sx,
        sy,
        visible: !behind && sx > -80 && sx < size.width + 80 && sy > -60 && sy < size.height + 80,
      });
    }
    // entfernte Phänomene aufräumen
    for (const key of [...projStore.phen.keys()]) {
      if (!seen.has(key)) projStore.phen.delete(key);
    }
  });
  return null;
}

// ── Wurzel ───────────────────────────────────────────────────────────────────

const _buoyCache: FieldLight[] = [];

export function Phenomena3D() {
  const { phenomena, arms, selected } = useOcean();
  const phenById = useMemo(() => new Map(phenomena.map((p) => [p.id, p])), [phenomena]);

  // Bojen-Lichtpools fürs Wasser (pulsierend, in Phänomenfarbe)
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    _buoyCache.length = 0;
    // bei mehr als 13: die kameranächsten wählen (Slot 14 gehört dem Schwimmer)
    const sorted = phenomena.length > 13
      ? [...phenomena].sort((pa, pb) =>
          Math.hypot(w2x(pa.x) - camera.position.x, w2z(pa.y) - camera.position.z) -
          Math.hypot(w2x(pb.x) - camera.position.x, w2z(pb.y) - camera.position.z),
        )
      : phenomena;
    for (const p of sorted.slice(0, 13)) {
      // Feld-Nähe des Schwimmers lässt die Boje aufleuchten (Sog/Barriere spürbar)
      const bd = Math.hypot(w2x(p.x) - swimmer.x, w2z(p.y) - swimmer.z);
      const near = Math.max(0, 1 - bd / 12);
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.6 + p.bornAt / 900);
      _buoyCache.push({
        x: w2x(p.x),
        z: w2z(p.y),
        r: 1.9 + near * 1.2,
        i: (0.7 + near * 0.9) * pulse,
        c: new THREE.Color(p.color),
      });
    }
    // der Schwimmer selbst ist ein warmes Licht im Feld
    const sgrow = 1 + 0.12 * Math.sqrt(swimmer.level);
    _buoyCache.push({
      x: swimmer.x,
      z: swimmer.z,
      r: 2.3 * sgrow,
      i: 0.55 * swimmer.smActive * (0.9 + 0.1 * Math.sin(t * 0.55)),
      c: new THREE.Color("#ffd9a0"),
    });
    setWaterBuoys(_buoyCache);
  });

  return (
    <>
      {phenomena.map((p) => (
        <Buoy key={p.id} p={p} selected={selected === p.id} />
      ))}
      <Arms3D arms={arms} phenById={phenById} />
      <PhenProjBridge phenomena={phenomena} />
    </>
  );
}
