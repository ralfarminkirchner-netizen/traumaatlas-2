// Himmelssphäre im Tag/Nacht-Zyklus: EINE Lichtquelle (Sonne ↔ Mond) wandert
// über den Himmel; Farben, Sterne, Sonnenscheibe und Wolkenschleier folgen
// der Phase (daynight.ts). Kein Fog — die Sphäre trägt die Ferne selbst.

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { dayState, stepDay, sampleDay, celestialDirAt } from "./daynight";

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uCelDir;     // Richtung der aktiven Himmelslichtquelle
uniform vec3 uCelColor;   // deren Farbe (Mond warm-bleich, Sonne warm-weiß)
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uAmber;
uniform float uTime;
uniform float uStars;     // 0..1 Sterne (nur nachts)
uniform float uSunDisc;   // 0..1 Sonnenscheibe (nur tagsüber)
uniform float uClouds;    // 0..1 Wolkenschleier (tagsüber)
uniform float uLowSun;    // 1 am Horizont — Abendrot/Morgengrau-Verstärker

varying vec3 vDir;

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
  vec3 d = normalize(vDir);

  // Vertikaler Gradient
  float e = clamp(d.y, -0.08, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(clamp(e * 1.45, 0.0, 1.0), 0.62));

  // Horizontglühen um den Azimut der Lichtquelle — am Horizont breit und
  // warm (Abendrot/Morgengrau), hoch stehend schmal und still.
  vec2 az = normalize(d.xz + vec2(1e-5));
  vec2 maz = normalize(uCelDir.xz + vec2(1e-5));
  float azAlign = max(dot(az, maz), 0.0);
  float lowBand = pow(clamp(1.0 - abs(d.y) * 4.2, 0.0, 1.0), 2.6);
  float glowW = mix(4.5, 2.2, uLowSun);   // tiefe Sonne öffnet den Fächer
  float glowI = mix(0.38, 1.15, uLowSun); // …und heizt ihn ein
  col += uAmber * pow(azAlign, glowW) * lowBand * glowI;
  col += uAmber * mix(0.02, 0.07, uLowSun) * lowBand;

  // Sterne: sphärisches Raster, nur oberhalb des Horizonts, nur nachts
  if (d.y > 0.015 && uStars > 0.01) {
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
      col += vec3(0.86, 0.9, 1.0) * star * tw * (0.35 + bright * 1.05) * smoothstep(0.015, 0.09, d.y) * uStars;
    }
  }

  // Wolkenschleier tagsüber: zwei langsam treibende Oktaven, weich gemischt
  if (uClouds > 0.01 && d.y > 0.0) {
    vec2 cp = d.xz / max(d.y + 0.25, 0.12);
    float cn = vnoise(cp * 1.6 + vec2(uTime * 0.008, uTime * 0.003))
             * vnoise(cp * 3.7 - vec2(uTime * 0.005, uTime * 0.011));
    float veil = smoothstep(0.24, 0.62, cn) * uClouds * smoothstep(0.0, 0.12, d.y);
    col = mix(col, uHorizon * 1.18 + vec3(0.06), veil * 0.5);
  }

  // Lichtquelle: Sonnenscheibe (Tag) ↔ Mondscheibe (Nacht), gleiche Bahn
  float md = dot(d, uCelDir);
  float glow = pow(max(md, 0.0), 320.0) * 0.45 + pow(max(md, 0.0), 36.0) * 0.07;
  float moonDisc = smoothstep(0.99955, 0.99978, md) * (1.0 - uSunDisc) * 2.2;
  float sunDisc = smoothstep(0.9993, 0.99965, md) * uSunDisc * 2.6;
  float sunHalo = pow(max(md, 0.0), 90.0) * 0.5 * uSunDisc;
  col += uCelColor * (moonDisc + sunDisc + sunHalo + glow);

  // Dithering gegen Farbbänder im Verlauf
  col += (hash21(d.xy * 913.7 + d.z * 517.3) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ── Die eine Himmelslichtquelle (lebendig: wandert mit der Phase) ────────────
/** @deprecated Nur noch als Startwert — live kommt die Richtung aus daynight. */
export const CELESTIAL_DIR = new THREE.Vector3(-0.46, 0.061, -0.885).normalize();

const _dir = new THREE.Vector3();

export function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uCelDir: { value: CELESTIAL_DIR.clone() },
          uCelColor: { value: new THREE.Color("#f7e7c2") },
          uZenith: { value: new THREE.Color("#050a16") },
          uHorizon: { value: new THREE.Color("#0e1a26") },
          uAmber: { value: new THREE.Color("#b06f24") },
          uTime: { value: 0 },
          uStars: { value: 1 },
          uSunDisc: { value: 0 },
          uClouds: { value: 0.12 },
          uLowSun: { value: 0 },
        },
      }),
    [],
  );
  const geo = useMemo(() => new THREE.SphereGeometry(480, 48, 24), []);

  useFrame(({ clock }) => {
    stepDay(0); // Auto-Vorrücken macht OceanCanvas (DayLightBridge) — hier nur lesen
    const pal = sampleDay(dayState.phase);
    celestialDirAt(dayState.phase, _dir);
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime;
    (u.uCelDir.value as THREE.Vector3).copy(_dir);
    (u.uCelColor.value as THREE.Color).copy(pal.celestial);
    (u.uZenith.value as THREE.Color).copy(pal.zenith);
    (u.uHorizon.value as THREE.Color).copy(pal.horizon);
    (u.uAmber.value as THREE.Color).copy(pal.amber);
    u.uStars.value = pal.stars;
    u.uSunDisc.value = pal.sunDisc;
    u.uClouds.value = pal.clouds;
    // Abendrot/Morgengrau: Glühen öffnet, wenn die Quelle tief steht
    u.uLowSun.value = 1 - THREE.MathUtils.smoothstep(Math.abs(_dir.y), 0.02, 0.3);
  });

  return <mesh geometry={geo} material={material} frustumCulled={false} renderOrder={-10} name="sky-dome" />;
}
