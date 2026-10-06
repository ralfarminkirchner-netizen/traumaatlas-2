import * as THREE from "three";

/**
 * SilkMaterial — seidige Energie-Skulptur.
 * FBM-Noise-Verformung + Fresnel-Glow + Frost-Kristall-Effekt.
 * Der Körper existiert nur als abstrakte, würdevolle Form.
 */
export const silkVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;   // Bewegungsgeschwindigkeit der Stoffstruktur
  uniform float uAmp;     // Verformungsamplitude
  uniform float uFrost;   // 0..1 Kristall-Einfrieren
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;
  varying vec3 vPos;

  // Simplex-Noise (Ashima)
  vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vPos = position;
    float t = uTime * uSpeed;
    // Frost 'erstarrt' die Struktur: Frequenz hoch, Bewegung null
    float freq = mix(1.6, 4.5, uFrost);
    vec3 p = position * freq;
    p.y *= 1.35; // vertikale Stofffaltung
    float n = fbm(p + vec3(0.0, t * 0.25, t * 0.18));
    vNoise = n;
    vec3 displaced = position + normal * n * uAmp * mix(1.0, 0.45, uFrost);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

export const silkFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;   // warme Seide (Bernstein)
  uniform vec3 uColorB;   // Vagus-Türkis
  uniform vec3 uFrostColor; // Frost-Kristall
  uniform float uFrost;   // 0..1
  uniform float uGlow;    // Gesamt-Intensität
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vNoise;
  varying vec3 vPos;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float fresnel = pow(1.0 - abs(dot(N, V)), 2.2);
    float mixv = smoothstep(-0.6, 0.8, vNoise) + 0.15 * sin(vPos.y * 3.0 + uTime * 0.3);
    vec3 body = mix(uColorA, uColorB, clamp(mixv, 0.0, 1.0));
    // Frost: kristalline Facetten + Bläue
    float crystal = step(0.35, fract(vNoise * 6.0 + vPos.x * 2.0)) * uFrost;
    vec3 col = mix(body, uFrostColor, uFrost * 0.75 + crystal * 0.25);
    float light = 0.35 + 0.65 * max(dot(N, normalize(vec3(0.4, 0.8, 0.6))), 0.0);
    vec3 finalCol = col * light * (0.55 + fresnel * 1.6) * uGlow;
    // inneres Leuchten
    finalCol += col * 0.18 * (0.5 + 0.5 * vNoise) * uGlow;
    float alpha = clamp(0.45 + fresnel * 0.55, 0.0, 0.95);
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

export interface SilkUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uSpeed: { value: number };
  uAmp: { value: number };
  uFrost: { value: number };
  uGlow: { value: number };
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uFrostColor: { value: THREE.Color };
}

export function createSilkUniforms(): SilkUniforms {
  return {
    uTime: { value: 0 },
    uSpeed: { value: 1 },
    uAmp: { value: 0.22 },
    uFrost: { value: 0 },
    uGlow: { value: 1 },
    uColorA: { value: new THREE.Color("#e2a35c") },
    uColorB: { value: new THREE.Color("#8fd8cf") },
    uFrostColor: { value: new THREE.Color("#8b93c9") },
  };
}

export const SILK_VERT = silkVertexShader;
export const SILK_FRAG = silkFragmentShader;
