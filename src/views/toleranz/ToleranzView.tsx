import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { windowOfTolerance } from "@/data/nervous";
import { exercises } from "@/data/v1/exercises";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState } from "@/state/atlas-store";
import { WebGLGate } from "@/viz/WebGLGate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[2];

const bandVertex = /* glsl */ `
  uniform float uTime;
  uniform float uBend;     // -1..1 Erregung
  varying float vY;
  varying float vX;
  void main() {
    vec3 p = position;
    float wave = sin(p.x * 0.55 + uTime * 0.7) * 0.28 + sin(p.x * 1.3 - uTime * 0.4) * 0.1;
    // verbiegbares Band: Gauß-Verformung um die Mitte
    float g = exp(-p.x * p.x * 0.06);
    float bend = uBend * 2.6 * g;
    p.z += wave * (1.0 - abs(uBend) * 0.45) + bend;
    vY = p.z;
    vX = position.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const bandFragment = /* glsl */ `
  uniform float uBend;
  varying float vY;
  varying float vX;
  void main() {
    vec3 hypo = vec3(0.545, 0.576, 0.788);   // #8b93c9
    vec3 mid  = vec3(0.498, 0.722, 0.643);   // #7fb8a4
    vec3 hyper= vec3(0.886, 0.639, 0.361);   // #e2a35c
    float t = clamp(uBend * 1.4, -1.0, 1.0);
    vec3 col = t < 0.0 ? mix(mid, hypo, -t) : mix(mid, hyper, t);
    float glow = 0.5 + vY * 0.35;
    float edge = smoothstep(6.0, 5.2, abs(vX)); // Ränder ausblenden
    // Zonen-Rand: links Hypo, rechts Hyper — je nach Biegerichtung leuchten
    float rim = smoothstep(4.6, 5.9, abs(vX));
    vec3 rimCol = t < 0.0 ? hypo : hyper;
    float rimStrength = rim * abs(t) * 0.9;
    col = mix(col, rimCol, rimStrength);
    gl_FragColor = vec4(col * glow, 0.85 * edge);
  }
`;

/** Verformbare 3D-Fläche + rollende Lichtkugel. */
function BandStage({ arousal }: { arousal: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uBend: { value: 0 } }),
    [],
  );
  const geometry = useMemo(() => new THREE.PlaneGeometry(12, 5.2, 160, 40), []);
  const ballColor = useMemo(() => new THREE.Color("#ffe9c4"), []);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    if (!reduced) mat.uniforms.uTime.value += delta;
    mat.uniforms.uBend.value += (arousal - mat.uniforms.uBend.value) * Math.min(1, delta * 4);

    // Lichtkugel rollt auf dem Band
    const ball = ballRef.current;
    if (ball) {
      const b = mat.uniforms.uBend.value;
      const t = state.clock.elapsedTime;
      const x = b * 4.6;
      const wave = Math.sin(x * 0.55 + (reduced ? 0 : t) * 0.7) * 0.28 + Math.sin(x * 1.3 - (reduced ? 0 : t) * 0.4) * 0.1;
      const g = Math.exp(-x * x * 0.06);
      ball.position.set(x, wave * (1 - Math.abs(b) * 0.45) + b * 2.6 * g + 0.28, 0.0);
      ball.rotation.z -= delta * (0.6 + Math.abs(b) * 3) * Math.sign(b || 1);
    }
  });

  return (
    <group rotation={[-0.5, 0, 0]}>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          vertexShader={bandVertex}
          fragmentShader={bandFragment}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshBasicMaterial color={ballColor} toneMapped={false} transparent opacity={0.95} />
      </mesh>
      <pointLight position={[0, 3, 4]} intensity={30} color="#e2a35c" />
    </group>
  );
}

const ZONE_HELP: Record<"hypo" | "window" | "hyper", { exerciseIds: string[]; hint: string }> = {
  hypo: { exerciseIds: ["aktivieren", "sos-orientieren", "pendeln"], hint: "Aktivierung zuerst — dann erst dosiert hinschauen." },
  window: { exerciseIds: ["sicherer-ort", "koerperscan", "co-regulation"], hint: "Hier wirkt Übung am nachhaltigsten — der sichere Platz für Heilung." },
  hyper: { exerciseIds: ["sos-ausatmen", "voo", "selbstberuehrung"], hint: "Lang ausatmen, erden, beruhigen — die Spitze aus dem Alarm nehmen." },
};

/** Konkrete Übungen für die aktuelle Zone + Rückkehr-Tween ins Fenster. */
function ZoneHelp({ arousal, reduced }: { arousal: number; reduced: boolean }) {
  const zone = arousal < -0.35 ? "hypo" : arousal > 0.35 ? "hyper" : "window";
  const help = ZONE_HELP[zone];
  const exs = help.exerciseIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is (typeof exercises)[number] => !!e);
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Was jetzt hilft</p>
      <p className="mt-1 text-sm italic text-white/55">{help.hint}</p>
      <ul className="mt-3 space-y-2">
        {exs.map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
            <span className="text-sm text-[#f3e7d3]">{e.title}</span>
            <span className="shrink-0 text-[11px] text-white/40">{e.minutes}</span>
          </li>
        ))}
      </ul>
      {zone !== "window" && (
        <button
          onClick={() => {
            // sanfter Regulations-Tween zurück ins Fenster
            const start = (window as unknown as { __ar?: number }).__ar ?? arousal;
            const t0 = performance.now();
            const dur = reduced ? 0 : 2600;
            const step = (now: number) => {
              const k = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
              const v = start * (1 - k) * (1 - 0.25 * Math.sin(k * Math.PI * 3) * (1 - k));
              (window as unknown as { __ar?: number }).__ar = v;
              setState({ arousal: v });
              if (k < 1) requestAnimationFrame(step);
              else (window as unknown as { __ar?: number }).__ar = 0;
            };
            requestAnimationFrame(step);
          }}
          className="mt-4 w-full rounded-full border border-[#7fb8a4]/50 bg-[#7fb8a4]/10 px-4 py-2 text-sm font-medium text-[#7fb8a4] transition-colors hover:bg-[#7fb8a4]/20"
        >
          Regulation üben — sanft zurück ins Fenster
        </button>
      )}
    </div>
  );
}

/** Statischer Ersatz: zweidimensionales Band als SVG. */
function BandFallback({ arousal }: { arousal: number }) {
  const pts = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const x = -10 + (i / 80) * 20;
      const g = Math.exp(-x * x * 0.06);
      const y = -arousal * 6 * g;
      arr.push(`${(x + 12) * 25},${160 + y * 12}`);
    }
    return arr.join(" ");
  }, [arousal]);
  const color = arousal < -0.35 ? "#8b93c9" : arousal > 0.35 ? "#e2a35c" : "#7fb8a4";
  return (
    <div className="flex h-full items-center justify-center p-6">
      <svg viewBox="0 0 600 320" className="w-full max-w-xl" role="img" aria-label={`Wellenband, Erregung ${arousal.toFixed(2)}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        <circle cx={12 * 25 + arousal * 4.6 * 25} cy={160 - arousal * 6 * 12} r="10" fill="#ffe9c4" />
      </svg>
    </div>
  );
}

/** Auswertung als Diagramm-Karte: Zonen-Gauge + Verlauf. */
function EvaluationCard({ arousal, history }: { arousal: number; history: number[] }) {
  const zone = arousal < -0.35 ? "hypo" : arousal > 0.35 ? "hyper" : "window";
  const meta = {
    hypo: { color: "#8b93c9", title: windowOfTolerance.low, body: "Der Körper fährt herunter: Erstarrung, Taubheit, Rückzug. Aktivierende Übungen (Wärme, Bewegung, Stimme) helfen zurück ins Fenster." },
    window: { color: "#7fb8a4", title: windowOfTolerance.mid, body: "Hier sind Sie handlungsfähig: fühlen und denken zugleich. Genau hier findet Lernen und Heilung statt." },
    hyper: { color: "#e2a35c", title: windowOfTolerance.high, body: "Das Nervensystem ist im Alarm: Unruhe, Herzrasen, Überflutung. Beruhigende Übungen (langes Ausatmen, Erdung) führen zurück ins Fenster." },
  }[zone];

  const W = 260;
  const x = (v: number) => W / 2 + v * (W / 2 - 14);

  return (
    <motion.div
      key={zone}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-5"
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Auswertung</p>
      <svg viewBox="0 0 260 84" className="mt-3 w-full" role="img" aria-label={`Erregungs-Messung: ${meta.title}`}>
        <rect x="14" y="26" width={(W / 2 - 14) * 0.65} height="16" rx="8" fill="#8b93c9" opacity="0.35" />
        <rect x={W / 2 - (W / 2 - 14) * 0.35} y="26" width={(W / 2 - 14) * 0.7} height="16" rx="8" fill="#7fb8a4" opacity="0.45" />
        <rect x={W - 14 - (W / 2 - 14) * 0.65} y="26" width={(W / 2 - 14) * 0.65} height="16" rx="8" fill="#e2a35c" opacity="0.35" />
        <line x1={x(arousal)} y1="14" x2={x(arousal)} y2="54" stroke={meta.color} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 6px ${meta.color})` }} />
        <circle cx={x(arousal)} cy="26" r="5" fill={meta.color} />
        <text x="14" y="72" fontSize="9" fill="#8b93c9">Hypo</text>
        <text x={W / 2} y="72" fontSize="9" fill="#7fb8a4" textAnchor="middle">Fenster</text>
        <text x={W - 14} y="72" fontSize="9" fill="#e2a35c" textAnchor="end">Hyper</text>
      </svg>
      <p className="mt-2 text-sm font-semibold" style={{ color: meta.color }}>{meta.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-white/65">{meta.body}</p>

      {history.length > 1 && (
        <div className="mt-4">
          <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">Ihr Verlauf</p>
          <svg viewBox="0 0 260 60" className="w-full" aria-hidden="true">
            <line x1="0" y1="30" x2="260" y2="30" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
            <polyline
              points={history.slice(-40).map((v, i) => `${(i / 39) * 260},${30 - v * 24}`).join(" ")}
              fill="none"
              stroke="#e2a35c"
              strokeWidth="1.6"
              strokeLinejoin="round"
              opacity="0.85"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

export default function ToleranzView() {
  const reduced = useReducedMotion();
  const { arousal } = useAtlasState();
  const historyRef = useRef<number[]>([]);
  historyRef.current = [...historyRef.current, arousal].slice(-40);

  const setArousal = (v: number) => setState({ arousal: v });

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Das Toleranzfenster interaktiv erkunden">
        <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-white/70">{windowOfTolerance.body}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div
            className="vignette relative h-[56vh] min-h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906]"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const vx = (e.clientX - rect.left) / rect.width;
              setState({ arousal: Math.max(-1, Math.min(1, (vx - 0.5) * 2.4)) });
            }}
            onPointerMove={(e) => {
              if (e.buttons !== 1) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const vx = (e.clientX - rect.left) / rect.width;
              setState({ arousal: Math.max(-1, Math.min(1, (vx - 0.5) * 2.4)) });
            }}
          >
            <WebGLGate
              className="absolute inset-0"
              camera={{ position: [0, 2.2, 7.5], fov: 45 }}
              fallback={<BandFallback arousal={arousal} />}
            >
              <BandStage arousal={arousal} />
            </WebGLGate>

            {/* Regler über der Bühne */}
            <div className="absolute inset-x-8 bottom-5">
              <label htmlFor="arousal-slider" className="mb-2 flex justify-between text-[11px] text-white/50">
                <span className="text-[#8b93c9]">Hypo · Erstarrung</span>
                <span className="text-[#7fb8a4]">Toleranzfenster</span>
                <span className="text-[#e2a35c]">Hyper · Überflutung</span>
              </label>
              <input
                id="arousal-slider"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={arousal}
                onChange={(e) => setArousal(parseFloat(e.target.value))}
                className="w-full accent-[#e2a35c]"
                aria-valuetext={`Erregung ${arousal.toFixed(2)}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <EvaluationCard arousal={arousal} history={historyRef.current} />
            <ZoneHelp arousal={arousal} reduced={reduced} />

            <div className="glass-soft rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Warum das Fenster eng wird</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Trauma verengt das Toleranzfenster: Der Wechsel zwischen den Zuständen kostet weniger
                Auslöser, als er sollte. Sanfte, wiederholte Erfahrungen von Sicherheit — kein
                Durchhalten, kein Überwinden — weiten es wieder. Das ist die Grundlogik hinter allen
                Stabilisierungsübungen des Atlas.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="edge-chip text-[#8b93c9]">{windowOfTolerance.low}</span>
                <span className="edge-chip text-[#7fb8a4]">{windowOfTolerance.mid}</span>
                <span className="edge-chip text-[#e2a35c]">{windowOfTolerance.high}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
