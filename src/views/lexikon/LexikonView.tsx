import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Thermometer } from "lucide-react";
import { exercises, type Exercise, type ExerciseEffect } from "@/data/v1/exercises";
import { CHAPTERS } from "@/views/chapters";
import { markPracticed } from "@/ocean/world";
import { ExerciseMedia } from "./ExerciseMedia";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[4];

const EFFECT_META: Record<ExerciseEffect, { label: string; color: string; desc: string }> = {
  hyper: { label: "Beruhigen", color: "#e2a35c", desc: "senkt Übererregung" },
  hypo: { label: "Aktivieren", color: "#8b93c9", desc: "löst Erstarrung" },
  both: { label: "Ausgleichen", color: "#7fb8a4", desc: "hält das Fenster offen" },
};

const CONTEXTS = ["Alle", "SOS", "Alltag", "Abend", "Begleitung"] as const;

/** Erregungs-Thermometer als Filter. */
function ThermometerFilter({ value, onChange }: { value: ExerciseEffect | "all"; onChange: (v: ExerciseEffect | "all") => void }) {
  const stops: { id: ExerciseEffect | "all"; label: string; color: string }[] = [
    { id: "all", label: "Alle", color: "#e8ddcb" },
    { id: "hyper", label: "Beruhigen", color: EFFECT_META.hyper.color },
    { id: "both", label: "Ausgleichen", color: EFFECT_META.both.color },
    { id: "hypo", label: "Aktivieren", color: EFFECT_META.hypo.color },
  ];
  return (
    <div role="group" aria-label="Filter nach Wirkung" className="glass-soft inline-flex flex-wrap items-center gap-1 rounded-full p-1">
      <Thermometer className="ml-2 h-4 w-4 text-white/40" aria-hidden />
      {stops.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          aria-pressed={value === s.id}
          className={`rounded-full px-4 py-1.5 text-xs transition-all ${
            value === s.id ? "font-semibold" : "text-white/55 hover:text-white/85"
          }`}
          style={
            value === s.id
              ? { background: `${s.color}22`, color: s.color, boxShadow: `0 0 16px ${s.color}33, inset 0 0 0 1px ${s.color}55` }
              : undefined
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Detail-Schaubild: Schritte als animierter Ablauf + Dauer als Zeitbalken. */
function ExerciseDetail({ ex, reduced }: { ex: Exercise; reduced: boolean }) {
  const meta = EFFECT_META[ex.effect];
  const maxMin = 15;
  const mins = parseInt(ex.minutes.match(/\d+/)?.[0] ?? "5", 10);
  const barW = Math.min(100, (mins / maxMin) * 100);

  return (
    <motion.div
      initial={reduced ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={reduced ? undefined : { height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="space-y-4 border-t border-white/[0.07] px-5 pb-6 pt-4">
        <ExerciseMedia id={ex.id} effect={ex.effect} large />
        {/* Dauer als Zeitbalken */}
        <div>
          <p className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
            <Clock className="h-3 w-3" aria-hidden /> Dauer: {ex.minutes}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${barW}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`, boxShadow: `0 0 10px ${meta.color}66` }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Ablauf</p>
          <ol className="relative space-y-3 border-l border-white/10 pl-5">
            {ex.steps.map((step, i) => (
              <motion.li
                key={i}
                initial={reduced ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="relative text-sm leading-relaxed text-white/75"
              >
                <span
                  className="absolute -left-[26.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#14100b]"
                  style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}88` }}
                />
                {step}
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="glass-soft rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Wann</p>
            <p className="mt-1 text-white/70">{ex.when}</p>
          </div>
          <div className="glass-soft rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Was es bewirkt</p>
            <p className="mt-1 text-white/70">{ex.goal}</p>
          </div>
        </div>

        {ex.note && <p className="rounded-xl border-l-2 border-l-[#7fb8a4]/60 bg-[#7fb8a4]/[0.06] p-3 text-xs leading-relaxed text-white/60">{ex.note}</p>}
        {ex.caution && <p className="rounded-xl border-l-2 border-l-[#c98a8a]/70 bg-[#c98a8a]/[0.07] p-3 text-xs leading-relaxed text-white/65">{ex.caution}</p>}
      </div>
    </motion.div>
  );
}

export default function LexikonView() {
  const reduced = useReducedMotion();
  const [effect, setEffect] = useState<ExerciseEffect | "all">("all");
  const [context, setContext] = useState<(typeof CONTEXTS)[number]>("Alle");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) => (effect === "all" || e.effect === effect) && (context === "Alle" || e.context === context),
      ),
    [effect, context],
  );

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Jedes Medium ist ein kurzer, ruhiger, dunkel-warmer Licht-Loop —
        Atemrhythmus statt Stock-Optik. Darunter der Schritt-für-Schritt-Ablauf.
      </p>

      <section className="w-full px-1 py-2" aria-label="Übungs-Lexikon">
        {/* Filter */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <ThermometerFilter value={effect} onChange={setEffect} />
          <div role="group" aria-label="Filter nach Kontext" className="flex flex-wrap gap-1.5">
            {CONTEXTS.map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                aria-pressed={context === c}
                className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                  context === c ? "border-white/25 bg-white/[0.07] text-[#f3e7d3]" : "border-white/10 text-white/50 hover:text-white/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-6 text-xs text-white/40">
          {filtered.length} von {exercises.length} Übungen · Das Thermometer filtert nach Wirkung im Nervensystem
        </p>

        {/* Glas-Slides */}
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((ex) => {
              const meta = EFFECT_META[ex.effect];
              const open = openId === ex.id;
              return (
                <motion.article
                  layout
                  key={ex.id}
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4 }}
                  className="glass-slide overflow-hidden rounded-2xl"
                  style={{ boxShadow: open ? `0 10px 40px rgba(0,0,0,0.4), 0 0 30px ${meta.color}14` : undefined }}
                >
                  <button
                    onClick={() => { setOpenId(open ? null : ex.id); if (!open) markPracticed(ex.id); }}
                    aria-expanded={open}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: `${meta.color}1e`, color: meta.color }}
                      >
                        {ex.effectLabel}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-white/40">
                        <Clock className="h-3 w-3" aria-hidden /> {ex.minutes}
                      </span>
                    </div>
                    <h2 className="font-display mt-3 text-xl leading-snug text-[#f3e7d3]">{ex.title}</h2>
                    <ExerciseMedia id={ex.id} effect={ex.effect} />
                    <p className="mt-1.5 text-xs text-white/45">{ex.context} · {meta.desc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="line-clamp-2 text-sm text-white/60">{ex.goal}</p>
                      <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                    </div>
                  </button>
                  <AnimatePresence>
                    {open && <ExerciseDetail ex={ex} reduced={reduced} />}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>

      </section>
    </div>
  );
}
