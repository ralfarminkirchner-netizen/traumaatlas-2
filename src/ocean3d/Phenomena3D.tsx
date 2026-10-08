// Phänomene in 3D: leuchtende Bojen auf der Wasserlinie (bobben mit den
// Gerstner-Wellen, CPU-gesampelt aus waves.ts), Verbindungs-Arme als
// additive Lichtbögen, Raycast-Klick → Brücken-Karte via projStore.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import {
  useOcean, selectPhenomenon, type Phenomenon, type Arm,
} from "../ocean/world";
import { w2x, w2z } from "./coords";
import { waveHeight, waveNormal } from "./waves";
import { projStore } from "./projStore";
import { getHaloTexture } from "./Islands3D";

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
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
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

// ── Ein Arm (additiver Lichtbogen) ───────────────────────────────────────────

const ARC_POINTS = 22;

function ArmArc({ arm, a, b }: { arm: Arm; a: Phenomenon; b: Phenomenon }) {
  const lineRef = useRef<any>(null);
  const color = arm.latched ? "#e8c9a0" : "#9fd8cf";
  const pts = useMemo(() => new Float32Array(ARC_POINTS * 3), []);

  useFrame(({ clock }) => {
    const line = lineRef.current;
    if (!line) return;
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const ax = w2x(a.x);
    const az = w2z(a.y);
    const bx2 = w2x(b.x);
    const bz2 = w2z(b.y);
    const ya = waveHeight(ax, az, t, calm) * 0.9 + 0.14;
    const yb = waveHeight(bx2, bz2, t, calm) * 0.9 + 0.14;
    // Bogen: Mitte leicht angehoben, pendelt quer wie in der 2D-Fassung
    const mx = (ax + bx2) / 2;
    const mz = (az + bz2) / 2;
    const dx = bx2 - ax;
    const dz = bz2 - az;
    const len = Math.hypot(dx, dz) || 1;
    const sway = Math.sin(t * 0.7 + a.bornAt / 1000) * len * 0.09;
    const my = Math.max(ya, yb) + 0.18 + len * 0.06;
    const cx = mx - (dz / len) * sway;
    const cz = mz + (dx / len) * sway;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(ax, ya, az),
      new THREE.Vector3(cx, my, cz),
      new THREE.Vector3(bx2, yb, bz2),
    );
    const arr = curve.getPoints(ARC_POINTS - 1);
    for (let i = 0; i < ARC_POINTS; i++) {
      pts[i * 3] = arr[i].x;
      pts[i * 3 + 1] = arr[i].y;
      pts[i * 3 + 2] = arr[i].z;
    }
    line.geometry.setPositions(pts);
    if (line.computeLineDistances) line.computeLineDistances();
    const m = line.material as { opacity: number };
    m.opacity = arm.growth * (arm.latched ? 0.7 : 0.5);
  });

  return (
    <Line
      ref={lineRef}
      points={[[0, -10, 0], [0, -10, 0]]}
      color={color}
      lineWidth={arm.latched ? 3 : 2}
      transparent
      opacity={0}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
      dashed={!arm.latched}
      dashSize={0.28}
      gapSize={0.22}
    />
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

export function Phenomena3D() {
  const { phenomena, arms, selected } = useOcean();
  const phenById = useMemo(() => new Map(phenomena.map((p) => [p.id, p])), [phenomena]);

  return (
    <>
      {phenomena.map((p) => (
        <Buoy key={p.id} p={p} selected={selected === p.id} />
      ))}
      {arms.map((arm) => {
        const a = phenById.get(arm.a);
        const b = phenById.get(arm.b);
        if (!a || !b || arm.growth <= 0.02) return null;
        return <ArmArc key={`${arm.a}-${arm.b}`} arm={arm} a={a} b={b} />;
      })}
      <PhenProjBridge phenomena={phenomena} />
    </>
  );
}
