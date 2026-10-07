import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Play } from "lucide-react";
import { nervousStates, type NervousState, type NervousStateId } from "@/data/nervous";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { CHAPTERS } from "@/views/chapters";
import { WebGLGate } from "@/viz/WebGLGate";
import { SilkBody } from "@/viz/SilkBody";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { markPracticed } from "@/ocean/world";

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

/**
 * Interaktiver Radar: Jedes Segment ist anfassbar.
 * Berühren/Anklicken eines Signals hebt es hervor und zeigt es als Körpersignal-Karte —
 * so erkundet man die Signale eines Zustands selbst.
 */
function SignalRadar({
  state,
  felt,
  focusSignal,
  onFocus,
  reduced,
}: {
  state: NervousState;
  felt: Set<string>;
  focusSignal: string | null;
  onFocus: (s: string | null) => void;
  reduced: boolean;
}) {
  const signals = state.bodySignals;
  const n = signals.length;
  const cx = 120;
  const cy = 110;
  const R = 82;
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

  return (
    <svg viewBox="0 0 240 220" className="w-full" role="group" aria-label="Körpersignale-Radar — Segmente sind anfassbar">
      <defs>
        <radialGradient id={`radar-${state.id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={state.color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={state.color} stopOpacity="0.12" />
        </radialGradient>
      </defs>
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

      {/* anfassbare Segmente — je ein Kreissegment als große Hit-Fläche */}
      {signals.map((s, i) => {
        const a0 = angle(i) - Math.PI / n;
        const a1 = angle(i) + Math.PI / n;
        const p = (a: number, r: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        const d = `M ${cx},${cy} L ${p(a0, R)} A ${R},${R} 0 0 1 ${p(a1, R)} Z`;
        const isFocus = focusSignal === s;
        const isFelt = felt.has(s);
        return (
          <g key={s}>
            <path
              d={d}
              fill={isFocus ? state.color : isFelt ? `url(#radar-${state.id})` : "transparent"}
              fillOpacity={isFocus ? 0.32 : isFelt ? 0.55 : 0.02}
              stroke={isFocus ? state.color : "transparent"}
              strokeWidth={isFocus ? 1.5 : 0}
              style={{ cursor: "pointer", transition: reduced ? "none" : "fill-opacity 0.3s" }}
              onMouseEnter={() => onFocus(s)}
              onMouseLeave={() => onFocus(null)}
              onClick={() => onFocus(isFocus ? null : s)}
            >
              <title>{s}</title>
            </path>
            <circle
              cx={cx + Math.cos(angle(i)) * R * 0.92}
              cy={cy + Math.sin(angle(i)) * R * 0.92}
              r={isFocus ? 5 : 3.2}
              fill={isFelt ? state.color : "rgba(255,255,255,0.4)"}
              style={{ transition: reduced ? "none" : "r 0.25s" }}
              pointerEvents="none"
            />
          </g>
        );
      })}

      {/* Fokus-Signal als Textkarte */}
      {focusSignal && (
        <motion.g initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <rect x="40" y="96" width="160" height="30" rx="8" fill="rgba(10,8,6,0.85)" stroke={state.color} strokeOpacity="0.4" />
          <text x="120" y="115" textAnchor="middle" fontSize="10.5" fill="#f3e7d3">
            {focusSignal.length > 34 ? focusSignal.slice(0, 32) + "…" : focusSignal}
          </text>
        </motion.g>
      )}
    </svg>
  );
}

/** Körpersignal-Chips: selbst erkunden und ankreuzen, was man von sich kennt. */
function SignalChips({
  state,
  felt,
  onToggle,
}: {
  state: NervousState;
  felt: Set<string>;
  onToggle: (s: string) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Körpersignale, die ich von mir kenne">
      {state.bodySignals.map((s) => {
        const on = felt.has(s);
        return (
          <li key={s}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(s)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11.5px] leading-tight transition ${
                on ? "border-transparent text-[#14100b]" : "border-white/12 text-white/60 hover:border-white/25 hover:text-white/85"
              }`}
              style={on ? { background: state.color } : undefined}
              title={s}
            >
              {on && <Check className="h-3 w-3 shrink-0" aria-hidden />}
              {s.length > 42 ? s.slice(0, 40) + "…" : s}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Übungs-Start direkt aus der Zone: Schritte aufklappbar, Übung „starten" = praktizieren markieren. */
function ExerciseLauncher({ state }: { state: NervousState }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(
    () => state.exercises.map((id) => exercises.find((e) => e.id === id)).filter((e): e is (typeof exercises)[number] => !!e),
    [state],
  );
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Übungen für diesen Zustand — direkt starten</p>
      <ul className="space-y-1.5">
        {list.map((e) => {
          const open = openId === e.id;
          return (
            <li key={e.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => { setOpenId(open ? null : e.id); markPracticed(e.id); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="flex items-center gap-2 text-sm text-white/80">
                  <Play className="h-3 w-3 text-[#7fb8a4]" aria-hidden />
                  {e.title}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">{e.minutes}</span>
              </button>
              {open && (
                <div className="border-t border-white/[0.06] px-3 py-2.5">
                  <p className="text-[12px] italic leading-relaxed text-white/55">{e.when}</p>
                  <ol className="mt-2 space-y-1">
                    {e.steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-white/70">
                        <span className="shrink-0 font-display text-[#7fb8a4]">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {e.note && <p className="mt-2 text-[11px] text-[#8fd8cf]/80">Hinweis: {e.note}</p>}
                  {e.caution && <p className="mt-1 text-[11px] text-[#c98a8a]">Vorsicht: {e.caution}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PolyvagalView() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<NervousStateId>("ventral");
  const [feltByZone, setFeltByZone] = useState<Record<string, Set<string>>>({});
  const [focusSignal, setFocusSignal] = useState<string | null>(null);
  const state = nervousStates.find((s) => s.id === active)!;
  const zone = ZONE[active];
  const felt = feltByZone[active] ?? new Set<string>();

  const toggleFelt = (s: string) => {
    const next = new Set(felt);
    if (next.has(s)) next.delete(s); else next.add(s);
    setFeltByZone((m) => ({ ...m, [active]: next }));
  };

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Wähle einen Zustand, fahre über den Radar, um Körpersignale zu erkunden,
        kreuze an, was du von dir kennst — und starte eine Übung direkt daraus.
      </p>

      <section className="w-full px-1 py-2" aria-label="Die drei Zustände des autonomen Nervensystems">
        {/* Zustands-Wahl */}
        <div role="tablist" aria-label="Nervensystem-Zustand" className="mb-4 grid gap-2 sm:grid-cols-3">
          {nervousStates.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={active === s.id}
              onClick={() => { setActive(s.id); setFocusSignal(null); }}
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

        <div className="grid gap-4 lg:grid-cols-[1fr_370px]">
          {/* Morph-Bühne — VOLLE Bühne */}
          <div className="vignette relative h-[72vh] min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0906]">
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

          {/* Detail-Spalte: Beschreibung, interaktiver Radar, Signale, Übungen */}
          <motion.div
            key={state.id}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass space-y-4 overflow-y-auto rounded-2xl p-5"
          >
            <div>
              <h2 className="font-display text-2xl" style={{ color: state.color }}>{state.name}</h2>
              <p className="mt-1 text-sm italic text-white/55">„{state.feelsLike}"</p>
            </div>
            <p className="text-sm leading-relaxed text-white/75">{state.description}</p>

            <div>
              <p className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em] text-white/40">
                <span>Körpersignale — Radar anfassen</span>
                {felt.size > 0 && <span className="normal-case tracking-normal text-white/35">{felt.size} kenne ich</span>}
              </p>
              <SignalRadar state={state} felt={felt} focusSignal={focusSignal} onFocus={setFocusSignal} reduced={reduced} />
            </div>

            <SignalChips state={state} felt={felt} onToggle={toggleFelt} />

            <ExerciseLauncher state={state} />

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
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function zoneLabel(id: NervousStateId): string {
  return id === "ventral" ? "Sicherheit & Verbindung" : id === "sympathikus" ? "Alarm & Energie" : "Notbremse & Abschalten";
}
