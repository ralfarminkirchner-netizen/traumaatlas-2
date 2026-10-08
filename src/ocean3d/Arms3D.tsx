// Verbindungs-Arme: elastische Lichtbänder zwischen den Bojen.
// Spannungssprache: locker = breit, gedimmt, hängt durch; gespannt = dünn,
// hell, zittert hochfrequent. Festgehakt (latched): wandernder Lichtpuls.
// Negative Beziehungen (Schattenarbeit): kaltes violettes Band, das flackert
// und an beiden Enden Ringwellen ins Wasser stößt (Abstoßung wird sichtbar).
// Ein reißender Arm hinterlässt einen Funken-Burst (TearBursts).

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { type Phenomenon, type Arm } from "../ocean/world";
import { w2x, w2z, x2w, z2w } from "./coords";
import { waveHeight } from "./waves";
import { projStore, splat3D } from "./projStore";

const N = 28; // Band-Segmente
const LINK = 620 * 0.02; // LINK_DIST in 3D-Einheiten (12.4)

// ── Shader ───────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
attribute float aU;
attribute float aSide;
varying float vU;
varying float vSide;
varying float vFade;
void main() {
  vU = aU;
  vSide = aSide;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFade = exp(-max(-mv.z, 0.0) * 0.014);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTension;
uniform float uLatched;
uniform float uNegative;
uniform float uGrowth;
uniform float uTime;
varying float vU;
varying float vSide;
varying float vFade;

void main() {
  if (vU > uGrowth) discard;
  float edge = 1.0 - abs(vSide);
  edge = edge * edge * (3.0 - 2.0 * edge);
  float a = edge * uOpacity * vFade;
  a *= smoothstep(uGrowth, max(uGrowth - 0.08, 0.0), vU); // weiches Wachstums-Ende

  vec3 col = uColor;
  // gespannt: helle, dünne Kernlinie
  float core = smoothstep(0.6, 1.0, edge) * uTension;
  col += uColor * core * 1.1;
  // festgehakt: wandernder Puls (Energiefluss)
  float pulse = exp(-pow((fract(vU - uTime * 0.35) - 0.5) * 7.0, 2.0)) * uLatched * 1.6;
  col += uColor * pulse;
  // Schattenarbeit: kaltes, unruhiges Flackern
  if (uNegative > 0.5) {
    float flick = 0.7 + 0.3 * sin(uTime * 9.0 + vU * 22.0);
    col *= flick;
    a *= 0.85;
  }
  gl_FragColor = vec4(col, a);
}
`;

// ── Funken-Burst beim Reißen ─────────────────────────────────────────────────

interface Burst {
  id: number;
  born: number;
  points: THREE.Vector3[];
  vels: THREE.Vector3[];
  color: THREE.Color;
}

let burstId = 1;
let addBurstExternal: ((b: Burst) => void) | null = null;

type AnyPoints = THREE.Points<THREE.BufferGeometry<THREE.NormalOrGLBufferAttributes>, THREE.Material | THREE.Material[]>;

function TearBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const refs = useRef(new Map<number, AnyPoints>());

  // Registrierung einmalig
  useMemo(() => {
    addBurstExternal = (b) => setBursts((bs) => [...bs.slice(-3), b]);
    return () => { addBurstExternal = null; };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let changed = false;
    for (const b of bursts) {
      if (b.born < 0) b.born = t; // Zeitbasis der Szene übernehmen
      const age = t - b.born;
      const pts = refs.current.get(b.id);
      if (!pts) continue;
      const attr = (pts.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < b.points.length; i++) {
        b.vels[i].y -= 0.9 * 0.016;
        b.points[i].addScaledVector(b.vels[i], 0.016);
        attr.setXYZ(i, b.points[i].x, Math.max(b.points[i].y, 0.02), b.points[i].z);
      }
      attr.needsUpdate = true;
      const m = pts.material as THREE.PointsMaterial;
      m.opacity = Math.max(0, 1 - age / 1.2);
    }
    const alive = bursts.filter((b) => t - b.born < 1.25);
    if (alive.length !== bursts.length) { changed = true; }
    if (changed) setBursts(alive);
  });

  return (
    <>
      {bursts.map((b) => {
        const geo = new THREE.BufferGeometry();
        const arr = new Float32Array(b.points.length * 3);
        b.points.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
        geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        return (
          <points
            key={b.id}
            geometry={geo}
            ref={(p) => { if (p) refs.current.set(b.id, p); else refs.current.delete(b.id); }}
          >
            <pointsMaterial
              color={b.color}
              size={0.14}
              transparent
              opacity={1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              sizeAttenuation
            />
          </points>
        );
      })}
    </>
  );
}

// ── Ein Arm ──────────────────────────────────────────────────────────────────

function ArmBand({ arm, a, b }: { arm: Arm; a: Phenomenon; b: Phenomenon }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastPts = useRef<THREE.Vector3[]>([]);
  const growthRef = useRef(0);
  const ringTimer = useRef(0);
  const negative = arm.strength < 0;

  const { geometry, material } = useMemo(() => {
    const count = (N + 1) * 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const aU = new Float32Array(count);
    const aSide = new Float32Array(count);
    for (let i = 0; i <= N; i++) {
      aU[i * 2] = i / N;
      aU[i * 2 + 1] = i / N;
      aSide[i * 2] = -1;
      aSide[i * 2 + 1] = 1;
    }
    geo.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    geo.setAttribute("aSide", new THREE.BufferAttribute(aSide, 1));
    const idx: number[] = [];
    for (let i = 0; i < N; i++) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    geo.setIndex(idx);

    const color = negative ? new THREE.Color("#8a6cff") : new THREE.Color(arm.latched ? "#e8c9a0" : "#9fd8cf");
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: 0 },
        uTension: { value: 0 },
        uLatched: { value: 0 },
        uNegative: { value: negative ? 1 : 0 },
        uGrowth: { value: 0 },
        uTime: { value: 0 },
      },
    });
    return { geometry: geo, material };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Farbe/Gegner-Status kann sich ändern (latched)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const u = material.uniforms;
    u.uTime.value = t;
    u.uLatched.value = arm.latched ? 1 : 0;
    if (!negative) (u.uColor.value as THREE.Color).set(arm.latched ? "#e8c9a0" : "#9fd8cf");

    const ax = w2x(a.x);
    const az = w2z(a.y);
    const bx = w2x(b.x);
    const bz = w2z(b.y);
    const ya = waveHeight(ax, az, t, calm) * 0.9 + 0.18;
    const yb = waveHeight(bx, bz, t, calm) * 0.9 + 0.18;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz) || 0.001;

    // Spannung: weit auseinander = Zug (negativ: konstant mittleres Feld)
    const tension = negative ? 0.42 : THREE.MathUtils.clamp(len / LINK, 0, 1);
    u.uTension.value = tension;
    growthRef.current = arm.growth;
    u.uGrowth.value = arm.growth;
    u.uOpacity.value = arm.growth * (negative ? 0.6 : arm.latched ? 0.85 : 0.68);

    // Bogen: locker hängt er durch, gespannt straff + Zittern
    const sway = Math.sin(t * 0.6 + a.bornAt / 1000) * len * 0.07 * (1 - tension * 0.65);
    const sag = (1 - tension) * Math.min(len * 0.1, 0.65);
    const cy = Math.max(ya, yb) + 0.24 + len * 0.04 - sag;
    const cx = (ax + bx) / 2 - (dz / len) * sway;
    const cz = (az + bz) / 2 + (dx / len) * sway;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const width = negative ? 0.24 : THREE.MathUtils.lerp(0.2, 0.06, tension);
    const pts = lastPts.current;
    pts.length = 0;

    for (let i = 0; i <= N; i++) {
      const tt = i / N;
      // quadratischer Bézier
      const q0x = ax + (cx - ax) * tt;
      const q0z = az + (cz - az) * tt;
      const q0y = ya + (cy - ya) * tt;
      const q1x = cx + (bx - cx) * tt;
      const q1z = cz + (bz - cz) * tt;
      const q1y = cy + (yb - cy) * tt;
      let px = q0x + (q1x - q0x) * tt;
      let py = q0y + (q1y - q0y) * tt;
      let pz = q0z + (q1z - q0z) * tt;

      // Zittern bei Spannung (hochfrequent, quer)
      if (tension > 0.15) {
        const tr = Math.sin(t * 17 + i * 1.31 + a.bornAt / 1300) * 0.05 * tension * Math.sin(tt * Math.PI);
        px += (-dz / len) * tr;
        pz += (dx / len) * tr;
        py += Math.sin(t * 21 + i * 0.9) * 0.02 * tension * Math.sin(tt * Math.PI);
      }

      // Tangente → horizontale Senkrechte (Band liegt auf dem Wasser)
      const txv = bx - ax;
      const tzv = bz - az;
      const sxv = (-tzv / len) * width;
      const szv = (txv / len) * width;

      posAttr.setXYZ(i * 2, px - sxv, py, pz - szv);
      posAttr.setXYZ(i * 2 + 1, px + sxv, py, pz + szv);
      pts.push(new THREE.Vector3(px, py, pz));
    }
    posAttr.needsUpdate = true;

    // Schattenarbeit: Abstoßung stößt sichtbare Ringe ins Wasser
    if (negative && arm.growth > 0.2) {
      ringTimer.current += 1;
      if (ringTimer.current > 80) {
        ringTimer.current = 0;
        splat3D(x2w(ax), z2w(az), 0.22);
        splat3D(x2w(bx), z2w(bz), 0.22);
      }
    }
  });

  // Reißen: Funken-Burst entlang des letzten Verlaufs (Cleanup beim Unmount)
  const colorForBurst = negative ? "#8a6cff" : "#e8c9a0";
  useEffect(() => {
    return () => {
      if (growthRef.current > 0.25 && lastPts.current.length > 4 && addBurstExternal) {
        const pts = lastPts.current.filter((_, i) => i % 2 === 0);
        addBurstExternal({
          id: burstId++,
          born: -1, // wird im ersten Frame auf die Szenenzeit gesetzt
          points: pts.map((p) => p.clone()),
          vels: pts.map(() =>
            new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.2 + 0.3, (Math.random() - 0.5) * 1.6),
          ),
          color: new THREE.Color(colorForBurst),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}

// ── Wurzel ───────────────────────────────────────────────────────────────────

export function Arms3D({ arms, phenById }: { arms: Arm[]; phenById: Map<string, Phenomenon> }) {
  return (
    <>
      {arms.map((arm) => {
        const a = phenById.get(arm.a);
        const b = phenById.get(arm.b);
        if (!a || !b || arm.growth <= 0.02) return null;
        return <ArmBand key={`${arm.a}-${arm.b}`} arm={arm} a={a} b={b} />;
      })}
      <TearBursts />
    </>
  );
}
