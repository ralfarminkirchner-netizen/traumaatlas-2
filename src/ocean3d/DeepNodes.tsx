// Tiefen-Knoten: state/phase/block/discipline aus dem atlasGraph leben als
// leuchtende Tiefsee-Formen um die Kosmos-Untiefe — nur beim Tauchen
// sichtbar (Sichtbarkeit = Tiefgang). Tiefer tauchen = tiefere Schichten
// (QuerLeser-Prinzip; das Lesen selbst kommt mit G).

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { atlasGraph, nodeTypeMeta, type NodeType } from "../data/graph";
import { ISLANDS } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { depthAt } from "./seabed";
import { diveState } from "./dive";

const DEEP_TYPES: NodeType[] = ["state", "phase", "block", "discipline"];

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uVis;
varying vec3 vColor;
varying float vGlow;

#include <fog_pars_vertex>

void main() {
  vColor = aColor;
  float pulse = 0.82 + 0.18 * sin(uTime * 0.8 + aPhase);
  vGlow = pulse;
  vec4 wp = instanceMatrix * vec4(position * pulse, 1.0);
  wp.y += sin(uTime * 0.45 + aPhase) * 0.14 * uVis;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uVis;
varying vec3 vColor;
varying float vGlow;

#include <fog_pars_fragment>

void main() {
  if (uVis < 0.01) discard;
  vec3 col = vColor * (0.7 + 0.9 * vGlow);
  gl_FragColor = vec4(col, uVis * 0.92);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function DeepNodes() {
  const { mesh, material, count } = useMemo(() => {
    const nodes = atlasGraph.nodes.filter((n) => DEEP_TYPES.includes(n.type));
    const kosmos = ISLANDS.find((i) => i.id === "kosmos") ?? ISLANDS[0];
    const cx = w2x(kosmos.x);
    const cz = w2z(kosmos.y);

    const geo = new THREE.IcosahedronGeometry(0.16, 0);
    const igeo = new THREE.InstancedBufferGeometry();
    igeo.index = geo.index;
    igeo.attributes.position = geo.attributes.position;
    igeo.attributes.uv = geo.attributes.uv;

    const colors = new Float32Array(nodes.length * 3);
    const phases = new Float32Array(nodes.length);
    const mats: THREE.Matrix4[] = [];
    const c = new THREE.Color();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    const golden = Math.PI * (3 - Math.sqrt(5));
    nodes.forEach((n, i) => {
      const meta = nodeTypeMeta[n.type];
      c.set(meta?.color ?? "#9fd8cf");
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      phases[i] = i * 1.37;
      // Goldener-Winkel-Spirale um die Kosmos-Untiefe — Höhe relativ zum
      // lokalen Boden, nie darunter (Platte kann bis −1.4 ansteigen)
      const a = i * golden;
      const r = 9 + 1.35 * Math.sqrt(i) * 2.2;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const y = -depthAt(x, z) + 0.45 + (i % 5) * 0.4;
      eul.set(i * 0.7, i * 1.1, i * 0.4);
      q.setFromEuler(eul);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      mats.push(m.clone());
    });
    igeo.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
    igeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      transparent: true,
      depthWrite: false,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uTime: { value: 0 }, uVis: { value: 0 } },
      ]),
    });

    const mesh = new THREE.InstancedMesh(igeo, material, nodes.length);
    for (let i = 0; i < mats.length; i++) mesh.setMatrixAt(i, mats[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.name = "ocean-deepnodes";
    return { mesh, material, count: nodes.length };
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    // Sichtbarkeit folgt dem Tiefgang: erst ab halber Tauchtiefe, weich
    const vis = THREE.MathUtils.smoothstep(diveState.sub, 0.3, 0.85) * (0.35 + 0.65 * diveState.depth);
    material.uniforms.uVis.value = vis;
  });

  void count;
  return <primitive object={mesh} />;
}
