// Kielwasser: echte Schaum-Fahne hinter der Kamera beim Segeln.
// Ringpuffer der Bodenposition, Ribbon-Mesh (Triangle-Strip) mit Age-Fade:
// Breite wächst mit dem Alter, Alpha klingt ab, Schaum-Noise im Fragment.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getOceanState } from "../ocean/world";
import { w2x, w2z } from "./coords";
import { waveHeight } from "./waves";
import { projStore } from "./projStore";

const MAX = 30;          // Samples im Ringpuffer
const MAX_AGE = 5.2;     // Sekunden bis zur vollen Auflösung
const MIN_STEP = 0.45;   // Mindestdistanz zwischen Samples (Welteinheiten)

const VERT = /* glsl */ `
attribute float aAge;   // 0 = frisch, 1 = ausgeklingt
attribute float aEdge;  // -1 / +1 Bandkante
varying float vAge;
varying float vEdge;
varying vec2 vUvW;
#include <fog_pars_vertex>
void main() {
  vAge = aAge;
  vEdge = aEdge;
  vUvW = position.xz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying float vAge;
varying float vEdge;
varying vec2 vUvW;
#include <fog_pars_fragment>

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Mitte dicht, Ränder weich; Schaum-Noise bricht die Fläche auf
  float body = 1.0 - abs(vEdge);
  float foam = vnoise(vUvW * 2.6 + uTime * 0.15) * vnoise(vUvW * 6.4 - uTime * 0.1);
  float alpha = body * (1.0 - vAge) * (0.5 + 0.5 * smoothstep(0.12, 0.5, foam));
  alpha *= 0.9;
  if (alpha < 0.004) discard;
  vec3 col = vec3(0.82, 0.88, 0.86);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

interface Sample { x: number; z: number; t: number }

export function WakeRibbon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const samples = useRef<Sample[]>([]);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX * 2 * 3);
    const ages = new Float32Array(MAX * 2);
    const edges = new Float32Array(MAX * 2);
    const indices: number[] = [];
    for (let i = 0; i < MAX - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute("aEdge", new THREE.BufferAttribute(edges, 1));
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
    });
    return { geometry, material };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    const s = getOceanState();
    const list = samples.current;

    // Samples nur beim Segeln; bei Stillstand klingt die Fahne aus
    if (s.sailing && !s.view) {
      const x = w2x(s.cam.x);
      const z = w2z(s.cam.y);
      const last = list[list.length - 1];
      if (!last || Math.hypot(x - last.x, z - last.z) > MIN_STEP) {
        list.push({ x, z, t });
        if (list.length > MAX) list.shift();
      }
    }
    // alte Samples entfernen
    while (list.length && t - list[0].t > MAX_AGE) list.shift();

    const n = list.length;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const age = geometry.attributes.aAge as THREE.BufferAttribute;
    const edge = geometry.attributes.aEdge as THREE.BufferAttribute;
    if (n < 2) {
      geometry.setDrawRange(0, 0);
      return;
    }

    const calm = projStore.calm;
    for (let i = 0; i < n; i++) {
      const smp = list[i];
      const prev = list[Math.max(0, i - 1)];
      const next = list[Math.min(n - 1, i + 1)];
      // Richtung + senkrechte Spreizung
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl;
      dz /= dl;
      const a = (t - smp.t) / MAX_AGE; // 0 frisch → 1 alt
      const half = (0.5 + a * 2.2) * 0.5;
      const y = waveHeight(smp.x, smp.z, t, calm) + 0.06;
      // links / rechts
      pos.setXYZ(i * 2, smp.x - dz * half, y, smp.z + dx * half);
      pos.setXYZ(i * 2 + 1, smp.x + dz * half, y, smp.z - dx * half);
      age.setX(i * 2, a);
      age.setX(i * 2 + 1, a);
      edge.setX(i * 2, -1);
      edge.setX(i * 2 + 1, 1);
    }
    pos.needsUpdate = true;
    age.needsUpdate = true;
    edge.needsUpdate = true;
    geometry.setDrawRange(0, (n - 1) * 6);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={2}
      name="wake-ribbon"
    />
  );
}
