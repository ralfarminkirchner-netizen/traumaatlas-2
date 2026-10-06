import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;
  varying float vSeed;
  varying float vTwinkle;
  void main() {
    vSeed = aSeed;
    vec3 p = position;
    // langsames Atmen des Nebels
    p.x += sin(uTime * 0.05 + aSeed * 12.0) * 0.35;
    p.y += cos(uTime * 0.04 + aSeed * 9.0) * 0.28;
    p.z += sin(uTime * 0.03 + aSeed * 7.0) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vTwinkle = 0.6 + 0.4 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0);
    gl_PointSize = uSize * (1.0 + aSeed * 1.8) * (18.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorWarm;
  uniform vec3 uColorCool;
  varying float vSeed;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 2.4);
    vec3 col = mix(uColorWarm, uColorCool, step(0.72, fract(vSeed * 5.7)));
    gl_FragColor = vec4(col * vTwinkle, a * 0.5 * vTwinkle);
  }
`;

/** 10.000-Partikel-Nebel, in dessen Mitte die Körperform schwebt. */
export function Nebula({ count = 10000, radius = 9 }: { count?: number; radius?: number }) {
  const mobile = useIsMobile();
  const reduced = useReducedMotion();
  const pointsRef = useRef<THREE.Points>(null);
  const n = mobile ? Math.floor(count / 6) : count;

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Galaxie-Scheibe mit vertikaler Aufblähung
      const r = Math.pow(Math.random(), 0.6) * radius;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * (radius * 0.35) * (1 - r / radius * 0.6);
      positions[i * 3 + 2] = Math.sin(theta) * r;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const uni = {
      uTime: { value: 0 },
      uSize: { value: mobile ? 1.6 : 2.4 },
      uColorWarm: { value: new THREE.Color("#e2a35c") },
      uColorCool: { value: new THREE.Color("#8b93c9") },
    };
    return { geometry: geo, uniforms: uni };
  }, [n, radius, mobile]);

  useFrame((_, delta) => {
    if (!reduced) uniforms.uTime.value += delta;
    if (pointsRef.current && !reduced) pointsRef.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
