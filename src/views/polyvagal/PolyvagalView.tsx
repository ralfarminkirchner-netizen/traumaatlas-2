import { useState } from "react";
import { motion } from "framer-motion";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { nervousStates, type NervousState, type NervousStateId } from "@/data/nervous";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { CHAPTERS } from "@/views/chapters";
import { WebGLGate } from "@/viz/WebGLGate";
import { SilkBody } from "@/viz/SilkBody";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[1];

/** Zonen-Parameter: ventral = warmes Gewebe, sympathikus = funkelndes Amber, dorsal = Kristall-Ebene */
const ZONE = {
  ventral: { colA: "#7fb8a4", colB: "#e2c98c", frost: 0, speed: 0.5, label: "warmes Gewebe" },
  sympathikus: { colA: "#e2a35c", colB: "#d97742", frost: 0, speed: 2.6, label: "funkelndes Amber" },
  dorsal: { colA: "#8b93c9", colB: "#aab3e0", frost: 1, speed: 0.06, label: "bläuliche Kristall-Ebene" },
} as const;

/** Drei ineinanderfließende, halbtransparente Zonen; die gewählte tritt hervor. */
function ZoneStage({ active }: { active: NervousStateId }) {
  return (
    <>
      {/* dorsale Kristall-Ebene (außen) */}
      <SilkBody
        scale={2.35}
        position={[0, 0, 0]}
        speed={ZONE.dorsal.speed}
        frost={ZONE.dorsal.frost}
        colorA={ZONE.dorsal.colA}
        colorB={ZONE.dorsal.colB}
        glow={active === "dorsal" ? 1.2 : 0.45}
        rotationSpeed={0.02}
      />
      {/* sympathisches Funkeln (Mitte) */}
      <SilkBody
        scale={1.75}
        position={[0, 0, 0]}
        speed={ZONE.sympathikus.speed}
        frost={ZONE.sympathikus.frost}
        colorA={ZONE.sympathikus.colA}
        colorB={ZONE.sympathikus.colB}
        glow={active === "sympathikus" ? 1.25 : 0.5}
        rotationSpeed={-0.05}
      />
      {/* ventrales warmes Gewebe (Kern) */}
      <SilkBody
        scale={1.2}
        position={[0, 0, 0]}
        speed={ZONE.ventral.speed}
        frost={ZONE.ventral.frost}
        colorA={ZONE.ventral.colA}
        colorB={ZONE.ventral.colB}
        glow={active === "ventral" ? 1.3 : 0.55}
        rotationSpeed={0.08}
      />
    </>
  );
}

/** Statischer Ersatz: drei konzentrische Zonen als SVG. */
function ZoneFallback({ active }: { active: NervousStateId }) {
  const rings: { id: NervousStateId; r: number; label: string }[] = [
    { id: "dorsal", r: 120, label: "Dorsaler Vagus" },
    { id: "sympathikus", r: 84, label: "Sympathikus" },
    { id: "ventral", r: 50, label: "Ventraler Vagus" },
  ];
  return (
    <div className="flex h-full items-center justify-center">
      <svg viewBox="0 0 300 300" className="h-[80%]" role="img" aria-label="Drei Zonen des autonomen Nervensystems">
        {rings.map((ring) => {
          const st = nervousStates.find((s) => s.id === ring.id)!;
          const on = ring.id === active;
          return (
            <g key={ring.id} opacity={on ? 1 : 0.35}>
              <circle cx="150" cy="150" r={ring.r} fill={st.color} fillOpacity={on ? 0.16 : 0.06} stroke={st.color} strokeOpacity={on ? 0.9 : 0.35} strokeWidth={on ? 2 : 1} strokeDasharray={ring.id === "dorsal" ? "4 5" : undefined} />
              <text x="150" y={150 - ring.r + 16} textAnchor="middle" fontSize="11" fill={on ? st.color : "#8a7f6e"} fontWeight={on ? 600 : 400}>
                {ring.label}
              </text>
            </g>
          );
        })}
        <circle cx="150" cy="150" r="14" fill={nervousStates.find((s) => s.id === active)!.color} />
      </svg>
    </div>
  );
}

/** Radar-Diagramm der Körpersignale (SVG, animiert). */
function SignalRadar({ state, reduced }: { state: NervousState; reduced: boolean }) {
  const signals = state.bodySignals;
  const n = signals.length;
  const cx = 110;
  const cy = 100;
  const R = 74;
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

  return (
    <svg viewBox="0 0 220 200" className="w-full" role="img" aria-label={`Körpersignale: ${signals.join(", ")}`}>
      {/* Gitter */}
      {[0.33, 0.66, 1].map((f) => (
        <polygon
          key={f}
          points={signals.map((_, i) => `${cx + Math.cos(angle(i)) * R * f},${cy + Math.sin(angle(i)) * R * f}`).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      {signals.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle(i)) * R} y2={cy + Math.sin(angle(i)) * R} stroke="rgba(255,255,255,0.08)" />
      ))}
      {/* Daten-Fläche */}
      <motion.polygon
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.75, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "110px 100px" }}
        points={signals.map((_, i) => `${cx + Math.cos(angle(i)) * R * 0.92},${cy + Math.sin(angle(i)) * R * 0.92}`).join(" ")}
        fill={state.color}
        fillOpacity={0.22}
        stroke={state.color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {signals.map((s, i) => (
        <g key={s}>
          <circle cx={cx + Math.cos(angle(i)) * R * 0.92} cy={cy + Math.sin(angle(i)) * R * 0.92} r="3" fill={state.color} />
          <text
            x={cx + Math.cos(angle(i)) * (R + 16)}
            y={cy + Math.sin(angle(i)) * (R + 12)}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.55)"
          >
            {s.length > 24 ? s.slice(0, 22) + "…" : s}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function PolyvagalView() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<NervousStateId>("ventral");
  const state = nervousStates.find((s) => s.id === active)!;
  const zone = ZONE[active];

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Die drei Zustände des autonomen Nervensystems">
        {/* Zustands-Wahl */}
        <div role="tablist" aria-label="Nervensystem-Zustand" className="mb-6 grid gap-2 sm:grid-cols-3">
          {nervousStates.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={active === s.id}
              onClick={() => setActive(s.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                active === s.id ? "border-white/25 bg-white/[0.06]" : "border-white/[0.07] hover:bg-white/[0.03]"
              }`}
              style={active === s.id ? { boxShadow: `0 0 40px ${s.color}22, inset 0 0 30px ${s.color}0d` } : undefined}
            >
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">{zoneLabel(s.id)}</span>
              </span>
              <span className="font-display mt-2 block text-lg leading-tight text-[#f3e7d3]">{s.short}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Morph-Bühne */}
          <div className="vignette relative h-[58vh] min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906]">
            <WebGLGate
              className="absolute inset-0"
              camera={{ position: [0, 0.4, 5.6], fov: 45 }}
              fallback={<ZoneFallback active={active} />}
            >
              <ZoneStage active={active} />
            </WebGLGate>
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/55 backdrop-blur-sm">
              Aktive Zone als {zone.label} — die anderen bleiben sichtbar, halbtransparent
            </div>
          </div>

          {/* Detail: Beschreibung + Radar + Zugehörige */}
          <motion.div
            key={state.id}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass space-y-5 rounded-2xl p-6"
          >
            <div>
              <h2 className="font-display text-2xl" style={{ color: state.color }}>{state.name}</h2>
              <p className="mt-1 text-sm italic text-white/55">„{state.feelsLike}"</p>
            </div>
            <p className="text-sm leading-relaxed text-white/75">{state.description}</p>

            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">Körpersignale</p>
              <SignalRadar state={state} reduced={reduced} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Übungen dafür</p>
                <ul className="space-y-1">
                  {state.exercises.map((id) => {
                    const e = exercises.find((x) => x.id === id);
                    return e ? (
                      <li key={id} className="flex items-center gap-2 text-sm text-white/70">
                        <span className="h-1 w-1 rounded-full bg-[#7fb8a4]" /> {e.title}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Verfahren, die hier ansetzen</p>
                <ul className="space-y-1">
                  {state.methods.map((id) => {
                    const m = methods.find((x) => x.id === id);
                    return m ? (
                      <li key={id} className="flex items-center gap-2 text-sm text-white/70">
                        <span className="h-1 w-1 rounded-full bg-[#d9a05b]" /> {m.name}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}

function zoneLabel(id: NervousStateId): string {
  return id === "ventral" ? "Sicherheit & Verbindung" : id === "sympathikus" ? "Alarm & Energie" : "Notbremse & Abschalten";
}
