import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { nodeTypeMeta, type NodeType } from "@/data/graph";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { EDGE_COLORS, buildEdgeIndex, buildSimNodes, shortLabel, type GraphMode } from "./layout";
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
  visibleTypes?: NodeType[] | null;
  pulsePath: string[] | null;
  pulseNonce: number;
  onPulseEnd: () => void;
}

type Rect = { left: number; top: number; right: number; bottom: number };
type Label = {
  sprite: THREE.Sprite;
  width: number;
  height: number;
  position: THREE.Vector3;
  nodeIndex: number;
  type: NodeType;
};

function intersects(a: Rect, b: Rect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Namen bleiben in Bildschirm-Pixeln lesbar, unabhängig vom Kartenmaßstab. */
function makeLabel(text: string, group: boolean, position: THREE.Vector3, nodeIndex: number, type: NodeType): Label {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `${group ? 600 : 500} 28px Inter, system-ui, sans-serif`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 32;
  canvas.height = 48;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(14, 13, 21, 0.86)";
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
  ctx.fill();
  ctx.fillStyle = group ? nodeTypeMeta[type].color : "#f3e7d3";
  ctx.fillText(text, 16, 25);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  sprite.visible = false;
  sprite.renderOrder = 10;
  sprite.raycast = () => {};
  return { sprite, width: canvas.width / 2, height: canvas.height / 2, position, nodeIndex, type };
}

export const GraphScene = memo(function GraphScene({
  mode, themeId, hoverId, onHover, focusId, onFocus, visibleTypes = null,
  pulsePath, pulseNonce, onPulseEnd,
}: GraphSceneProps) {
  const { camera, size } = useThree();
  const reduced = useReducedMotion();
  const nodes = useMemo(() => buildSimNodes(), []);
  const index = useMemo(() => new Map(nodes.map((n, i) => [n.data.id, i])), [nodes]);
  const edges = useMemo(() => buildEdgeIndex(index), [index]);
  const adjacent = useMemo(() => {
    const result = nodes.map(() => new Set<number>());
    edges.forEach(({ from, to }) => { result[from].add(to); result[to].add(from); });
    return result;
  }, [nodes, edges]);
  const positions = useMemo(() => nodes.map((n) => mode === "stammbaum" ? n.modePos : n.pos), [nodes, mode]);
  const focusIndex = focusId ? index.get(focusId) ?? -1 : -1;
  const hoverIndex = hoverId ? index.get(hoverId) ?? -1 : -1;
  const themeSet = useMemo(() => {
    if (mode !== "thema" || !themeId || !index.has(themeId)) return null;
    const selected = index.get(themeId)!;
    const result = new Set([selected, ...adjacent[selected]]);
    [...result].forEach((i) => adjacent[i].forEach((neighbor) => result.add(neighbor)));
    return result;
  }, [mode, themeId, index, adjacent]);
  const visible = useMemo(() => {
    const types = visibleTypes === null ? null : new Set(visibleTypes);
    return nodes.map((n, i) => (
      (focusIndex === i || (focusIndex >= 0 && adjacent[focusIndex].has(i))) ||
      ((!types || types.has(n.data.type)) && (!themeSet || themeSet.has(i)))
    ));
  }, [nodes, visibleTypes, focusIndex, adjacent, themeSet]);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const points = new Float32Array(edges.length * 6);
    edges.forEach(({ from, to }, i) => {
      positions[from].toArray(points, i * 6);
      positions[to].toArray(points, i * 6 + 3);
    });
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3));
    return geometry;
  }, [edges, positions]);

  // Die Instanzen ändern nur Sichtbarkeit/Farbe, niemals die Lage im Graphen.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    nodes.forEach((n, i) => {
      const related = focusIndex < 0 || focusIndex === i || adjacent[focusIndex].has(i);
      object.position.copy(positions[i]);
      object.scale.setScalar(visible[i] ? n.size * (i === focusIndex ? 1.12 : 1) : 0);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
      color.copy(n.color).multiplyScalar(related ? 1 : 0.3);
      if (i === hoverIndex) color.lerp(new THREE.Color("#fff4df"), 0.25);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const edgePositions = edgeGeometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = edgeGeometry.getAttribute("color") as THREE.BufferAttribute;
    let edgeCount = 0;
    edges.forEach(({ from, to, type }) => {
      if (!visible[from] || !visible[to]) return;
      const incident = from === focusIndex || to === focusIndex;
      const strength = focusIndex < 0 ? 0.32 : incident ? 0.9 : 0.06;
      color.set(EDGE_COLORS[type] ?? "#9aa8c7").multiplyScalar(strength);
      const first = edgeCount * 2;
      edgePositions.setXYZ(first, positions[from].x, positions[from].y, positions[from].z);
      edgePositions.setXYZ(first + 1, positions[to].x, positions[to].y, positions[to].z);
      colors.setXYZ(first, color.r, color.g, color.b);
      colors.setXYZ(first + 1, color.r, color.g, color.b);
      edgeCount++;
    });
    edgeGeometry.setDrawRange(0, edgeCount * 2);
    edgePositions.needsUpdate = true;
    colors.needsUpdate = true;
  }, [nodes, positions, visible, focusIndex, hoverIndex, adjacent, edges, edgeGeometry]);

  const labels = useMemo(() => {
    const result = nodes.map((n, i) => makeLabel(shortLabel(n.data.id, n.data.label), false, positions[i], i, n.data.type));
    if (mode !== "stammbaum") {
      const types = [...new Set(nodes.map((n) => n.data.type))];
      types.forEach((type) => {
        const indices = nodes.flatMap((n, i) => n.data.type === type ? [i] : []);
        const center = new THREE.Vector3();
        indices.forEach((i) => center.add(positions[i]));
        center.divideScalar(indices.length);
        center.y = Math.max(...indices.map((i) => positions[i].y)) + 1.8;
        result.push(makeLabel(nodeTypeMeta[type].label, true, center, -1, type));
      });
    }
    return result;
  }, [nodes, positions, mode]);
  const candidates = useMemo(() => labels.filter((label) => {
    const i = label.nodeIndex;
    if (i < 0) return focusIndex < 0 && nodes.some((n, j) => n.data.type === label.type && visible[j]);
    if (!visible[i]) return false;
    if (focusIndex >= 0) return i === focusIndex || adjacent[focusIndex].has(i) || i === hoverIndex;
    return i === hoverIndex || visibleTypes !== null || mode === "stammbaum";
  }).sort((a, b) => {
    const priority = (label: Label) => label.nodeIndex === focusIndex && focusIndex >= 0 ? 0 :
      label.nodeIndex === hoverIndex && hoverIndex >= 0 ? 1 : label.nodeIndex < 0 ? 2 : 3;
    return priority(a) - priority(b) || a.nodeIndex - b.nodeIndex;
  }), [labels, visible, visibleTypes, focusIndex, hoverIndex, adjacent, nodes, mode]);
  const labelDirty = useRef(true);
  const previousView = useRef<number[]>([]);
  useLayoutEffect(() => { labelDirty.current = true; }, [candidates, positions, visible]);
  useEffect(() => () => labels.forEach(({ sprite }) => {
    const material = sprite.material as THREE.SpriteMaterial;
    material.map?.dispose();
    material.dispose();
  }), [labels]);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  // Einmal passend einrahmen. Hover und Linsen lösen keine Kamerafahrt aus.
  const lastFit = useRef<{ mode: GraphMode; focus: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;
    const sameViewport = lastFit.current?.width === size.width && lastFit.current?.height === size.height;
    if (lastFit.current?.mode === mode && sameViewport) {
      if (focusIndex < 0) {
        lastFit.current.focus = -1;
        return;
      }
      if (lastFit.current.focus === focusIndex) return;
    }
    const indices = focusIndex >= 0 ? [focusIndex, ...adjacent[focusIndex]] : nodes.map((_, i) => i);
    const bounds = new THREE.Box3();
    indices.forEach((i) => bounds.expandByPoint(positions[i]));
    const center = bounds.getCenter(new THREE.Vector3());
    const direction = camera.position.clone().sub(controls.target).normalize();
    if (!direction.lengthSq()) direction.set(0, 0, 1);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    let width = 0, height = 0, depth = 0;
    indices.forEach((i) => {
      const relative = positions[i].clone().sub(center);
      width = Math.max(width, Math.abs(relative.dot(right)) + 1.5);
      height = Math.max(height, Math.abs(relative.dot(up)) + 1.5);
      depth = Math.max(depth, Math.abs(relative.dot(direction)));
    });
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const aspect = Math.max(0.25, size.width / Math.max(1, size.height));
    const distance = Math.max(8, Math.max(height / tangent, width / (tangent * aspect)) * 1.12 + depth + 2);
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.far = Math.max(500, distance * 4);
    camera.updateProjectionMatrix();
    controls.update();
    lastFit.current = { mode, focus: focusIndex, width: size.width, height: size.height };
    labelDirty.current = true;
  }, [camera, mode, focusIndex, nodes, positions, adjacent, size.width, size.height]);

  // Ein explizit angeforderter Pfad bleibt kompatibel, startet nie von selbst.
  const pulseIndices = useMemo(() => (pulsePath ?? []).flatMap((id) => index.has(id) ? [index.get(id)!] : []), [pulsePath, index]);
  const pulseTime = useRef(0);
  const pulseRunning = useRef(false);
  useEffect(() => {
    pulseTime.current = 0;
    pulseRunning.current = !reduced && pulseIndices.length > 1;
    if (pulseRef.current) pulseRef.current.visible = pulseRunning.current;
    if (reduced && pulseIndices.length > 1) onPulseEnd();
  }, [pulseIndices, pulseNonce, reduced, onPulseEnd]);

  useFrame((_, delta) => {
    if (pulseRunning.current && pulseRef.current) {
      pulseTime.current += Math.min(delta, 0.1) / 1.15;
      const segment = Math.floor(pulseTime.current);
      if (segment >= pulseIndices.length - 1) {
        pulseRunning.current = false;
        pulseRef.current.visible = false;
        onPulseEnd();
      } else {
        pulseRef.current.position.copy(positions[pulseIndices[segment]])
          .lerp(positions[pulseIndices[segment + 1]], pulseTime.current - segment);
      }
    }
    camera.updateMatrixWorld();
    const view = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements, size.width, size.height];
    if (!labelDirty.current && view.every((value, i) => Math.abs(value - previousView.current[i]) < 0.00001)) return;
    previousView.current = view;
    labelDirty.current = false;
    labels.forEach(({ sprite }) => { sprite.visible = false; });
    if (!(camera instanceof THREE.PerspectiveCamera) || size.width <= 0 || size.height <= 0) return;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const pixelsAt = (position: THREE.Vector3) => 2 * Math.max(0.1, position.clone().sub(camera.position).dot(forward)) * tangent / size.height;
    const nodeRects = nodes.flatMap((n, i) => {
      if (!visible[i]) return [];
      const point = positions[i].clone().project(camera);
      if (point.z < -1 || point.z > 1) return [];
      const x = (point.x + 1) * size.width / 2, y = (1 - point.y) * size.height / 2;
      const radius = Math.max(4, n.size / pixelsAt(positions[i])) + 2;
      return [{ i, left: x - radius, top: y - radius, right: x + radius, bottom: y + radius }];
    });
    const occupied: Rect[] = [];
    const limit = Math.min(64, Math.max(12, Math.floor(size.width * size.height / 5600)));
    for (const label of candidates) {
      if (occupied.length >= limit) break;
      const point = label.position.clone().project(camera);
      if (point.z < -1 || point.z > 1) continue;
      const x = (point.x + 1) * size.width / 2, y = (1 - point.y) * size.height / 2;
      const pixel = pixelsAt(label.position);
      const radius = label.nodeIndex >= 0 ? nodes[label.nodeIndex].size / pixel + 7 : 0;
      const vertical = radius + label.height / 2 + 3, horizontal = radius + label.width / 2 + 3;
      const offsets = label.nodeIndex < 0 ? [[0, 0], [0, -28], [0, 28]] :
        [[0, -vertical], [0, vertical], [horizontal, 0], [-horizontal, 0], [horizontal, -vertical], [-horizontal, -vertical]];
      for (const [dx, dy] of offsets) {
        const rect = { left: x + dx - label.width / 2 - 3, right: x + dx + label.width / 2 + 3,
          top: y + dy - label.height / 2 - 3, bottom: y + dy + label.height / 2 + 3 };
        if (rect.left < 8 || rect.right > size.width - 8 || rect.top < 8 || rect.bottom > size.height - 8) continue;
        if (occupied.some((other) => intersects(rect, other)) || nodeRects.some((other) => other.i !== label.nodeIndex && intersects(rect, other))) continue;
        label.sprite.position.copy(label.position).addScaledVector(right, dx * pixel).addScaledVector(up, -dy * pixel);
        label.sprite.scale.set(label.width * pixel, label.height * pixel, 1);
        label.sprite.visible = true;
        occupied.push(rect);
        break;
      }
    }
  });

  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, nodes.length]} frustumCulled={false}
        onPointerMove={(event) => {
          const i = event.instanceId;
          if (i === undefined || !visible[i]) return;
          event.stopPropagation();
          const node = nodes[i].data;
          if (hoverId !== node.id) onHover({ id: node.id, label: node.label, type: node.type });
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
        onClick={(event) => {
          const i = event.instanceId;
          if (i === undefined || !visible[i]) return;
          event.stopPropagation();
          onFocus(focusId === nodes[i].data.id ? null : nodes[i].data.id);
        }}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={edgeGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.65} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ffe9c4" toneMapped={false} />
      </mesh>
      <group>{labels.map(({ sprite }, i) => <primitive key={i} object={sprite} />)}</group>
      <OrbitControls ref={controlsRef} makeDefault enablePan enableZoom enableRotate
        autoRotate={false} enableDamping={false} minDistance={3} maxDistance={400} />
    </>
  );
});
