import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SILK_FRAG, SILK_VERT, createSilkUniforms, type SilkUniforms } from "./silk";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export interface SilkBodyProps {
  /** 0..1 — Anteil Frost (Erstarrung) */
  frost?: number;
  /** Bewegungsgeschwindigkeit der Seidenstruktur */
  speed?: number;
  scale?: number;
  position?: [number, number, number];
  glow?: number;
  colorA?: string;
  colorB?: string;
  rotationSpeed?: number;
}

/** Die abstrakte Körperform: seidige Energie-Skulptur, nie ein Mannequin. */
export function SilkBody({
  frost = 0,
  speed = 1,
  scale = 1,
  position = [0, 0, 0],
  glow = 1,
  colorA = "#e2a35c",
  colorB = "#8fd8cf",
  rotationSpeed = 0.06,
}: SilkBodyProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();

  const uniforms = useMemo<SilkUniforms>(() => {
    const u = createSilkUniforms();
    u.uColorA.value = new THREE.Color(colorA);
    u.uColorB.value = new THREE.Color(colorB);
    return u;
    // Farben nur beim Mount setzen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 48), []);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uFrost.value += (frost - mat.uniforms.uFrost.value) * Math.min(1, delta * 3);
    mat.uniforms.uSpeed.value += (speed - mat.uniforms.uSpeed.value) * Math.min(1, delta * 2);
    mat.uniforms.uGlow.value += (glow - mat.uniforms.uGlow.value) * Math.min(1, delta * 2);
    if (!reduced) mat.uniforms.uTime.value += delta;
    if (meshRef.current && !reduced) meshRef.current.rotation.y += delta * rotationSpeed;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={position} scale={scale}>
      <shaderMaterial
        ref={matRef}
        vertexShader={SILK_VERT}
        fragmentShader={SILK_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
