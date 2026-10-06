import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import { ArrowDown, Orbit, Sparkles } from "lucide-react";
import { Nebula } from "@/viz/Nebula";
import { SilkBody } from "@/viz/SilkBody";
import { WebGLGate } from "@/viz/WebGLGate";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Disclaimer } from "@/components/Disclaimer";
import { CHAPTERS } from "@/views/chapters";
import { setState } from "@/state/atlas-store";
import kvStart from "@/assets/kv-start.jpg";

/** Kamerafahrt aus dem Nebel heraus auf die Konstellation. */
function CameraDrift() {
  const done = useRef(false);
  const t = useRef(0);
  useFrame((state, delta) => {
    if (done.current) return;
    t.current += delta;
    const k = Math.min(1, t.current / 7);
    const e = 1 - Math.pow(1 - k, 3);
    state.camera.position.set(
      Math.sin(e * Math.PI * 0.5) * 1.4,
      0.4 - e * 0.3,
      9.5 - e * 4.5,
    );
    state.camera.lookAt(0, 0, 0);
    if (k >= 1) done.current = true;
  });
  return null;
}

function StartCanvas() {
  return (
    <>
      <CameraDrift />
      <Nebula count={10000} radius={10} />
      <SilkBody scale={1.55} position={[0, -0.1, 0]} glow={1.15} speed={0.8} />
      <SilkBody scale={2.6} position={[0, -0.1, 0]} glow={0.35} speed={0.5} frost={0.25} colorA="#8b93c9" colorB="#8fd8cf" />
    </>
  );
}

const STATS = [
  { n: "124", label: "Knoten im Kosmos" },
  { n: "329", label: "typisierte Beziehungen" },
  { n: "36", label: "Disziplinen & Schulen" },
  { n: "16", label: "Trauma-Verfahren" },
  { n: "32", label: "Symptome in 6 Feldern" },
  { n: "12", label: "Regulations-Übungen" },
];

export default function StartView() {
  const reduced = useReducedMotion();

  return (
    <div>
      {/* ── Hero: Der Kosmos atmet ─────────────────────────── */}
      <section className="vignette relative flex h-[94vh] min-h-[560px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${kvStart})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.28 }} />
        <WebGLGate
          className="absolute inset-0"
          fog={false}
          camera={{ position: [0, 0.4, 9.5], fov: 50 }}
          fallback={<div className="h-full w-full" style={{ backgroundImage: `url(${kvStart})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
        >
          <StartCanvas />
        </WebGLGate>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0e0b08]/60 via-transparent to-[#0e0b08]" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9 }}
            className="mb-4 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[#8fd8cf]"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Traumaatlas 2 · Das Beziehungsuniversum
          </motion.p>
          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.7, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl font-light leading-[1.02] text-[#f5ead6] sm:text-7xl"
          >
            Nichts in der Trauma­therapie
            <br />
            <span className="text-gradient-warm">steht allein.</span>
          </motion.h1>
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 1 }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg"
          >
            Jede Schule hat Eltern. Jedes Verfahren behandelt bestimmte Muster.
            Jede Übung reguliert einen Zustand. Dieser Atlas zeigt keine Liste —
            er zeigt ein <em className="text-[#e8c9a0] not-italic">Universum von Beziehungen</em>:
            begehbar, leuchtend, zusammenhängend.
          </motion.p>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.9 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={() => {
                setState({ view: "kosmos" });
                window.scrollTo({ top: 0 });
              }}
              className="group flex items-center gap-2 rounded-full bg-[#e2a35c] px-7 py-3 text-sm font-semibold text-[#241505] shadow-[0_0_40px_rgba(226,163,92,0.35)] transition-all hover:shadow-[0_0_60px_rgba(226,163,92,0.55)]"
            >
              <Orbit className="h-4 w-4 transition-transform group-hover:rotate-45" aria-hidden />
              Den Kosmos betreten
            </button>
            <a
              href="#kapitel"
              className="flex items-center gap-2 rounded-full border border-white/15 px-7 py-3 text-sm text-white/75 backdrop-blur-sm transition-colors hover:border-[#8fd8cf]/40 hover:text-[#8fd8cf]"
            >
              <ArrowDown className="h-4 w-4" aria-hidden />
              Kapitel entdecken
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Zahlen des Universums ──────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8" aria-label="Zahlen des Atlas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.07, duration: 0.6 }}
              className="glass-soft rounded-2xl p-4 text-center"
            >
              <p className="font-display text-3xl text-[#e2a35c]">{s.n}</p>
              <p className="mt-1 text-[11px] leading-tight text-white/50">{s.label}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10">
          <Disclaimer />
        </div>
      </section>

      {/* ── Kapitel-Konstellation ──────────────────────────── */}
      <section id="kapitel" className="mx-auto max-w-5xl px-5 pb-24 sm:px-8" aria-label="Kapitel">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#e2a35c]">Zehn Kapitel — ein Kosmos</p>
            <h2 className="font-display mt-2 text-3xl font-light text-[#f3e7d3] sm:text-4xl">Jedes Kapitel ist ein visuelles Ereignis</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((c, i) => (
            <motion.button
              key={c.id}
              onClick={() => {
                setState({ view: c.id });
                window.scrollTo({ top: 0 });
              }}
              initial={reduced ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.6 }}
              whileHover={reduced ? undefined : { y: -4 }}
              className="chapter-hero group relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              <div
                className="hero-art transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${c.art})` }}
              />
              <div className="hero-veil" />
              <div className="relative flex h-full min-h-[220px] flex-col justify-end p-5">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#e2a35c]/90">
                  {c.index} · {c.kicker}
                </p>
                <h3 className="font-display mt-1 text-xl leading-snug text-[#f3e7d3]">{c.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  {c.sub}
                </p>
              </div>
            </motion.button>
          ))}
          {/* Kosmos-Karte als erster Eintrag ergänzt das Grid */}
          <motion.button
            onClick={() => {
              setState({ view: "kosmos" });
              window.scrollTo({ top: 0 });
            }}
            initial={reduced ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ delay: 0.16, duration: 0.6 }}
            whileHover={reduced ? undefined : { y: -4 }}
            className="chapter-hero group relative min-h-[220px] overflow-hidden rounded-2xl border border-[#e2a35c]/30 text-left"
          >
            <div className="hero-art transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${kvStart})` }} />
            <div className="hero-veil" />
            <div className="relative flex h-full min-h-[220px] flex-col justify-end p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8fd8cf]">01 · Herzstück</p>
              <h3 className="font-display mt-1 text-xl leading-snug text-[#f3e7d3]">Der große Graph</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                124 Knoten, 329 Beziehungen — die zentrale Erfahrung des Atlas.
              </p>
            </div>
          </motion.button>
        </div>
      </section>
    </div>
  );
}
