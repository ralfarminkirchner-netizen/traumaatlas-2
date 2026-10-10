// Phänomene in 3D: lebendige Leuchtformen statt Bojen — myzelartige Fäden,
// die sich über die Wasserlinie verzweigen, und ein wirbelnder Partikelschwarm
// um einen hellen Kern. Jede Form ist aus der Phänomen-Id gesät (stabil),
// atmet und morpht langsam; Farbe und Lichtpool färben das Wasser ringsum.
// Bobben mit den Gerstner-Wellen (CPU-gesampelt aus waves.ts), Raycast-Klick
// → Brücken-Karte via projStore.

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

// ── Gesäter Zufall: dieselbe Phänomen-Id ergibt immer dieselbe Form ─────────

function seeded(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ── Myzel-Skelett: verzweigte Lichtfäden auf der Wasserebene ────────────────

interface ThreadData {
  segments: Float32Array;
  colors: Float32Array;
  nodes: Float32Array;
}

function buildThreads(rnd: () => number, base: THREE.Color): ThreadData {
  const segs: number[] = [];
  const cols: number[] = [];
  const nodes: number[] = [];
  const push = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f0: number, f1: number) => {
    segs.push(x0, y0, z0, x1, y1, z1);
    const c0 = base.clone().multiplyScalar(1 - f0 * 0.88);
    const c1 = base.clone().multiplyScalar(1 - f1 * 0.88);
    cols.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
  };
  const walk = (x: number, z: number, angle: number, len: number, depth: number, f0: number) => {
    const steps = 3 + Math.floor(rnd() * 3);
    let px = x, pz = z, py = 0.02;
    let a = angle;
    for (let s = 1; s <= steps; s++) {
      const f = f0 + (s / steps) * (1 - f0);
      a += (rnd() - 0.5) * 0.9;
      const segLen = (len / steps) * (0.7 + rnd() * 0.6);
      const nx = px + Math.cos(a) * segLen;
      const nz = pz + Math.sin(a) * segLen;
      const ny = 0.02 + f * f * 0.2; // die Spitze hebt sich hyphal leicht an
      push(px, py, pz, nx, ny, nz, f0 + ((s - 1) / steps) * (1 - f0), f);
      nodes.push(nx, ny, nz);
      if (depth < 2 && rnd() < 0.45) {
        walk(nx, nz, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.7), len * 0.45, depth + 1, f);
      }
      px = nx; pz = nz; py = ny;
    }
  };
  const branches = 3 + Math.floor(rnd() * 3); // 3–5 Hauptstränge
  for (let b = 0; b < branches; b++) {
    walk(0, 0, (b / branches) * Math.PI * 2 + rnd() * 0.8, 1.1 + rnd() * 1.1, 1, 0);
  }
  return {
    segments: new Float32Array(segs),
    colors: new Float32Array(cols),
    nodes: new Float32Array(nodes),
  };
}

// ── Partikel-Wirbel: umherwirbelnde Lichtkörner um den Kern ─────────────────

interface SwirlData {
  count: number;
  /** pro Partikel: radius, winkelgeschw., phase, yAmp, yPhase, ySpeed, größe, hell */
  params: Float32Array;
  colors: Float32Array;
  positions: Float32Array;
}

function buildSwirl(rnd: () => number, base: THREE.Color): SwirlData {
  const count = 16 + Math.floor(rnd() * 9); // 16–24
  const params = new Float32Array(count * 8);
  const colors = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    params[i * 8 + 0] = 0.28 + rnd() * 1.05;                        // radius
    params[i * 8 + 1] = (0.25 + rnd() * 0.65) * (rnd() < 0.5 ? 1 : -1); // w
    params[i * 8 + 2] = rnd() * Math.PI * 2;                        // phase
    params[i * 8 + 3] = 0.05 + rnd() * 0.3;                         // yAmp
    params[i * 8 + 4] = rnd() * Math.PI * 2;                        // yPhase
    params[i * 8 + 5] = 0.5 + rnd() * 1.4;                          // ySpeed
    params[i * 8 + 6] = 0.11 + rnd() * 0.16;                        // größe
    const bright = 0.55 + rnd() * 0.65;
    params[i * 8 + 7] = bright;                                     // hell
    colors[i * 3 + 0] = base.r * bright;
    colors[i * 3 + 1] = base.g * bright;
    colors[i * 3 + 2] = base.b * bright;
  }
  return { count, params, colors, positions };
}

// ── Eine Leuchtform ──────────────────────────────────────────────────────────

function LichtForm({ p, selected }: { p: Phenomenon; selected: boolean }) {
  const gRef = useRef<THREE.Group>(null);
  const threadRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const nodesRef = useRef<THREE.Points>(null);
  const swirlRef = useRef<THREE.Points>(null);
  const color = useMemo(() => new THREE.Color(p.color), [p.color]);
  const bx = w2x(p.x);
  const bz = w2z(p.y);

  // Gesäte Form: Myzel-Fäden, Wirbel-Parameter, Morph-Rhythmen
  const form = useMemo(() => {
    const rnd = seeded(p.id);
    const threads = buildThreads(rnd, color);
    const swirl = buildSwirl(rnd, color);
    return {
      threads,
      swirl,
      rotW: (0.02 + rnd() * 0.035) * (rnd() < 0.5 ? 1 : -1), // langsame Drehung
      breathW: 0.25 + rnd() * 0.4,
      breathP: rnd() * Math.PI * 2,
      lineW: 0.5 + rnd() * 0.8,
      lineP: rnd() * Math.PI * 2,
    };
  }, [p.id, color]);

  const threadGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(form.threads.segments, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(form.threads.colors, 3));
    return geo;
  }, [form]);

  const nodesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(form.threads.nodes, 3));
    return geo;
  }, [form]);

  const swirlGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(form.swirl.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(form.swirl.colors, 3));
    return geo;
  }, [form]);

  const haloTex = useMemo(() => getHaloTexture(), []);

  useFrame(({ clock }) => {
    const g = gRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const calm = projStore.calm;
    const y = waveHeight(bx, bz, t, calm) * 0.9;
    g.position.set(bx, y + 0.02, bz);
    // Neigung aus der Wellennormalen — die Fäden liegen auf der Wasserhaut
    const [nx, ny, nz] = waveNormal(bx, bz, t, calm);
    _n.set(nx, ny, nz);
    _q.setFromUnitVectors(_up, _n);
    g.quaternion.slerp(_q, 0.08);

    // Morph: langsame Drehung + Atmen des Skeletts
    const breathe = 1 + 0.045 * Math.sin(t * form.breathW + form.breathP);
    const selGrow = selected ? 1.22 : 1;
    if (threadRef.current) {
      threadRef.current.rotation.y = form.rotW * t;
      threadRef.current.scale.setScalar(breathe * selGrow);
    }
    if (lineRef.current) {
      const m = lineRef.current.material as THREE.LineBasicMaterial;
      m.opacity = (0.3 + 0.16 * Math.sin(t * form.lineW + form.lineP)) * (selected ? 1.5 : 1);
    }
    if (nodesRef.current) {
      const m = nodesRef.current.material as THREE.PointsMaterial;
      m.size = 0.16 * (0.85 + 0.3 * Math.sin(t * form.breathW * 1.7 + form.breathP));
    }

    // Partikel-Wirbel: jedes Korn auf eigener Bahn, vertikal atmend
    if (swirlRef.current) {
      const { count, params } = form.swirl;
      const pos = swirlGeo.attributes.position.array as Float32Array;
      const speedUp = selected ? 1.45 : 1;
      for (let i = 0; i < count; i++) {
        const r = params[i * 8 + 0];
        const w = params[i * 8 + 1] * speedUp;
        const ph = params[i * 8 + 2];
        const yAmp = params[i * 8 + 3];
        const yPh = params[i * 8 + 4];
        const ySp = params[i * 8 + 5];
        const a = w * t + ph;
        const rr = r * (0.9 + 0.1 * Math.sin(t * 0.3 + ph * 2));
        pos[i * 3 + 0] = Math.cos(a) * rr;
        pos[i * 3 + 1] = 0.14 + yAmp * (0.5 + 0.5 * Math.sin(t * ySp + yPh));
        pos[i * 3 + 2] = Math.sin(a) * rr;
      }
      swirlGeo.attributes.position.needsUpdate = true;
      const m = swirlRef.current.material as THREE.PointsMaterial;
      m.size = 0.2 * (selected ? 1.3 : 1);
    }

    // Kern + Halo pulsieren; Auswahl hebt die Form an
    const pulse = 1 + Math.sin(t * 1.6 + p.bornAt / 900) * 0.07;
    if (glowRef.current) glowRef.current.scale.setScalar(pulse * (selected ? 1.3 : 1));
    if (haloRef.current) {
      const m = haloRef.current.material as THREE.SpriteMaterial;
      m.opacity = (selected ? 0.85 : 0.5) * pulse;
    }
    // Kielspur: schnell driftende Form bricht das Wasser auf
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
      <group ref={threadRef}>
        {/* Myzel-Fäden: additive Linien, zur Spitze verblassend */}
        <lineSegments ref={lineRef} geometry={threadGeo}>
          <lineBasicMaterial vertexColors transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </lineSegments>
        {/* Knotenlichter entlang der Fäden */}
        <points ref={nodesRef} geometry={nodesGeo}>
          <pointsMaterial map={haloTex} color={color} size={0.16} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} sizeAttenuation />
        </points>
      </group>
      {/* Wirbelnder Partikelschwarm */}
      <points ref={swirlRef} geometry={swirlGeo}>
        <pointsMaterial map={haloTex} vertexColors size={0.2} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} sizeAttenuation />
      </points>
      {/* heller Kern — das Herz der Form */}
      <mesh ref={glowRef} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.095, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Halo (spiegelt sich im Wasser) */}
      <sprite ref={haloRef} position={[0, 0.28, 0]} scale={[1.3, 1.3, 1]}>
        <spriteMaterial
          map={haloTex}
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

// ── Projektions-Brücke: Form-Positionen → projStore (DOM-Karte/Labels) ──────

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

  // Lichtpools der Leuchtformen fürs Wasser (pulsierend, in Phänomenfarbe)
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
      // Feld-Nähe des Schwimmers lässt die Form aufleuchten (Sog/Barriere spürbar)
      const bd = Math.hypot(w2x(p.x) - swimmer.x, w2z(p.y) - swimmer.z);
      const near = Math.max(0, 1 - bd / 12);
      const pulse = 0.65 + 0.35 * Math.sin(t * 1.6 + p.bornAt / 900);
      _buoyCache.push({
        x: w2x(p.x),
        z: w2z(p.y),
        r: 2.1 + near * 1.3,
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
        <LichtForm key={p.id} p={p} selected={selected === p.id} />
      ))}
      <Arms3D arms={arms} phenById={phenById} />
      <PhenProjBridge phenomena={phenomena} />
    </>
  );
}
