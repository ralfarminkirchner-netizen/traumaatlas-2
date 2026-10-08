// Form-Emergenz: Phänomen-Cluster (≥3 Teile, durch festgehakte Arme verbunden)
// werden eine sichtbare, atmende Form auf dem Wasser — eine weiche Lichtglocke
// um den Schwerpunkt, die mit den Wellen atmet. Die Form ist nichts Festes:
// zerfällt das Netz (Arme lösen sich), zerfließt die Form wieder.

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useOcean, type Arm, type Phenomenon } from "../ocean/world";
import { w2x, w2z, S } from "./coords";
import { waveHeight } from "./waves";
import { projStore } from "./projStore";
import { getHaloTexture } from "./textures";

interface Cluster {
  key: string;
  cx: number; // Weltkoordinaten (2D)
  cz: number;
  r: number;  // Radius in 2D-Welteinheiten
  n: number;  // Anzahl Teile
  leaving?: boolean;
}

/** Zusammenhängende Komponenten über gelatchte Arme (BFS), ab 3 Teilen. */
function clustersOf(phenomena: Phenomenon[], arms: Arm[]): Cluster[] {
  const adj = new Map<string, string[]>();
  for (const a of arms) {
    if (!a.latched) continue;
    adj.set(a.a, [...(adj.get(a.a) ?? []), a.b]);
    adj.set(a.b, [...(adj.get(a.b) ?? []), a.a]);
  }
  const byId = new Map(phenomena.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const out: Cluster[] = [];
  for (const p of phenomena) {
    if (seen.has(p.id) || !adj.has(p.id)) continue;
    const queue = [p.id];
    const comp: Phenomenon[] = [];
    seen.add(p.id);
    while (queue.length) {
      const id = queue.pop()!;
      const ph = byId.get(id);
      if (ph) comp.push(ph);
      for (const nx of adj.get(id) ?? []) {
        if (!seen.has(nx)) { seen.add(nx); queue.push(nx); }
      }
    }
    if (comp.length >= 3) {
      const cx = comp.reduce((s, c) => s + c.x, 0) / comp.length;
      const cz = comp.reduce((s, c) => s + c.y, 0) / comp.length;
      const r = Math.max(...comp.map((c) => Math.hypot(c.x - cx, c.y - cz)), 120);
      out.push({ key: comp.map((c) => c.id).sort().join("|"), cx, cz, r, n: comp.length });
    }
  }
  return out;
}

function Constellation({ c, leaving }: { c: Cluster; leaving: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Sprite>(null);
  const op = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const target = leaving ? 0 : 1;
    op.current += (target - op.current) * Math.min(1, dt * 1.6);
    const x = w2x(c.cx);
    const z = w2z(c.cz);
    const y = waveHeight(x, z, t, projStore.calm) * 0.5;
    const breathe = 0.9 + 0.1 * Math.sin(t * 0.5 + c.n);
    if (glowRef.current) {
      glowRef.current.position.set(x, y + 0.1, z);
      glowRef.current.scale.setScalar(c.r * S * 1.5 * breathe);
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.14 * op.current;
    }
    if (coreRef.current) {
      coreRef.current.position.set(x, y + 0.9 + Math.sin(t * 0.4 + c.n * 2) * 0.12, z);
      coreRef.current.scale.setScalar(1.6 + c.n * 0.22);
      const m = coreRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.4 * op.current * breathe;
    }
  });

  return (
    <>
      {/* weiche Lichtglocke auf dem Wasser um den Cluster-Schwerpunkt */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          map={getHaloTexture()}
          color="#e8cfa4"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* atmender Kern über dem Cluster */}
      <sprite ref={coreRef}>
        <spriteMaterial
          map={getHaloTexture()}
          color="#f0d9b0"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
          opacity={0}
        />
      </sprite>
    </>
  );
}

export function Constellations3D() {
  const { phenomena, arms } = useOcean();
  // Nur Neu-Berechnen, wenn sich die gelatchte Struktur oder die Teile ändern
  const structKey = arms.filter((a) => a.latched).map((a) => `${a.a}=${a.b}`).sort().join(";") + "|" + phenomena.map((p) => p.id).length;
  const clusters = useMemo(() => clustersOf(phenomena, arms), [structKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zerfließen: verschwundene Cluster bleiben kurz als „leaving" bestehen
  const [shown, setShown] = useState<Cluster[]>([]);
  useEffect(() => {
    setShown((prev) => {
      const nextKeys = new Set(clusters.map((c) => c.key));
      const kept = prev.map((c) => (nextKeys.has(c.key) ? { ...c, leaving: false } : { ...c, leaving: true }));
      const fresh = clusters.filter((c) => !prev.some((p) => p.key === c.key));
      return [...kept, ...fresh];
    });
  }, [clusters]);
  // Ausgeblendete nach der Zerfließ-Zeit entfernen
  useEffect(() => {
    if (!shown.some((c) => c.leaving)) return;
    const t = setTimeout(() => setShown((prev) => prev.filter((c) => !c.leaving)), 2600);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <>
      {shown.map((c) => (
        <Constellation key={c.key} c={c} leaving={!!c.leaving} />
      ))}
    </>
  );
}
