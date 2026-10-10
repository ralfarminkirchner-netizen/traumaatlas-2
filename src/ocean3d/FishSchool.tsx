// Fischschwärme über den Untiefen: Boids-lite (Kohäsion/Ausrichtung/Trennung
// + Revier-Zug), silbernes Flankenblitzen, SCHEU — sie weichen der Welle
// (Wellenpaket) und der tauchenden Kamera aus. CPU-Schwarm ~12 Hz, Render
// instanziert in einem Draw-Call.

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SHOALS, depthAt } from "./seabed";
import { packetState } from "./waves";
import { dayState, sampleDay } from "./daynight";

const FISH_PER_SCHOOL = 44;
const SCHOOLS = 2;

const VERT = /* glsl */ `
attribute float aPhase;
uniform float uTime;
varying float vFlash;

#include <fog_pars_vertex>

void main() {
  vec3 p = position;
  // Schwanzschlag: Biegung wächst zum Heck (−z)
  float tail = clamp(0.5 - p.z * 1.6, 0.0, 1.0);
  float wig = sin(uTime * 6.5 + aPhase + p.z * 5.0);
  p.x += wig * tail * 0.09;
  vFlash = 0.5 + 0.5 * wig;
  vec4 wp = instanceMatrix * vec4(p, 1.0);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uFlash;
uniform float uLight;
varying float vFlash;

#include <fog_pars_fragment>

void main() {
  vec3 col = mix(uBase, uFlash, vFlash * vFlash * 0.7) * uLight;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function FishSchool() {
  const sim = useRef({ acc: 0 });

  const { mesh, material, state } = useMemo(() => {
    const n = FISH_PER_SCHOOL * SCHOOLS;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    // Zwei Reviere: erste zwei Untiefen-Platten
    const anchors: [number, number][] = [
      [SHOALS[0].x, SHOALS[0].z],
      [SHOALS[1].x, SHOALS[1].z],
    ];
    const anchorOf = new Uint8Array(n);
    let seed = 777;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < n; i++) {
      const sc = i < FISH_PER_SCHOOL ? 0 : 1;
      anchorOf[i] = sc;
      const [ax, az] = anchors[sc];
      const d = depthAt(ax, az);
      pos[i * 3] = ax + (rnd() - 0.5) * 8;
      pos[i * 3 + 1] = -Math.max(1.4, d * 0.55) + (rnd() - 0.5) * 1.4;
      pos[i * 3 + 2] = az + (rnd() - 0.5) * 8;
      vel[i * 3] = (rnd() - 0.5) * 2;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = (rnd() - 0.5) * 2;
      phases[i] = rnd() * Math.PI * 2;
    }

    // Kleiner Fischkörper: gestreckter Doppelkegel (Heck −z)
    const geo = new THREE.ConeGeometry(0.085, 0.5, 4);
    geo.rotateX(Math.PI / 2);
    geo.scale(1, 0.55, 1);

    const igeo = new THREE.InstancedBufferGeometry();
    igeo.index = geo.index;
    igeo.attributes.position = geo.attributes.position;
    igeo.attributes.uv = geo.attributes.uv;
    igeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      fog: true,
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uBase: { value: new THREE.Color("#5f7c88") },
          uFlash: { value: new THREE.Color("#e2f2f4") },
          uLight: { value: 1 },
        },
      ]),
    });

    const mesh = new THREE.InstancedMesh(igeo, material, n);
    mesh.frustumCulled = false;
    mesh.name = "ocean-fish";
    return { mesh, material, state: { pos, vel, anchorOf, anchors, n } };
  }, []);

  const _m = useRef(new THREE.Matrix4());
  const _q = useRef(new THREE.Quaternion());
  const _dir = useRef(new THREE.Vector3());
  const _up = useRef(new THREE.Vector3(0, 1, 0));
  const _scale = useRef(new THREE.Vector3(1, 1, 1));
  const _p = useRef(new THREE.Vector3());

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05) || 0.016;
    const t = clock.elapsedTime;
    material.uniforms.uTime.value = t;
    const pal = sampleDay(dayState.phase);
    material.uniforms.uLight.value = THREE.MathUtils.clamp(0.6 + ((pal.exposure - 1.0) / 0.12) * 0.5, 0.55, 1.15);

    // Boids nur ~12 Hz (zwischen den Ticks: nur Matrizen schreiben)
    const s = sim.current;
    s.acc += dt;
    const stepped = s.acc > 0.083;
    if (stepped) s.acc = 0;
    const bdt = stepped ? 0.083 : 0;

    const { pos, vel, anchorOf, anchors, n } = state;
    const pkx = packetState.x;
    const pkz = packetState.z;
    const fleeAmp = 1 + packetState.amp * 2;

    if (bdt > 0) {
      for (let i = 0; i < n; i++) {
        const ix = i * 3;
        const x = pos[ix], y = pos[ix + 1], z = pos[ix + 2];
        let vx = vel[ix], vy = vel[ix + 1], vz = vel[ix + 2];

        // Kohäsion/Ausrichtung/Trennung (nur Schulmitglieder, grob O(n²) auf 44²)
        const base = anchorOf[i] * FISH_PER_SCHOOL;
        let cx = 0, cy = 0, cz = 0, ax = 0, ay = 0, az = 0, sx = 0, sy = 0, sz = 0, cnt = 0;
        for (let j = 0; j < FISH_PER_SCHOOL; j++) {
          if (j === i % FISH_PER_SCHOOL) continue;
          const jx = (base + j) * 3;
          const dx = pos[jx] - x, dy = pos[jx + 1] - y, dz = pos[jx + 2] - z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 49) continue;
          cnt++;
          cx += pos[jx]; cy += pos[jx + 1]; cz += pos[jx + 2];
          ax += vel[jx]; ay += vel[jx + 1]; az += vel[jx + 2];
          if (d2 < 1.7) { sx -= dx / d2; sy -= dy / d2; sz -= dz / d2; }
        }
        if (cnt > 0) {
          vx += ((cx / cnt - x) * 0.14 + (ax / cnt - vx) * 0.09 + sx * 0.5) * bdt;
          vy += ((cy / cnt - y) * 0.14 + (ay / cnt - vy) * 0.09 + sy * 0.5) * bdt;
          vz += ((cz / cnt - z) * 0.14 + (az / cnt - vz) * 0.09 + sz * 0.5) * bdt;
        }

        // Revier-Zug + Tiefenband über dem Boden
        const [hx, hz] = anchors[anchorOf[i]];
        vx += (hx - x) * 0.045 * bdt;
        vz += (hz - z) * 0.045 * bdt;
        const bed = -depthAt(x, z);
        const yT = Math.min(-1.3, bed * 0.55);
        vy += (yT - y) * 0.6 * bdt;

        // SCHEU: der Welle ausweichen (stärker bei hoher Amplitude)
        const pdx = x - pkx, pdz = z - pkz;
        const pd2 = pdx * pdx + pdz * pdz;
        if (pd2 < 64) {
          const pd = Math.sqrt(pd2) || 0.01;
          const f = ((8 - pd) / 8) * fleeAmp * 6.5 * bdt;
          vx += (pdx / pd) * f;
          vz += (pdz / pd) * f;
        }
        // und der tauchenden Kamera
        if (camera.position.y < 0) {
          const kdx = x - camera.position.x, kdz = z - camera.position.z;
          const kd2 = kdx * kdx + kdz * kdz;
          if (kd2 < 20) {
            const kd = Math.sqrt(kd2) || 0.01;
            const f = ((4.5 - kd) / 4.5) * 5.5 * bdt;
            vx += (kdx / kd) * f;
            vz += (kdz / kd) * f;
          }
        }

        // Tempo begrenzen, Position fortschreiben
        const sp = Math.hypot(vx, vy, vz) || 0.01;
        const cl = THREE.MathUtils.clamp(sp, 1.4, 5.2);
        vx = (vx / sp) * cl; vy = (vy / sp) * cl; vz = (vz / sp) * cl;
        pos[ix] = x + vx * bdt;
        pos[ix + 1] = THREE.MathUtils.clamp(y + vy * bdt, bed + 0.4, -0.7);
        pos[ix + 2] = z + vz * bdt;
        vel[ix] = vx; vel[ix + 1] = vy; vel[ix + 2] = vz;
      }
    }

    // Matrizen: Orientierung aus der Geschwindigkeit
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      _dir.current.set(vel[ix], vel[ix + 1], vel[ix + 2]);
      if (_dir.current.lengthSq() < 1e-6) _dir.current.set(0, 0, 1);
      _dir.current.normalize();
      _q.current.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _dir.current);
      _p.current.set(pos[ix], pos[ix + 1], pos[ix + 2]);
      _m.current.compose(_p.current, _q.current, _scale.current);
      mesh.setMatrixAt(i, _m.current);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
