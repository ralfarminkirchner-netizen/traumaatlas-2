// Das Wasser: tessellierte Plane + Gerstner-Verdrängung + planare Echtzeit-Reflexion.
// Reflexion: gespiegelte Kamera → RenderTarget, projektives Sampling mit
// Wellen-Distortion, obliquer Near-Clip an der Wasserebene (y=0).

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GERSTNER_GLSL, RIPPLE_COUNT, RIPPLE_GLSL } from "./waves";
import { registerRipple3D } from "./projStore";
import { w2x, w2z, S } from "./coords";
import { projStore } from "./projStore";
import { MOON_DIR } from "./SkyDome";
import { ISLANDS } from "../ocean/world";

// ── Shader ───────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
${GERSTNER_GLSL}
${RIPPLE_GLSL}

uniform mat4 uTextureMatrix;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vRefl;
varying float vCrest;
varying float vRingFoam;

#include <fog_pars_vertex>

void main() {
  vec3 nrm;
  float crest;
  vec3 p = gerstner(position.xz, nrm, crest);

  float ringFoam;
  float rh = rippleHeight(position.xz, ringFoam);
  p.y += rh;

  vWorldPos = p;
  vNormal = nrm;
  vCrest = crest;
  vRingFoam = ringFoam;
  vRefl = uTextureMatrix * vec4(p, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform sampler2D tReflect;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFoamColor;
uniform float uDetail; // Stärke der Detail-Normals (distanzgesteuert)
uniform float uTime;
uniform float uSheen;  // 0 = nah, 1 = Übersicht: breite Mondschein-Bahn
uniform vec2 uMoonAz;  // normierter Mond-Azimut (xz-Ebene)
// Farbiges Lichtfeld: 10 Kapitel-Formationen (statisch) + bis zu 14 Bojen (dynamisch)
uniform vec4 uPools[10];    // x, z, radius, grundintensität
uniform vec3 uPoolColor[10];
uniform vec4 uBuoys[14];    // x, z, radius, intensität (pro Frame)
uniform vec3 uBuoyColor[14];
uniform int uBuoyCount;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec4 vRefl;
varying float vCrest;
varying float vRingFoam;

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
vec2 ngrad(vec2 p) {
  float e = 0.4;
  return vec2(
    vnoise(p + vec2(e, 0.0)) - vnoise(p - vec2(e, 0.0)),
    vnoise(p + vec2(0.0, e)) - vnoise(p - vec2(0.0, e))
  ) / (2.0 * e);
}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Detail-Normals: zwei scrollende Noise-Oktaven, mit Distanz abklingend
  float dist = length(cameraPosition - vWorldPos);
  float detFade = uDetail * smoothstep(140.0, 22.0, dist);
  vec2 g1 = ngrad(vWorldPos.xz * 0.5 + uTime * 0.055);
  vec2 g2 = ngrad(vWorldPos.xz * 1.9 - uTime * 0.08);
  vec3 N = normalize(vec3(
    vNormal.x - (g1.x * 0.17 + g2.x * 0.075) * detFade,
    1.0,
    vNormal.z - (g1.y * 0.17 + g2.y * 0.075) * detFade
  ));

  // Fresnel (Schlick)
  float f = 0.02 + 0.98 * pow(1.0 - max(dot(V, N), 0.0), 5.0);

  // Planare Reflexion, projektiv + Wellen-Distortion.
  // Edge-Maske: außerhalb des Spiegel-Frustums kein Clamp-Smear.
  vec2 ruvRaw = vRefl.xy / max(vRefl.w, 1e-4);
  ruvRaw += N.xz * 0.034;
  vec2 inEdge = smoothstep(0.0, 0.05, ruvRaw) * (1.0 - smoothstep(0.95, 1.0, ruvRaw));
  float reflMask = inEdge.x * inEdge.y;
  vec2 ruv = clamp(ruvRaw, vec2(0.002), vec2(0.998));
  vec3 refl = texture2D(tReflect, ruv).rgb;

  // Tiefe/Untiefe: Kämme heller, Täler schwarzblau
  float heightMix = clamp(vWorldPos.y * 1.4 + 0.35, 0.0, 1.0);
  vec3 waterBody = mix(uDeepColor, uShallowColor, heightMix * 0.55);

  // Wasserkörper + Reflexion über Fresnel; leichter Indigo-Ambientlift,
  // damit die Schattenseite nie zu Plastik-Schwarz kippt.
  // Reflexions-Basis niedrig: aus der Höhe kein heller Horizont-Wash.
  vec3 col = mix(waterBody, refl, clamp(f * 1.25 + 0.15, 0.0, 1.0) * reflMask);
  col += vec3(0.045, 0.07, 0.11) * (1.0 - f) * 0.55;

  // Mondspekular + Glitzerpfad
  vec3 H = normalize(V + uMoonDir);
  float dh = max(dot(N, H), 0.0);
  float sparkle = vnoise(vWorldPos.xz * 6.5 + uTime * 0.9);
  float spec = pow(dh, 1400.0) * (0.45 + 0.95 * sparkle);
  spec += pow(dh, 110.0) * 0.10;
  col += uMoonColor * spec;
  // Übersichts-Sheen: weiche Mondbahn — nur in Blickrichtung des Mondes
  float dhBroad = max(dot(normalize(vNormal), H), 0.0);
  vec2 viewAz = normalize(vWorldPos.xz - cameraPosition.xz + vec2(1e-4));
  float azAlign = max(dot(viewAz, uMoonAz), 0.0);
  col += uMoonColor * pow(dhBroad, 26.0) * uSheen * 0.15 * (0.2 + 0.8 * azAlign * azAlign);

  // ── Farbiges Lichtfeld: Kapitel-Pools + Bojen-Lichter ──
  // Die Wellen fangen das Licht: dem Licht zugewandte Flanken und Kämme
  // glänzen stärker — das Feld lebt mit dem Wellengang.
  float shim = 0.6 + 0.4 * vnoise(vWorldPos.xz * 2.2 + uTime * 0.35);
  vec3 field = vec3(0.0);
  for (int i = 0; i < 10; i++) {
    vec4 P = uPools[i];
    vec2 d = vWorldPos.xz - P.xy;
    float d2 = dot(d, d);
    float fall = exp(-d2 / max(P.z * P.z, 0.01));
    vec2 dn = d * inversesqrt(max(d2, 0.01));
    float facing = 0.5 + 0.5 * max(dot(-N.xz, dn) * 1.7, 0.0);
    field += uPoolColor[i] * P.w * fall * facing;
  }
  for (int i = 0; i < 14; i++) {
    if (i >= uBuoyCount) break;
    vec4 B = uBuoys[i];
    vec2 d = vWorldPos.xz - B.xy;
    float fall = exp(-dot(d, d) / max(B.z * B.z, 0.01));
    field += uBuoyColor[i] * B.w * fall;
  }
  float crestLift = clamp(vWorldPos.y * 1.5 + 0.55, 0.0, 1.0);
  col += min(field, vec3(1.6)) * (0.5 + 0.5 * crestLift) * (0.6 + 0.4 * shim);

  // Kamm-Gischt + Ringwellen-Gischt
  float foamN = vnoise(vWorldPos.xz * 2.4 + uTime * 0.1) * vnoise(vWorldPos.xz * 5.7 - uTime * 0.06);
  float foam = smoothstep(0.58, 0.92, vCrest * (0.5 + 0.75 * foamN) + vRingFoam * 0.55 * (0.4 + foamN));
  col = mix(col, uFoamColor, min(foam, 1.0) * 0.38);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// ── Planare Reflexion ────────────────────────────────────────────────────────

const CLIP_BIAS = 0.004;

function makeMirrorCamera(src: THREE.PerspectiveCamera): THREE.PerspectiveCamera {
  const cam = src.clone();
  cam.matrixAutoUpdate = false;
  return cam;
}

const _plane = new THREE.Plane();
const _clip = new THREE.Vector4();
const _q = new THREE.Vector4();
const _look = new THREE.Vector3();
const _up = new THREE.Vector3();
const _target = new THREE.Vector3();
const _bias = new THREE.Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

/** Spiegelt die Kamera an der Ebene y=0 und setzt den obliquen Near-Clip. */
function updateMirror(src: THREE.Camera, mirror: THREE.PerspectiveCamera, texMatrix: THREE.Matrix4) {
  _look.set(0, 0, -1).applyQuaternion(src.quaternion);
  _up.set(0, 1, 0).applyQuaternion(src.quaternion);
  mirror.position.set(src.position.x, -src.position.y, src.position.z);
  _look.y *= -1;
  _up.y *= -1;
  _target.copy(mirror.position).add(_look);
  mirror.up.copy(_up);
  mirror.lookAt(_target);
  mirror.updateMatrixWorld();
  mirror.matrixWorld.copy(mirror.matrixWorld); // sicherstellen

  // Projektion übernehmen, dann oblique an Ebene y=0
  const srcP = (src as THREE.PerspectiveCamera).projectionMatrix;
  mirror.projectionMatrix.copy(srcP);

  _plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
  _plane.applyMatrix4(mirror.matrixWorldInverse);
  _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
  const pm = mirror.projectionMatrix.elements;
  _q.set(
    (Math.sign(_clip.x) + pm[8]) / pm[0],
    (Math.sign(_clip.y) + pm[9]) / pm[5],
    -1,
    (1 + pm[10]) / pm[14],
  );
  _clip.multiplyScalar(2 / _clip.dot(_q));
  pm[2] = _clip.x;
  pm[6] = _clip.y;
  pm[10] = _clip.z + 1 - CLIP_BIAS;
  pm[14] = _clip.w;
  mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();

  texMatrix.copy(_bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
}

// ── Lichtfeld-Brücke: Szene füttert, Wasser liest ────────────────────────────

export interface FieldLight { x: number; z: number; r: number; i: number; c: THREE.Color }

const MAX_BUOYS = 14;
const _pools: FieldLight[] = [];
const _buoys: FieldLight[] = [];

/** Kapitel-Lichtpools (10, statisch bis auf visited-Intensität) — Aufruf pro Frame ok. */
export function setWaterPools(list: FieldLight[]) {
  _pools.length = 0;
  _pools.push(...list.slice(0, 10));
}
/** Bojen-Lichter (dynamisch, pulsierend) — Aufruf pro Frame ok. */
export function setWaterBuoys(list: FieldLight[]) {
  _buoys.length = 0;
  _buoys.push(...list.slice(0, MAX_BUOYS));
}

// ── Komponente ───────────────────────────────────────────────────────────────

export function OceanWater({ mobile = false }: { mobile?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material, rt, mirrorCam, texMatrix } = useMemo(() => {
    const seg = mobile ? 128 : 256;
    const geometry = new THREE.PlaneGeometry(640, 640, seg, seg);
    geometry.rotateX(-Math.PI / 2);

    const rt = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const mirrorCam = makeMirrorCamera(new THREE.PerspectiveCamera());
    const texMatrix = new THREE.Matrix4();

    const ripples: THREE.Vector4[] = [];
    for (let i = 0; i < RIPPLE_COUNT; i++) ripples.push(new THREE.Vector4(0, 0, -100, 0));

    // Kapitel-Pools + Bojen-Uniforms (Werte werden pro Frame aus der
    // Lichtfeld-Brücke übernommen; hier nur die Struktur + Startfarben)
    const poolVec = ISLANDS.map((isl) =>
      new THREE.Vector4(w2x(isl.x), w2z(isl.y), isl.r * S * 2.4, 0.5),
    );
    const poolCol = ISLANDS.map((isl) =>
      new THREE.Color(isl.ground[2]).lerp(new THREE.Color("#ffd9a0"), 0.35),
    );
    const buoyVec: THREE.Vector4[] = [];
    const buoyCol: THREE.Color[] = [];
    for (let i = 0; i < MAX_BUOYS; i++) {
      buoyVec.push(new THREE.Vector4(0, 0, 1, 0));
      buoyCol.push(new THREE.Color(0, 0, 0));
    }
    const moonAz = new THREE.Vector2(MOON_DIR.x, MOON_DIR.z).normalize();

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uCalm: { value: 0 },
          tReflect: { value: rt.texture },
          uTextureMatrix: { value: texMatrix },
          uMoonDir: { value: MOON_DIR.clone() },
          uMoonColor: { value: new THREE.Color("#f7e7c2") },
          uDeepColor: { value: new THREE.Color("#071423") },
          uShallowColor: { value: new THREE.Color("#10404a") },
          uFoamColor: { value: new THREE.Color("#aebdb6") },
          uDetail: { value: 1 },
          uSheen: { value: 0 },
          uMoonAz: { value: moonAz },
          uPools: { value: poolVec },
          uPoolColor: { value: poolCol },
          uBuoys: { value: buoyVec },
          uBuoyColor: { value: buoyCol },
          uBuoyCount: { value: 0 },
          uRipples: { value: ripples },
        },
      ]),
    });

    return { geometry, material, rt, mirrorCam, texMatrix };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  // Auflösung des Reflexions-Targets an den Viewport koppeln (halbe Auflösung)
  const rtScale = mobile ? 0.35 : 0.5;
  useMemo(() => {
    rt.setSize(
      Math.max(256, Math.floor(size.width * dpr * rtScale)),
      Math.max(256, Math.floor(size.height * dpr * rtScale)),
    );
  }, [rt, size, dpr, rtScale]);

  // Ringwellen-API aus projStore bedienen (Weltkoordinaten → 3D-Ebene)
  const rippleIdx = useRef(0);
  useEffect(() => {
    registerRipple3D((wx, wy, strength) => {
      const arr = material.uniforms.uRipples.value as THREE.Vector4[];
      const i = rippleIdx.current % RIPPLE_COUNT;
      rippleIdx.current += 1;
      arr[i].set(w2x(wx), w2z(wy), material.uniforms.uTime.value, Math.min(2, strength));
    });
    return () => registerRipple3D(null);
  }, [material]);

  const calmSm = useRef(0);

  useFrame(({ gl, scene, camera, clock }) => {
    const mat = material;
    mat.uniforms.uTime.value = clock.elapsedTime;

    // Stille beruhigt die Wellen (weich gedämpft)
    const target = projStore.calm;
    calmSm.current += (target - calmSm.current) * 0.02;
    mat.uniforms.uCalm.value = calmSm.current;

    // Übersichts-Sheen aus der Kamerahöhe ableiten
    const sheenT = THREE.MathUtils.clamp((camera.position.y - 9) / 30, 0, 1);
    mat.uniforms.uSheen.value += (sheenT - mat.uniforms.uSheen.value) * 0.04;

    // Lichtfeld aus der Brücke in die Uniforms kopieren
    const pv = mat.uniforms.uPools.value as THREE.Vector4[];
    const pc = mat.uniforms.uPoolColor.value as THREE.Color[];
    for (let i = 0; i < 10; i++) {
      const L = _pools[i];
      if (L) { pv[i].set(L.x, L.z, L.r, L.i); pc[i].copy(L.c); }
    }
    const bv = mat.uniforms.uBuoys.value as THREE.Vector4[];
    const bc = mat.uniforms.uBuoyColor.value as THREE.Color[];
    const n = Math.min(_buoys.length, MAX_BUOYS);
    for (let i = 0; i < n; i++) {
      const L = _buoys[i];
      bv[i].set(L.x, L.z, L.r, L.i);
      bc[i].copy(L.c);
    }
    mat.uniforms.uBuoyCount.value = n;

    // Reflexions-Pass: Szene aus gespiegelter Kamera ins RT.
    // Tone Mapping für den Pass AUS — das RT hält lineare Werte,
    // sonst wird die Reflexion doppelt getont (zu helle Wash).
    const mesh = meshRef.current;
    if (mesh) {
      updateMirror(camera, mirrorCam, texMatrix);
      mesh.visible = false;
      const prevRT = gl.getRenderTarget();
      const prevTone = gl.toneMapping;
      gl.toneMapping = THREE.NoToneMapping;
      gl.setRenderTarget(rt);
      gl.clear();
      gl.render(scene, mirrorCam);
      gl.setRenderTarget(prevRT);
      gl.toneMapping = prevTone;
      mesh.visible = true;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      name="ocean-water"
    />
  );
}
