// Seegras-Bänder auf den Untiefen: instanzierte Halme, die im Strom wehen
// (Biegung ∝ Höhe², langsame Böen). Ein Draw-Call, deterministisch gestreut.

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SHOALS, depthAt } from "./seabed";
import { dayState, sampleDay } from "./daynight";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERT = /* glsl */ `
attribute float aPhase;
attribute float aSway;
uniform float uTime;
uniform float uBreeze;
varying float vY;
varying float vShade;

#include <fog_pars_vertex>

void main() {
  vY = uv.y;
  vec4 wp = instanceMatrix * vec4(position, 1.0);
  // Wehen: Biegung wächst mit der Höhe², Böen wandern als lange Welle
  float bend = pow(uv.y, 2.0) * aSway;
  float gust = sin(uTime * 0.9 + aPhase + wp.x * 0.14 + wp.z * 0.09)
             + 0.5 * sin(uTime * 1.7 + aPhase * 1.7);
  wp.x += bend * gust * uBreeze * 0.34;
  wp.z += bend * cos(uTime * 0.7 + aPhase) * uBreeze * 0.2;
  vShade = 0.75 + 0.25 * gust;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform vec3 uRoot;
uniform vec3 uTip;
uniform float uLight;
varying float vY;
varying float vShade;

#include <fog_pars_fragment>

void main() {
  vec3 col = mix(uRoot, uTip, vY) * vShade * uLight;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const BLADES_PER_SHOAL = 300;

export function Seagrass() {
  const { mesh, material } = useMemo(() => {
    const rng = mulberry32(20261010);
    const blade = new THREE.PlaneGeometry(0.15, 1.5, 1, 4);
    blade.translate(0, 0.75, 0);

    const mats: THREE.Matrix4[] = [];
    const phases: number[] = [];
    const sways: number[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    for (const s of SHOALS) {
      let placed = 0;
      let guard = 0;
      while (placed < BLADES_PER_SHOAL && guard++ < 4000) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * s.r * 0.85;
        const x = s.x + Math.cos(a) * r;
        const z = s.z + Math.sin(a) * r;
        const d = depthAt(x, z);
        if (d < 3.0 || d > 10.5) continue;
        // Halm bleibt UNTER Wasser: Spitze ~0.4 unter der Oberfläche gekappt
        const h = Math.min(0.6 + rng() * 1.1, (d - 0.4) / 1.5);
        eul.set((rng() - 0.5) * 0.22, rng() * Math.PI * 2, (rng() - 0.5) * 0.22);
        q.setFromEuler(eul);
        m.compose(new THREE.Vector3(x, -d - 0.05, z), q, new THREE.Vector3(1, h, 1));
        mats.push(m.clone());
        phases.push(rng() * Math.PI * 2);
        sways.push(0.6 + rng() * 0.8);
        placed++;
      }
    }
    const count = mats.length;

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = blade.index;
    geometry.attributes.position = blade.attributes.position;
    geometry.attributes.uv = blade.attributes.uv;
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
    geometry.setAttribute("aSway", new THREE.InstancedBufferAttribute(new Float32Array(sways), 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uBreeze: { value: 1 },
          uRoot: { value: new THREE.Color("#0f2c22") },
          uTip: { value: new THREE.Color("#2f6b4a") },
          uLight: { value: 1 },
        },
      ]),
    });

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) mesh.setMatrixAt(i, mats[i]);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.name = "ocean-seagrass";
    return { mesh, material };
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    const pal = sampleDay(dayState.phase);
    material.uniforms.uLight.value = THREE.MathUtils.clamp(0.55 + ((pal.exposure - 1.0) / 0.12) * 0.55, 0.5, 1.15);
    material.uniforms.uBreeze.value = 0.85 + 0.3 * Math.sin(clock.elapsedTime * 0.13);
  });

  return <primitive object={mesh} />;
}
