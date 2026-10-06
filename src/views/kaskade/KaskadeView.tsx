import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { stressCascade, bodyRegions, nervousStates } from "@/data/nervous";
import { regionAnchors } from "@/data/body3d";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { CHAPTERS } from "@/views/chapters";
import { setState, getState, useAtlasState } from "@/state/atlas-store";
import { WebGLGate } from "@/viz/WebGLGate";
import { SilkBody } from "@/viz/SilkBody";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[0];

/** Visuelle Parameter je Kaskaden-Station */
const STEP_VIZ = [
  { speed: 0.5, frost: 0, glow: 1.0, colA: "#a8b8ce", colB: "#8fd8cf" },
  { speed: 1.3, frost: 0, glow: 1.25, colA: "#e2a35c", colB: "#f3d9b0" },
  { speed: 2.4, frost: 0, glow: 1.45, colA: "#d97742", colB: "#e2a35c" },
  { speed: 0.04, frost: 1, glow: 0.9, colA: "#8b93c9", colB: "#aab3e0" },
  { speed: 1.6, frost: 0, glow: 1.3, colA: "#7fb8a4", colB: "#e2a35c" },
  { speed: 0.3, frost: 0.15, glow: 0.85, colA: "#c9a0a8", colB: "#e2a35c" },
];

/** Entladungs-Partikel: warme Funken, die aus der Form steigen (nur Station 4). */
function ReleaseSparks({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const N = 220;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 0.9 + Math.random() * 0.7;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r * 0.7;
      pos[i * 3 + 1] = -1 + Math.random() * 2;
      pos[i * 3 + 2] = Math.sin(a) * r * 0.4;
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, []);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    pts.visible = active;
    if (!active) return;
    const t = state.clock.elapsedTime;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const seed = geo.attributes.aSeed as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const s = seed.getX(i);
      const cycle = ((t * (0.25 + s * 0.4) + s * 5) % 1.6) / 1.6;
      const y = -1 + cycle * 3.2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 2 + s * 20) * 0.001);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        size={0.05}
        color="#ffd9a0"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Körperregionen, die je Station aktiv aufleuchten (Positionen aus body3d). */
const STEP_REGIONS: string[][] = [
  ["kopf"],
  ["kopf", "hals"],
  ["brust", "schultern", "hals"],
  ["bauch", "becken"],
  ["schultern", "becken"],
  ["bauch"],
];

/** Leuchtende Region-Marker auf der Körperform. */
function RegionMarkers({ step }: { step: number }) {
  const refs = useRef(new Map<string, THREE.Mesh>());
  const active = new Set(STEP_REGIONS[Math.max(0, Math.min(5, step))]);
  const color = STEP_VIZ[Math.max(0, Math.min(5, step))].colA;
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (const a of regionAnchors) {
      const m = refs.current.get(a.id);
      if (!m) continue;
      const on = active.has(a.id);
      const mat = m.material as THREE.MeshBasicMaterial;
      const target = on ? 0.85 : 0.12;
      mat.opacity += (target - mat.opacity) * 0.08;
      const s = (on ? 1.15 + Math.sin(t * 2.4) * 0.18 : 1) * a.radius * 1.5;
      m.scale.setScalar(Math.max(s, 0.01));
    }
  });
  return (
    <group>
      {regionAnchors.map((a) => (
        <mesh
          key={a.id}
          ref={(el) => { if (el) refs.current.set(a.id, el); }}
          position={[a.position[0] * 1.5, a.position[1] * 1.5 - 0.1, a.position[2] * 1.5 + 0.15]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/** Regions-Namen als Sprite-Label am aktiven Marker. */
function RegionLabel({ step }: { step: number }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const active = STEP_REGIONS[Math.max(0, Math.min(5, step))];
  const anchor = regionAnchors.find((a) => a.id === active[0]);
  const label = useMemo(() => {
    if (!anchor) return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = "500 26px Inter, system-ui, sans-serif";
    ctx.font = font;
    const tw = Math.ceil(ctx.measureText(anchor.label).width);
    canvas.width = (tw + 28) * 2;
    canvas.height = 44 * 2;
    const c = canvas.getContext("2d")!;
    c.scale(2, 2);
    c.font = font;
    c.fillStyle = "rgba(10,8,6,0.72)";
    c.beginPath();
    c.roundRect(0, 2, tw + 28, 32, 10);
    c.fill();
    c.fillStyle = "#f3e7d3";
    c.textBaseline = "middle";
    c.fillText(anchor.label, 14, 19);
    const tex = new THREE.CanvasTexture(canvas);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }));
    sp.scale.set((0.3 * canvas.width) / canvas.height, 0.3, 1);
    sp.renderOrder = 12;
    return sp;
  }, [anchor]);
  useEffect(() => {
    if (spriteRef.current && label) spriteRef.current.material.map = label.material.map;
  }, [label]);
  useFrame((_, delta) => {
    const sp = spriteRef.current;
    if (!sp || !anchor) return;
    sp.position.set(anchor.position[0] * 1.5 + 0.55, anchor.position[1] * 1.5 - 0.1, anchor.position[2] * 1.5 + 0.2);
    sp.material.opacity += (0.95 - sp.material.opacity) * Math.min(1, delta * 5);
  });
  return <sprite ref={spriteRef} />;
}

/** Kamera-Regie: sanfte Dollys je Station (Nähe für Erstarrung, Weite für Überblick). */
function CascadeCamera({ step }: { step: number }) {
  const t = useRef(0);
  const DIST = [6.2, 5.6, 5.2, 4.2, 5.4, 6.0];
  const Y = [0.9, 1.0, 0.9, 0.5, 0.8, 0.8];
  useFrame((state, delta) => {
    t.current += delta;
    const k = Math.max(0, Math.min(5, step));
    const want = DIST[k] + Math.sin(t.current * 0.4) * 0.12;
    const cam = state.camera;
    cam.position.z += (want - cam.position.z) * Math.min(1, delta * 1.6);
    cam.position.y += (Y[k] - cam.position.y) * Math.min(1, delta * 1.6);
    cam.lookAt(0, 0.55, 0);
  });
  return null;
}

/** Rotierende, atmende Kaskaden-Bühne. */
function CascadeStage({ step }: { step: number }) {
  const viz = STEP_VIZ[Math.max(0, Math.min(5, step))];
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.12;
  });
  return (
    <group ref={group}>
      <CascadeCamera step={step} />
      <RegionLabel step={step} />
      <SilkBody
        scale={1.5}
        position={[0, -0.1, 0]}
        speed={viz.speed}
        frost={viz.frost}
        glow={viz.glow}
        colorA={viz.colA}
        colorB={viz.colB}
      />
      {/* innere Glut */}
      <SilkBody scale={0.85} position={[0, -0.1, 0]} speed={viz.speed * 0.7} frost={viz.frost} glow={viz.glow * 0.7} colorA="#f3d9b0" colorB={viz.colB} rotationSpeed={-0.1} />
      <RegionMarkers step={step} />
      <ReleaseSparks active={step === 4} />
    </group>
  );
}

/** Statischer Ersatz: Silhouette mit aktiver Region. */
function CascadeFallback({ step }: { step: number }) {
  const regionByStep = ["kopf", "kopf", "brust", "bauch", "schultern", "bauch"];
  const active = regionByStep[Math.max(0, step)] ?? "kopf";
  const info = stressCascade[Math.max(0, step)];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <svg viewBox="0 0 200 520" className="h-[46vh] max-h-[420px]" role="img" aria-label={`Körpersilhouette, aktive Region: ${active}`}>
        <g fill="#1c1712" stroke="#3a3128" strokeWidth="1.5">
          {bodyRegions.map((r) => (
            <path key={r.id} d={r.d} fill={r.id === active ? info.color : "#1c1712"} fillOpacity={r.id === active ? 0.55 : 1} stroke={r.id === active ? info.color : "#3a3128"} />
          ))}
        </g>
      </svg>
      <p className="max-w-xs text-center text-sm text-white/60">
        {info.title} — {info.time}
      </p>
    </div>
  );
}

/** Was an dieser Station hilft: echte Übungen & Verfahren des Atlas für den Nervensystem-Zustand. */
function StationHelp({ nervous }: { nervous: "ventral" | "sympathikus" | "dorsal" }) {
  const st = nervousStates.find((x) => x.id === nervous);
  if (!st) return null;
  const exs = st.exercises.map((id) => exercises.find((e) => e.id === id)).filter((e): e is (typeof exercises)[number] => !!e).slice(0, 3);
  const meths = st.methods.map((id) => methods.find((m) => m.id === id)).filter((m): m is (typeof methods)[number] => !!m).slice(0, 3);
  return (
    <div className="mt-5 border-t border-white/[0.07] pt-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
        Was an dieser Station hilft · {st.short}
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="mb-1.5 text-xs text-[#7fb8a4]">Übungen</p>
          <ul className="space-y-1">
            {exs.map((e) => (
              <li key={e.id} className="text-sm text-white/70">· {e.title} <span className="text-white/35">({e.minutes})</span></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-xs text-[#d9a05b]">Verfahren, die hier ansetzen</p>
          <ul className="space-y-1">
            {meths.map((m) => (
              <li key={m.id} className="text-sm text-white/70">· {m.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function KaskadeView() {
  const reduced = useReducedMotion();
  const { cascadeStep, cascadePlaying } = useAtlasState();
  const step = cascadeStep < 0 ? 0 : cascadeStep;
  const info = stressCascade[step];

  // Auto-Play
  useEffect(() => {
    if (!cascadePlaying || reduced) return;
    const id = window.setInterval(() => {
      const cur = getState().cascadeStep < 0 ? 0 : getState().cascadeStep;
      setState({ cascadeStep: cur >= 5 ? 0 : cur + 1 });
    }, 3600);
    return () => window.clearInterval(id);
  }, [cascadePlaying, reduced]);

  const setStep = (s: number) => setState({ cascadeStep: s });

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Die sechs Stationen der Stresskaskade">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Bühne */}
          <div className="vignette relative h-[62vh] min-h-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906]">
            <motion.div
              key={`tint-${info.id}`}
              className="pointer-events-none absolute inset-0"
              initial={false}
              animate={{ background: `radial-gradient(ellipse at 50% 60%, ${info.color}14 0%, transparent 60%)` }}
              transition={{ duration: 1.2 }}
              aria-hidden="true"
            />
            <WebGLGate
              className="absolute inset-0"
              camera={{ position: [0, 0.6, 5.8], fov: 45 }}
              fallback={<CascadeFallback step={step} />}
            >
              <CascadeStage step={step} />
            </WebGLGate>

            {/* Stations-Titel als Overlay */}
          <motion.div
            key={info.id}
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute left-5 top-5"
          >
            <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: info.color }}>
              Station {step + 1} von 6 · {info.time}
            </p>
            <h2 className="font-display mt-1 text-2xl text-[#f3e7d3]" style={{ textShadow: `0 0 24px ${info.color}66` }}>
              {info.title}
            </h2>
          </motion.div>

          {/* Fortschritts-Timeline als leuchtender Pfad */}
            <div className="absolute inset-x-6 bottom-4">
              <svg viewBox="0 0 600 46" className="w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="tlgrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a8b8ce" />
                    <stop offset="40%" stopColor="#e2a35c" />
                    <stop offset="60%" stopColor="#8b93c9" />
                    <stop offset="100%" stopColor="#c9a0a8" />
                  </linearGradient>
                </defs>
                <path d="M20 30 C 120 10, 200 38, 300 24 S 480 12, 580 28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <path
                  d="M20 30 C 120 10, 200 38, 300 24 S 480 12, 580 28"
                  fill="none"
                  stroke="url(#tlgrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="600"
                  strokeDashoffset={600 - (step / 5) * 600}
                  style={{ filter: "drop-shadow(0 0 6px rgba(226,163,92,0.7))", transition: reduced ? "none" : "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
                />
                {stressCascade.map((s, i) => {
                  const x = 20 + (i / 5) * 560;
                  const y = 30 - Math.sin((i / 5) * Math.PI * 2) * 6;
                  const active = i === step;
                  return (
                    <g key={s.id}>
                      {active && !reduced && <circle cx={x} cy={y} r="10" fill="none" stroke={s.color} strokeOpacity="0.6"><animate attributeName="r" values="8;14;8" dur="2.4s" repeatCount="indefinite" /></circle>}
                      <circle
                        cx={x} cy={y} r={active ? 6 : 3.5}
                        fill={active ? s.color : "#3a3128"}
                        style={active ? { filter: `drop-shadow(0 0 8px ${s.color})` } : undefined}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Stations-Seitenleiste */}
          <div className="flex flex-col">
            <ol className="flex-1 space-y-1.5" aria-label="Stationen">
              {stressCascade.map((s, i) => {
                const active = i === step;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setStep(i)}
                      aria-current={active ? "step" : undefined}
                      className={`w-full rounded-xl border px-4 py-2.5 text-left transition-all ${
                        active ? "border-white/20 bg-white/[0.06]" : "border-transparent hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                          style={{
                            background: active ? s.color : "rgba(255,255,255,0.06)",
                            color: active ? "#14100b" : "rgba(255,255,255,0.5)",
                            boxShadow: active ? `0 0 14px ${s.color}66` : undefined,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate text-sm ${active ? "text-[#f3e7d3]" : "text-white/60"}`}>{s.title}</span>
                          <span className="block text-[11px] text-white/35">{s.time}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setStep(step <= 0 ? 5 : step - 1)}
                aria-label="Vorherige Station"
                className="rounded-xl border border-white/10 p-2.5 text-white/60 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setState({ cascadePlaying: !cascadePlaying })}
                aria-pressed={cascadePlaying}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                  cascadePlaying ? "border-[#e2a35c]/50 bg-[#e2a35c]/10 text-[#e2a35c]" : "border-white/10 text-white/70 hover:text-white"
                }`}
              >
                {cascadePlaying ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {cascadePlaying ? "Pause" : "Reise abspielen"}
              </button>
              <button
                onClick={() => setStep(step >= 5 ? 0 : step + 1)}
                aria-label="Nächste Station"
                className="rounded-xl border border-white/10 p-2.5 text-white/60 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stations-Text */}
        <motion.div
          key={info.id}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mt-6 rounded-2xl p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl" style={{ color: info.color }}>{info.title}</h2>
            <span className="edge-chip text-white/50">{info.time}</span>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/75">{info.body}</p>
          <StationHelp nervous={info.nervous} />
        </motion.div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
