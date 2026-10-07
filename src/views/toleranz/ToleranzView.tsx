import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { windowOfTolerance } from "@/data/nervous";
import { exercises } from "@/data/v1/exercises";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState } from "@/state/atlas-store";
import { WebGLGate } from "@/viz/WebGLGate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[2];

/* ── Relief-Landschaft ──────────────────────────────────────────────────────
   Plastisches Terrain mit echter Beleuchtung: Die Lichtkugel rollt über das
   Relief und wirft Schatten. Zonen lesen sich als Höhen (Hyper), weiche
   Mitte (Fenster) und Tiefe (Hypo) — dazwischen Nebel.                    */

const SEG_X = 130;
const SEG_Z = 72;
const W = 16;
const D = 9;

/** weiche Rampe zwischen a und b (funktioniert in beide Richtungen) */
function ss(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const ZONE_COLORS = {
  hypo: new THREE.Color("#5e6a99"),
  window: new THREE.Color("#6f9c86"),
  hyper: new THREE.Color("#b97a3e"),
};

/** Höhenfunktion des Reliefs: x quer (Erregungsachse), z in die Tiefe. */
function heightAt(x: number, z: number, t: number, time: number): number {
  const hyper = Math.max(t, 0);
  const hypo = Math.max(-t, 0);
  // Hyper-Kamm rechts: Höhen wachsen mit Überflutung
  const ridge = ss(1.4, 7.4, x) * (0.55 + hyper * 3.4);
  // Hypo-Becken links: Tiefe wächst mit Erstarrung
  const trench = ss(-1.4, -7.4, x) * (0.55 + hypo * 3.4);
  // weiche Mitte: das Fenster als ruhige Anhöhe
  const mound = 0.55 * Math.exp(-(x * x) / 3.0) * (1 - Math.abs(t) * 0.45);
  // feine Struktur — am Rande lebendig, im Fenster still
  const mask = 1 - Math.exp(-(x * x) / 2.6);
  const amp = (0.16 + Math.abs(t) * 1.35) * (0.25 + 0.75 * mask);
  const n =
    Math.sin(x * 1.6 + time * 0.32) * Math.cos(z * 1.25 - time * 0.21) * 0.55 +
    Math.sin(x * 3.05 - time * 0.14) * Math.sin(z * 2.1 + time * 0.17) * 0.3;
  return ridge - trench + mound + n * amp;
}

function ReliefStage({ arousal }: { arousal: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);
  const timeRef = useRef(0);
  const reduced = useReducedMotion();

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, D, SEG_X, SEG_Z);
    g.rotateX(-Math.PI / 2); // y = Höhe
    return g;
  }, []);
  const baseXZ = useMemo(() => {
    const pos = geometry.attributes.position;
    const arr = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      arr[i * 2] = pos.getX(i);
      arr[i * 2 + 1] = pos.getZ(i);
    }
    return arr;
  }, [geometry]);

  // Zonen-Farben je Vertex (statisch, nach Position auf der Erregungsachse)
  useMemo(() => {
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = baseXZ[i * 2];
      if (x < -1.4) c.copy(ZONE_COLORS.window).lerp(ZONE_COLORS.hypo, ss(-1.4, -6.5, x));
      else if (x > 1.4) c.copy(ZONE_COLORS.window).lerp(ZONE_COLORS.hyper, ss(1.4, 6.5, x));
      else c.copy(ZONE_COLORS.window);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [geometry, baseXZ]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!reduced) timeRef.current += delta;
    // weiches Nachlaufen der Erregung — Trägheit des Geländes
    tRef.current += (arousal - tRef.current) * Math.min(1, delta * 3.2);
    const t = tRef.current;
    const time = timeRef.current;

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = baseXZ[i * 2];
      const z = baseXZ[i * 2 + 1];
      pos.setY(i, heightAt(x, z, t, time));
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    // Lichtkugel rollt dem Erregungswert hinterher und WIRFT SICHTBARE SCHATTEN
    const ball = ballRef.current;
    if (ball) {
      const bx = Math.max(-6.8, Math.min(6.8, t * 6.2));
      const by = heightAt(bx, 0, t, time) + 0.5;
      ball.position.set(bx, by, 0);
      ball.rotation.z -= delta * (0.4 + Math.abs(t) * 2.4) * Math.sign(t || 1);
    }
  });

  return (
    <>
      <ambientLight intensity={0.32} color="#8a93b8" />
      <hemisphereLight args={["#3a3324", "#0a0806", 0.5]} />
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow position={[0, -0.4, 0]}>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.04} />
      </mesh>

      {/* die Lichtkugel: warm, leuchtend, schattenwerfend */}
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.34, 28, 28]} />
        <meshStandardMaterial
          color="#ffe9c4"
          emissive="#ffca7a"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
        <pointLight
          color="#ffd9a0"
          intensity={90}
          distance={16}
          decay={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.002}
        />
      </mesh>
    </>
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

/** Statischer Ersatz: Relief-Silhouette als SVG mit Lichtpunkt. */
function ReliefFallback({ arousal }: { arousal: number }) {
  const pts = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const x = -8 + (i / 80) * 16;
      const y = heightAt(x, 0, arousal, 0);
      arr.push(`${(x + 8) * 37.5},${170 - y * 34}`);
    }
    return arr.join(" ");
  }, [arousal]);
  const zone = arousal < -0.35 ? "#8b93c9" : arousal > 0.35 ? "#e2a35c" : "#7fb8a4";
  return (
    <div className="flex h-full items-center justify-center p-6">
      <svg viewBox="0 0 600 320" className="w-full max-w-2xl" role="img" aria-label={`Relief-Landschaft, Erregung ${arousal.toFixed(2)}`}>
        <polyline points={pts} fill="none" stroke={zone} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 12px ${zone})` }} />
        <circle cx={8 * 37.5 + arousal * 6.2 * 37.5} cy={170 - heightAt(Math.max(-6.8, Math.min(6.8, arousal * 6.2)), 0, arousal, 0) * 34} r="11" fill="#ffe9c4" style={{ filter: "drop-shadow(0 0 14px rgba(255,233,196,0.9))" }} />
        <text x="60" y="290" fontSize="11" fill="#8b93c9">Hypo · Tiefe</text>
        <text x="300" y="290" fontSize="11" fill="#7fb8a4" textAnchor="middle">Fenster</text>
        <text x="540" y="290" fontSize="11" fill="#e2a35c" textAnchor="end">Hyper · Höhe</text>
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

  const W2 = 260;
  const x = (v: number) => W2 / 2 + v * (W2 / 2 - 14);

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
        <rect x="14" y="26" width={(W2 / 2 - 14) * 0.65} height="16" rx="8" fill="#8b93c9" opacity="0.35" />
        <rect x={W2 / 2 - (W2 / 2 - 14) * 0.35} y="26" width={(W2 / 2 - 14) * 0.7} height="16" rx="8" fill="#7fb8a4" opacity="0.45" />
        <rect x={W2 - 14 - (W2 / 2 - 14) * 0.65} y="26" width={(W2 / 2 - 14) * 0.65} height="16" rx="8" fill="#e2a35c" opacity="0.35" />
        <line x1={x(arousal)} y1="14" x2={x(arousal)} y2="54" stroke={meta.color} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 6px ${meta.color})` }} />
        <circle cx={x(arousal)} cy="26" r="5" fill={meta.color} />
        <text x="14" y="72" fontSize="9" fill="#8b93c9">Hypo</text>
        <text x={W2 / 2} y="72" fontSize="9" fill="#7fb8a4" textAnchor="middle">Fenster</text>
        <text x={W2 - 14} y="72" fontSize="9" fill="#e2a35c" textAnchor="end">Hyper</text>
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
  const dragTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = (e.clientX - rect.left) / rect.width;
    setState({ arousal: Math.max(-1, Math.min(1, (vx - 0.5) * 2.4)) });
  };

  return (
    <div>
      <p className="mb-1 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Ziehe quer über das Relief oder bewege den Regler — das Land verformt sich live,
        die Lichtkugel rollt mit und wirft Schatten. Höhe ist Überflutung, Tiefe ist Erstarrung,
        die weiche Mitte ist dein Fenster.
      </p>
      <p className="mb-4 max-w-3xl text-base leading-relaxed text-white/70">{windowOfTolerance.body}</p>

      <section className="w-full px-1 py-2" aria-label="Das Toleranzfenster interaktiv erkunden">
        <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
          <div
            className="vignette relative h-[72vh] min-h-[540px] cursor-ew-resize overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906] touch-none select-none"
            onPointerDown={dragTo}
            onPointerMove={(e) => { if (e.buttons === 1) dragTo(e); }}
          >
            <WebGLGate
              className="absolute inset-0"
              camera={{ position: [0, 4.4, 9.8], fov: 46 }}
              shadows
              fallback={<ReliefFallback arousal={arousal} />}
            >
              <ReliefStage arousal={arousal} />
            </WebGLGate>

            {/* Zonen-Überlagerung */}
            <div className="pointer-events-none absolute inset-x-6 bottom-24 flex justify-between text-[11px] uppercase tracking-[0.22em]">
              <span className="text-[#8b93c9]/80">Hypo · Tiefe</span>
              <span className="text-[#7fb8a4]/80">Fenster</span>
              <span className="text-[#e2a35c]/80">Hyper · Höhe</span>
            </div>

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
      </section>
    </div>
  );
}
