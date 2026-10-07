// Nacht-Himmelssphäre: Zenith-Gradient, Amber-Horizontglühen in Mondrichtung,
// prozedurale Sterne mit sanftem Funkeln, Mondscheibe mit Hof.
// Kein Fog — die Sphäre trägt die Ferne selbst (Farben auf Nebelfarbe abgestimmt).

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uAmber;
uniform float uTime;

varying vec3 vDir;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 d = normalize(vDir);

  // Vertikaler Gradient
  float e = clamp(d.y, -0.08, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(clamp(e * 1.45, 0.0, 1.0), 0.62));

  // Amber-Horizontglühen, eng um den Mond-Azimut konzentriert
  vec2 az = normalize(d.xz + vec2(1e-5));
  vec2 maz = normalize(uMoonDir.xz);
  float azAlign = max(dot(az, maz), 0.0);
  float lowBand = pow(clamp(1.0 - abs(d.y) * 4.2, 0.0, 1.0), 2.6);
  col += uAmber * pow(azAlign, 4.5) * lowBand * 0.38;
  // schwaches Gegenlicht rund um den Horizont
  col += uAmber * 0.04 * lowBand;

  // Sterne: sphärisches Raster, nur oberhalb des Horizonts
  if (d.y > 0.015) {
    vec2 suv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.6366198);
    vec2 grid = suv * vec2(190.0, 95.0);
    vec2 cell = floor(grid);
    vec2 f = fract(grid);
    float h = hash21(cell);
    if (h > 0.965) {
      vec2 sp = vec2(hash21(cell + 7.13), hash21(cell + 3.71));
      float sd = length(f - sp);
      float star = smoothstep(0.18, 0.02, sd);
      float tw = 0.72 + 0.28 * sin(uTime * (0.6 + h * 2.2) + h * 97.0);
      float bright = (h - 0.965) / 0.035;
      col += vec3(0.86, 0.9, 1.0) * star * tw * (0.35 + bright * 1.05) * smoothstep(0.015, 0.09, d.y);
    }
  }

  // Mond: scharfe Scheibe + weicher Hof
  float md = dot(d, uMoonDir);
  float disc = smoothstep(0.99955, 0.99978, md);
  float glow = pow(max(md, 0.0), 320.0) * 0.45 + pow(max(md, 0.0), 36.0) * 0.07;
  col += uMoonColor * (disc * 2.2 + glow);

  // Dithering gegen Farbbänder im Verlauf
  col += (hash21(d.xy * 913.7 + d.z * 517.3) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const MOON_DIR = new THREE.Vector3(-0.46, 0.061, -0.885).normalize();

export function SkyDome() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uMoonDir: { value: MOON_DIR.clone() },
          uMoonColor: { value: new THREE.Color("#f7e7c2") },
          uZenith: { value: new THREE.Color("#050a16") },
          uHorizon: { value: new THREE.Color("#132230") },
          uAmber: { value: new THREE.Color("#b06f24") },
          uTime: { value: 0 },
        },
      }),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(480, 48, 24), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  void matRef;

  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={-10} name="sky-dome" />;
}
