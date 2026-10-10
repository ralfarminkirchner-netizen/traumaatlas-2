// Der Meeresboden: Geometrie aus dem Tiefenfeld (seabed.ts), Farbrampe
// Sand → Fels → Abgrund, Caustics-Lichtnetz (stärker bei Tag, still bei
// Nacht), lebendiges Schimmern. Durch die Oberfläche durchschimmernd auf
// den Untiefen; beim Tauchen die Bühne der Tiefenschichten.

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { depthAt, getDepthTexture, SHALLOW_MAX, WORLD_EXTENT } from "./seabed";
import { dayState, sampleDay, celestialDirAt } from "./daynight";
import { diveState } from "./dive";

const VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;

#include <fog_pars_vertex>

void main() {
  // Geometrie ist CPU-seitig aus dem Tiefenfeld verformt (robust überall —
  // kein Vertex-Textur-Fetch nötig); Normalen kommen aus der Geometrie.
  vWorldPos = position;
  vNormal = normal;
  vDepth = -position.y;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform vec3 uSand;
uniform vec3 uRock;
uniform vec3 uAbyss;
uniform vec3 uCelColor;
uniform float uCausticI;   // Stärke des Lichtnetzes (Tag stark, Nacht still)
uniform float uLight;      // Gesamt-Helligkeit (Phase)
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vDepth;

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
  // Farbrampe: sandige Untiefen → Fels → Abgrund
  float rockM = smoothstep(4.5, 8.5, vDepth);
  float abyssM = smoothstep(9.0, 15.0, vDepth);
  vec3 col = mix(uSand, uRock, rockM);
  col = mix(col, uAbyss, abyssM);

  // Körnung + wehende Algen-Tupfer auf dem Sand (kein Kitsch: dunkelgrün)
  float grain = vnoise(vWorldPos.xz * 2.1) * 0.5 + vnoise(vWorldPos.xz * 6.3) * 0.5;
  col *= 0.82 + 0.36 * grain;
  float algae = smoothstep(0.62, 0.86, vnoise(vWorldPos.xz * 0.16 + vec2(4.7, 9.1)));
  col = mix(col, col * vec3(0.62, 1.05, 0.78), algae * (1.0 - rockM) * 0.5);

  // Hang-Schatten
  float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);
  col *= 1.0 - slope * 0.55;

  // Caustics-Lichtnetz (wie im Wasser: zwei gegenläufige Oktaven), auf den
  // Untiefen, von der Relief-Normale moduliert — der Boden atmet Licht.
  float cMask = smoothstep(${(SHALLOW_MAX + 1.5).toFixed(1)}, 3.5, vDepth);
  float c1 = vnoise(vWorldPos.xz * 0.55 + uTime * 0.035);
  float c2 = vnoise(vWorldPos.xz * 0.8 - uTime * 0.026);
  float caustic = pow(c1 * c2 * 1.85, 2.3);
  col += uCelColor * caustic * cMask * uCausticI * clamp(vNormal.y, 0.3, 1.0) * 1.3;

  col *= uLight;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const _celDir = new THREE.Vector3();

export function Seabed() {
  const { geometry, material } = useMemo(() => {
    // CPU-Verformung aus dem Tiefenfeld: robust auf jedem Gerät, einmalig
    const geometry = new THREE.PlaneGeometry(WORLD_EXTENT, WORLD_EXTENT, 160, 160);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, -depthAt(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uSand: { value: new THREE.Color("#3a4f46") },
          uRock: { value: new THREE.Color("#1a2930") },
          uAbyss: { value: new THREE.Color("#04080e") },
          uCelColor: { value: new THREE.Color("#f7e7c2") },
          uCausticI: { value: 0.2 },
          uLight: { value: 1.0 },
          uTime: { value: 0 },
        },
      ]),
    });
    return { geometry, material };
  }, []);

  useFrame(({ clock }) => {
    const pal = sampleDay(dayState.phase);
    celestialDirAt(dayState.phase, _celDir);
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    (u.uCelColor.value as THREE.Color).copy(pal.celestial);
    // Caustics: Sonne treibt sie, Mond nur als leises Netz — gedeckelt,
    // damit die Untiefe nie zur überbelichteten Fläche kippt
    u.uCausticI.value = (0.14 + 0.86 * Math.max(_celDir.y, 0) * (pal.sunDisc > 0.5 ? 1 : 0.35)) * 0.55;
    // Boden-Helligkeit: nachts gedämpft, tagsüber geliftet — unter Wasser
    // zusätzlich abgedunkelt (Wasserkörper schluckt Licht)
    u.uLight.value = THREE.MathUtils.clamp(0.75 + ((pal.exposure - 1.0) / 0.12) * 0.4, 0.7, 1.2) * (1 - 0.32 * diveState.sub);
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      frustumCulled={false}
      name="ocean-seabed"
      renderOrder={-5}
    />
  );
}
