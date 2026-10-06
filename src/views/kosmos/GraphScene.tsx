import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  EDGE_COLORS, buildEdgeIndex, buildSimNodes, clusterAnchor, shortLabel,
  type GraphMode,
} from "./layout";
import { PORTRAITS, PORTRAIT_NODE_IDS } from "./nodeAssets";
export type { GraphMode };

export interface HoverInfo {
  id: string;
  label: string;
  type: string;
}

interface GraphSceneProps {
  mode: GraphMode;
  themeId: string | null;
  hoverId: string | null;
  onHover: (info: HoverInfo | null) => void;
  focusId: string | null;
  onFocus: (id: string | null) => void;
  /** Pfad-Animation: Knoten-Ids, die nacheinander durchlaufen werden */
  pulsePath: string[] | null;
  pulseNonce: number;
  onPulseEnd: () => void;
}

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpAnchor = new THREE.Vector3();
const tmpColor = new THREE.Color();
const tmpObj = new THREE.Object3D();

/** Knoten-Typen mit permanentem Namens-Label */
const LABEL_TYPES = new Set(["discipline", "method", "state"]);

/** Canvas-Textur-Sprite für Knoten-Labels (keine Netzwerk-Abhängigkeit). */
function makeLabelSprite(text: string): THREE.Sprite {
  const scale = 2;
  const font = `${500} ${24 * scale}px Inter, "Inter Variable", system-ui, sans-serif`;
  const meas = document.createElement("canvas").getContext("2d")!;
  meas.font = font;
  const tw = Math.ceil(meas.measureText(text).width);
  const canvas = document.createElement("canvas");
  canvas.width = tw + 20 * scale;
  canvas.height = 40 * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(10, 8, 6, 0.72)";
  const r = 10 * scale;
  const h = 32 * scale, y0 = 4 * scale;
  ctx.beginPath();
  ctx.roundRect(2 * scale, y0, canvas.width - 4 * scale, h, r);
  ctx.fill();
  ctx.fillStyle = "#f3e7d3";
  ctx.fillText(text, 10 * scale, y0 + h / 2 + scale);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 2;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }),
  );
  const aspect = canvas.width / canvas.height;
  const H = 0.34; // Welthöhe des Labels
  sprite.scale.set(H * aspect, H, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export const GraphScene = memo(function GraphScene({
  mode, themeId, hoverId, onHover, focusId, onFocus, pulsePath, pulseNonce, onPulseEnd,
}: GraphSceneProps) {
  const reduced = useReducedMotion();
  const { camera } = useThree();

  const nodes = useMemo(buildSimNodes, []);
  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.data.id, i));
    return m;
  }, [nodes]);
  const edges = useMemo(() => buildEdgeIndex(idToIndex), [idToIndex]);

  // Nachbarschafts-Adjazenz (Indices)
  const adj = useMemo(() => {
    const a: number[][] = nodes.map(() => []);
    for (const e of edges) {
      a[e.from].push(e.to);
      a[e.to].push(e.from);
    }
    return a;
  }, [nodes, edges]);

  // Thema-Subgraph: 2-Hop-Nachbarschaft
  const themaSet = useMemo(() => {
    if (mode !== "thema" || !themeId) return null;
    const set = new Set<number>();
    const start = idToIndex.get(themeId);
    if (start === undefined) return null;
    set.add(start);
    for (const n of adj[start]) {
      set.add(n);
      for (const nn of adj[n]) set.add(nn);
    }
    return set;
  }, [mode, themeId, idToIndex, adj]);

  // ── Namens-Labels für zentrale Knotentypen ─────────────────
  const labels = useMemo(() => {
    const arr: (THREE.Sprite | null)[] = nodes.map((n) =>
      LABEL_TYPES.has(n.data.type) ? makeLabelSprite(shortLabel(n.data.id, n.data.label)) : null,
    );
    return arr;
  }, [nodes]);

  // ── Porträt-Medaillons für Schlüsselpersönlichkeiten ──────
  const portraits = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const arr: (THREE.Sprite | null)[] = nodes.map((n) => {
      if (!PORTRAIT_NODE_IDS.has(n.data.id)) return null;
      const url = PORTRAITS[n.data.id];
      if (!url) return null;
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }),
      );
      sprite.scale.set(1.05, 1.05, 1);
      sprite.renderOrder = 9;
      return sprite;
    });
    return arr;
  }, [nodes]);

  // ── Geometrien / Puffer ────────────────────────────────────
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pulseMeshRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(nodes.length * 3), 3));
    return g;
  }, [nodes]);

  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3));
    return g;
  }, [edges]);

  const pulseGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    return g;
  }, []);

  // Instanz-Farben initialisieren
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    nodes.forEach((n, i) => mesh.setColorAt(i, n.color));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Erscheinungs-Chronologie bei reduced motion sofort vollständig
  useEffect(() => {
    if (reduced) nodes.forEach((n) => (n.scaleNow = 1));
  }, [reduced, nodes]);

  // ── Simulations-State ──────────────────────────────────────
  const sim = useRef({ clock: 0, lastInteract: -10, pulseT: -1 });
  const focusVec = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // User-Interaktion am OrbitControls beobachten
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const onStart = () => (sim.current.lastInteract = sim.current.clock);
    c.addEventListener("start", onStart);
    return () => c.removeEventListener("start", onStart);
  }, [mode]);

  // Fokus-Ziel aktualisieren
  useEffect(() => {
    if (focusId) {
      const i = idToIndex.get(focusId);
      if (i !== undefined) focusVec.copy(nodes[i].pos);
    }
  }, [focusId, idToIndex, nodes, focusVec]);

  // Pfad-Animation starten
  useEffect(() => {
    if (pulsePath && pulsePath.length >= 2) sim.current.pulseT = 0;
  }, [pulsePath, pulseNonce]);

  const pulsePathIdx = useMemo(
    () => pulsePath?.map((id) => idToIndex.get(id)).filter((i): i is number => i !== undefined) ?? null,
    [pulsePath, idToIndex],
  );

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!reduced) sim.current.clock += delta;
    const { clock } = sim.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    const isConstellation = mode === "constellation" || mode === "thema";

    // ── Kraft-Physik (eigene Springs, kontrollierbar) ──────
    if (isConstellation && !reduced) {
      const n = nodes.length;
      // Abstossung O(n²) mit Cutoff
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          tmpV.subVectors(a.pos, b.pos);
          const d2 = tmpV.lengthSq();
          if (d2 > 12.25 || d2 < 1e-6) continue; // 3.5 Einheiten Cutoff
          const d = Math.sqrt(d2);
          const f = Math.min(0.35 / d2, 0.9) * 0.55;
          tmpV.multiplyScalar(f / d);
          a.vel.add(tmpV);
          b.vel.sub(tmpV);
        }
      }
      // Anker + Zentrum
      for (const node of nodes) {
        clusterAnchor(node.data.type, tmpAnchor);
        tmpV.subVectors(tmpAnchor, node.pos).multiplyScalar(0.012);
        node.vel.add(tmpV);
        node.vel.addScaledVector(node.pos, -0.004);
      }
      // Feder-Kräfte auf Kanten
      for (const e of edges) {
        const a = nodes[e.from];
        const b = nodes[e.to];
        tmpV.subVectors(b.pos, a.pos);
        const d = tmpV.length() || 0.001;
        const rest = (a.size + b.size) * 2.6 + 0.5;
        const stiff = e.type === "abstammung" || e.type === "fundierung" ? 0.05 : 0.025;
        tmpV.multiplyScalar(((d - rest) / d) * stiff);
        a.vel.add(tmpV);
        b.vel.sub(tmpV);
      }
      // Thema-Modus: Sichtbare nach innen, Rest nach aussen
      if (themaSet) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (themaSet.has(i)) node.vel.addScaledVector(node.pos, -0.02);
          else node.vel.addScaledVector(node.pos, 0.015);
        }
      }
      // Integration
      for (const node of nodes) {
        node.vel.multiplyScalar(0.86); // Dämpfung
        const sp = node.vel.length();
        if (sp > 0.35) node.vel.multiplyScalar(0.35 / sp);
        node.pos.addScaledVector(node.vel, delta * 3.2);
      }
    } else if (mode === "stammbaum" && !reduced) {
      // Weiche Migration in die Jahres-Rasterung
      for (const node of nodes) {
        node.pos.lerp(node.modePos, Math.min(1, delta * 2.2));
        node.vel.set(0, 0, 0);
      }
    }

    // ── Sichtbarkeit (Hover-Linse + Thema) ─────────────────
    const hoverIdx = hoverId ? idToIndex.get(hoverId) : undefined;
    const focusIdx = focusId ? idToIndex.get(focusId) : undefined;
    const lensActive = hoverIdx !== undefined || focusIdx !== undefined;
    const lensIdx = hoverIdx ?? focusIdx;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      // Erscheinen (Chronologie)
      if (!reduced && node.scaleNow < 1) {
        const t = Math.min(1, Math.max(0, (clock - node.appearAt) / 1.4));
        node.scaleNow = t * t * (3 - 2 * t); // smoothstep
      }
      let target = 1;
      if (mode === "thema" && themaSet && !themaSet.has(i)) target = 0.05;
      // Stammbaum: jahrbasierte Knoten fokussieren, Rest fast unsichtbar
      if (mode === "stammbaum" && nodes[i].data.year === undefined) target = Math.min(target, 0.05);
      if (lensActive) {
        const isLens = i === lensIdx;
        const isNeighbor = lensIdx !== undefined && adj[lensIdx].includes(i);
        // Fokus: Umgebung bleibt lesbar (kein leerer Raum); Hover: stärkeres Dimmen
        const rest = focusIdx !== undefined && !hoverId ? 0.32 : 0.12;
        target = Math.min(target, isLens ? 1 : isNeighbor ? 0.95 : rest);
      }
      node.dim += (target - node.dim) * Math.min(1, delta * 6);
    }

    // ── Instanced Mesh aktualisieren ───────────────────────
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const boost = i === hoverIdx ? 1.7 : i === focusIdx ? 1.5 : 1;
      const isPortrait = PORTRAIT_NODE_IDS.has(node.data.id);
      const s = isPortrait
        ? 0.0001
        : node.size * node.scaleNow * boost * (0.25 + 0.75 * node.dim);
      tmpObj.position.copy(node.pos);
      tmpObj.scale.setScalar(Math.max(s, 0.001));
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      tmpColor.copy(node.color).multiplyScalar(0.12 + 1.05 * node.dim * (i === hoverIdx ? 1.6 : 1));
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // ── Labels positionieren ───────────────────────────────
    for (let i = 0; i < nodes.length; i++) {
      const sprite = labels[i];
      if (!sprite) continue;
      const node = nodes[i];
      const boost = i === hoverIdx ? 1.7 : i === focusIdx ? 1.5 : 1;
      sprite.position.set(node.pos.x, node.pos.y + node.size * boost + 0.34, node.pos.z);
      const vis = node.scaleNow > 0.9 ? Math.min(1, node.dim * 1.15) : 0;
      const mat = sprite.material as THREE.SpriteMaterial;
      mat.opacity += (vis - mat.opacity) * Math.min(1, delta * 8);
    }

    // ── Porträt-Medaillons positionieren ───────────────────
    for (let i = 0; i < nodes.length; i++) {
      const sprite = portraits[i];
      if (!sprite) continue;
      const node = nodes[i];
      const boost = i === hoverIdx ? 1.22 : i === focusIdx ? 1.18 : 1;
      sprite.position.set(node.pos.x, node.pos.y, node.pos.z);
      const sc = 1.05 * boost * (0.25 + 0.75 * node.dim) * Math.max(node.scaleNow, 0.001);
      sprite.scale.set(sc, sc, 1);
      const mat = sprite.material as THREE.SpriteMaterial;
      const vis = node.scaleNow > 0.9 ? Math.min(1, node.dim * 1.2) : 0;
      mat.opacity += (vis - mat.opacity) * Math.min(1, delta * 8);
    }

    // ── Halos (Points) ─────────────────────────────────────
    const hp = haloGeo.attributes.position as THREE.BufferAttribute;
    const hc = haloGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      hp.setXYZ(i, node.pos.x, node.pos.y, node.pos.z);
      tmpColor.copy(node.color).multiplyScalar(node.dim * 0.5 * node.scaleNow);
      hc.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    hp.needsUpdate = true;
    hc.needsUpdate = true;

    // ── Kanten (LineSegments) ──────────────────────────────
    const ep = edgeGeo.attributes.position as THREE.BufferAttribute;
    const ec = edgeGeo.attributes.color as THREE.BufferAttribute;
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      ep.setXYZ(e * 2, a.pos.x, a.pos.y, a.pos.z);
      ep.setXYZ(e * 2 + 1, b.pos.x, b.pos.y, b.pos.z);
      const dim = Math.min(a.dim, b.dim);
      const hot =
        (hoverIdx !== undefined && (edge.from === hoverIdx || edge.to === hoverIdx)) ||
        (focusIdx !== undefined && (edge.from === focusIdx || edge.to === focusIdx));
      tmpColor.set(EDGE_COLORS[edge.type] ?? "#ffffff").multiplyScalar((hot ? 0.85 : 0.28) * dim * a.scaleNow);
      ec.setXYZ(e * 2, tmpColor.r, tmpColor.g, tmpColor.b);
      ec.setXYZ(e * 2 + 1, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    ep.needsUpdate = true;
    ec.needsUpdate = true;

    // ── Kamera-Verhalten ───────────────────────────────────
    const controls = controlsRef.current;
    if (controls) {
      if (focusId && lensIdx !== undefined && !reduced) {
        tmpV2.copy(nodes[lensIdx].pos);
        controls.target.lerp(tmpV2, Math.min(1, delta * 4));
        tmpV.subVectors(camera.position, controls.target);
        const deg = adj[lensIdx]?.length ?? 0;
        const want = 4.0 + Math.max(0, 1 - Math.min(deg, 8) / 8) * 3.4;
        if (tmpV.length() > want) {
          tmpV.setLength(tmpV.length() + (want - tmpV.length()) * Math.min(1, delta * 3));
          camera.position.copy(controls.target).add(tmpV);
        }
      } else if (mode === "thema" && themeId && !reduced) {
        // Kamera gleitet zum Thema-Knoten
        const ti = idToIndex.get(themeId);
        if (ti !== undefined) {
          tmpV2.copy(nodes[ti].pos);
          controls.target.lerp(tmpV2, Math.min(1, delta * 2.5));
          tmpV.subVectors(camera.position, controls.target);
          const want = 8.5;
          if (Math.abs(tmpV.length() - want) > 0.4) {
            tmpV.setLength(tmpV.length() + (want - tmpV.length()) * Math.min(1, delta * 2));
            camera.position.copy(controls.target).add(tmpV);
          }
        }
      } else if (mode === "stammbaum" && clock - sim.current.lastInteract > 4 && !reduced) {
        // Kamera entlang der Jahr-Linie
        const x = Math.sin(clock * 0.12) * 9;
        tmpV2.set(x, 0, 0);
        controls.target.lerp(tmpV2, Math.min(1, delta * 0.8));
        tmpV.set(x, 2.5, 15);
        camera.position.lerp(tmpV, Math.min(1, delta * 0.6));
      }
      controls.autoRotate = mode === "constellation" && !focusId && !reduced;
      controls.autoRotateSpeed = 0.35;
      controls.update();
    }

    // ── Pfad-Animation (Lichtpuls) ─────────────────────────
    const pulse = pulseMeshRef.current;
    if (pulse && pulsePathIdx && pulsePathIdx.length >= 2) {
      if (sim.current.pulseT >= 0) {
        sim.current.pulseT += delta / (pulsePathIdx.length * 1.15);
        const total = sim.current.pulseT;
        if (total >= 1) {
          sim.current.pulseT = -1;
          pulse.visible = false;
          onPulseEnd();
        } else {
          pulse.visible = true;
          const segCount = pulsePathIdx.length - 1;
          const seg = Math.min(segCount - 1, Math.floor(total * segCount));
          const segT = total * segCount - seg;
          const a = nodes[pulsePathIdx[seg]].pos;
          const b = nodes[pulsePathIdx[seg + 1]].pos;
          tmpV.lerpVectors(a, b, segT);
          pulse.position.copy(tmpV);
          const sc = 1 + 0.4 * Math.sin(total * Math.PI * segCount * 2);
          pulse.scale.setScalar(sc);
          // zurückgelegten Pfad als Lichtlinie zeichnen
          const pp = pulseGeo.attributes.position as THREE.BufferAttribute;
          const segsDraw = Math.floor(total * segCount * 10);
          let count = 0;
          for (let s = 0; s < seg; s++) {
            const na = nodes[pulsePathIdx[s]].pos;
            const nb = nodes[pulsePathIdx[s + 1]].pos;
            for (let k = 0; k < 10 && count < 64; k++, count++) {
              tmpV2.lerpVectors(na, nb, k / 10);
              pp.setXYZ(count, tmpV2.x, tmpV2.y, tmpV2.z);
            }
          }
          for (let k = 0; k <= (segsDraw % 10) && count < 64; k++, count++) {
            tmpV2.lerpVectors(a, b, k / 10);
            pp.setXYZ(count, tmpV2.x, tmpV2.y, tmpV2.z);
          }
          pp.needsUpdate = true;
          pulseGeo.setDrawRange(0, Math.max(count, 2));
        }
      } else {
        pulse.visible = false;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 8, 6]} intensity={40} color="#e2a35c" />
      <pointLight position={[-8, -4, -6]} intensity={25} color="#8fd8cf" />

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const i = e.instanceId;
          if (i === undefined) return;
          const d = nodes[i].data;
          if (d.id !== hoverId) {
            onHover({ id: d.id, label: d.label, type: d.type });
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          const i = e.instanceId;
          if (i === undefined) return;
          const d = nodes[i].data;
          onFocus(focusId === d.id ? null : d.id);
        }}
      >
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Halo-Schicht */}
      <points geometry={haloGeo}>
        <pointsMaterial
          size={0.85}
          vertexColors
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Kanten */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>

      {/* Lichtpuls für Pfad-Animation */}
      <mesh ref={pulseMeshRef} visible={false}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffe9c4" toneMapped={false} transparent opacity={0.95} />
      </mesh>
      <lineSegments geometry={pulseGeo}>
        <lineBasicMaterial color="#ffd9a0" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </lineSegments>

      <group>
        {labels.map((s, i) => (s ? <primitive key={i} object={s} /> : null))}
        {portraits.map((s, i) => (s ? <primitive key={`p${i}`} object={s} /> : null))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        enableZoom
        minDistance={2.5}
        maxDistance={30}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
});
