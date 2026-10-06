import { useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { disciplines, groups, type DisciplineNode } from "@/data/v1/disciplines";
import { methods } from "@/data/v1/methods";
import { CHAPTERS } from "@/views/chapters";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import epAntike from "@/assets/gen/ep-antike.jpg";
import epAufklaerung from "@/assets/gen/ep-aufklaerung.jpg";
import epFreud from "@/assets/gen/ep-freud.jpg";
import epNachkrieg from "@/assets/gen/ep-nachkrieg.jpg";
import epHeute from "@/assets/gen/ep-heute.jpg";

const chapter = CHAPTERS[5];

const MIN_YEAR = -450;
const MAX_YEAR = 2026;
const W = 8600;
const xOf = (year: number) => ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * W;

const EPOCHS = [
  { from: MIN_YEAR, to: 1800, label: "Antike & Frühzeit", line: "Seelenlehre, Philosophie, erste Systematik des Erlebens.", tint: "#8a7f6e", art: epAntike },
  { from: 1800, to: 1900, label: "Aufklärung & Wissenschaft", line: "Empirismus, Experimentalpsychologie, Hypnoseforschung.", tint: "#9aa8c7", art: epAufklaerung },
  { from: 1900, to: 1945, label: "Freud, Krieg, Exil", line: "Psychoanalyse, Behaviorismus, Reichs Körperarbeit — im Schatten der Kriege.", tint: "#c98a8a", art: epFreud },
  { from: 1945, to: 1990, label: "Nachkrieg & Körper", line: "Humanismus, KVT, Bioenergetik, Feldenkrais, Bindungsforschung.", tint: "#d9a05b", art: epNachkrieg },
  { from: 1990, to: MAX_YEAR, label: "Das Trauma-Zeitalter", line: "Polyvagal, EMDR, Komplextrauma-Forschung — das Nervensystem wird zur Karte.", tint: "#7fb8a4", art: epHeute },
];

const discY = 380;
const methY = 640;

type HoverNode = { kind: "discipline" | "method"; id: string };

/** Monogramm (Initialen) für Hover-Karte */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-ZÄÖÜ]/.test(w));
  const pick = words.length >= 2 ? [words[0], words[1]] : [name.slice(0, 2)];
  return pick.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function StammbaumView() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverNode | null>(null);
  const [progress, setProgress] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -(W - 1180)]);
  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

  const eraIdx = Math.min(EPOCHS.length - 1, Math.floor(progress * EPOCHS.length * 1.02));

  /** Label-Positionen: Seite (oben/unten) + Ebene gegen Überschneidungen. */
  const labelLayout = useMemo(() => {
    const sorted = [...disciplines].sort((a, b) => a.year - b.year);
    const placed: { x: number; side: 0 | 1; tier: number }[] = [];
    const map = new Map<string, { side: 0 | 1; tier: number }>();
    sorted.forEach((d, i) => {
      const px = xOf(d.year);
      const side: 0 | 1 = (i % 2) as 0 | 1;
      let tier = 0;
      for (const pl of placed) {
        if (pl.side === side && Math.abs(pl.x - px) < 200) tier = Math.max(tier, pl.tier + 1);
      }
      tier = Math.min(tier, 3);
      placed.push({ x: px, side, tier });
      map.set(d.id, { side, tier });
    });
    return map;
  }, []);

  /** Label-Positionen Verfahren-Bahn (kompaktere Fenster). */
  const methodLabelLayout = useMemo(() => {
    const sorted = [...methods].sort((a, b) => a.year - b.year);
    const placed: { x: number; side: 0 | 1; tier: number }[] = [];
    const map = new Map<string, { side: 0 | 1; tier: number }>();
    sorted.forEach((m, i) => {
      const px = xOf(m.year);
      const side: 0 | 1 = (i % 2) as 0 | 1;
      let tier = 0;
      for (const pl of placed) {
        if (pl.side === side && Math.abs(pl.x - px) < 170) tier = Math.max(tier, pl.tier + 1);
      }
      tier = Math.min(tier, 3);
      placed.push({ x: px, side, tier });
      map.set(m.id, { side, tier });
    });
    return map;
  }, []);

  const hoverData = useMemo(() => {
    if (!hover) return null;
    if (hover.kind === "discipline") {
      const d = disciplines.find((x) => x.id === hover.id)!;
      return {
        title: d.name, founder: d.founder, year: d.year, body: d.summary,
        color: groups[d.group].color, keyFigures: d.keyFigures, group: groups[d.group].label,
      };
    }
    const m = methods.find((x) => x.id === hover.id)!;
    return { title: m.name, founder: m.founder, year: m.year, body: m.what, color: "#e2a35c", keyFigures: m.focusShort, group: "Trauma-Verfahren" };
  }, [hover]);

  const timeline = (
    <div className="relative" style={{ width: W, height: 780 }}>
      {/* Epochen-Paneele */}
      {EPOCHS.map((e, i) => {
        const x0 = xOf(e.from);
        const w = xOf(e.to) - xOf(e.from);
        return (
          <div
            key={e.label}
            className="absolute inset-y-0 overflow-hidden"
            style={{
              left: x0,
              width: w,
              borderLeft: i === 0 ? undefined : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* passender Epochen-Hintergrund, vollflächig */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${e.art})`,
                backgroundSize: "cover",
                backgroundPosition: `${i === 0 ? "left" : i === EPOCHS.length - 1 ? "right" : "center"} center`,
                opacity: 0.5,
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, rgba(14,11,8,0.72) 0%, rgba(14,11,8,0.25) 40%, rgba(14,11,8,0.86) 100%)` }}
              aria-hidden="true"
            />
            <div className="absolute left-10 top-10">
              <p className="font-display text-6xl font-light" style={{ color: `${e.tint}55` }}>
                {i + 1}
              </p>
              <p className="mt-2 text-sm uppercase tracking-[0.3em]" style={{ color: e.tint }}>
                {e.label}
              </p>
              <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-white/45">{e.line}</p>
              <p className="mt-2 text-[11px] text-white/30">
                {e.from < 0 ? `${Math.abs(e.from)} v. Chr.` : e.from} — {e.to >= MAX_YEAR ? "heute" : e.to}
              </p>
            </div>
          </div>
        );
      })}

      {/* Jahr-Achse */}
      <div className="absolute left-0 right-0 top-[510px] h-px bg-gradient-to-r from-transparent via-[#e2a35c]/50 to-transparent" />
      <svg className="absolute inset-x-0 top-[500px] h-8 w-full" aria-hidden="true">
        {Array.from({ length: 25 }, (_, i) => MIN_YEAR + i * 100).map((y) => (
          <g key={y} transform={`translate(${xOf(y)}, 10)`}>
            <line y1="0" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <text y="26" textAnchor="middle" fontSize="12" fill="rgba(255,255,255,0.4)">
              {y <= 0 ? `${Math.abs(y)} v. Chr.` : y}
            </text>
          </g>
        ))}
      </svg>

      {/* Lichtspuren Eltern → Kinder (zeichnen sich beim Scrollen) */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <filter id="trailglow2" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {disciplines.flatMap((d: DisciplineNode) =>
          d.parents.map((p) => {
            const parent = disciplines.find((x) => x.id === p);
            if (!parent) return null;
            const x0 = xOf(parent.year), x1 = xOf(d.year);
            const mx = (x0 + x1) / 2;
            return (
              <motion.path
                key={`${p}-${d.id}`}
                d={`M ${x0} ${discY} C ${mx} ${discY - 110}, ${mx} ${discY - 110}, ${x1} ${discY}`}
                fill="none"
                stroke="#9aa8c7"
                strokeOpacity="0.55"
                strokeWidth="2.2"
                filter="url(#trailglow2)"
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ root: sectionRef, margin: "0px -20% 0px 0px" }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
            );
          }),
        )}
        {methods
          .filter((m) => disciplines.some((d) => d.id === m.id))
          .map((m) => {
            const d = disciplines.find((x) => x.id === m.id)!;
            return (
              <motion.path
                key={`f-${m.id}`}
                d={`M ${xOf(d.year)} ${discY} C ${xOf(d.year)} ${discY + 130}, ${xOf(m.year)} ${methY - 130}, ${xOf(m.year)} ${methY}`}
                fill="none"
                stroke="#e2a35c"
                strokeOpacity="0.6"
                strokeWidth="2.2"
                strokeDasharray="7 6"
                filter="url(#trailglow2)"
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ root: sectionRef, margin: "0px -20% 0px 0px" }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
            );
          })}
      </svg>

      {/* Disziplinen-Stationen */}
      {disciplines.map((d) => {
        const px = xOf(d.year);
        const g = groups[d.group];
        const lay = labelLayout.get(d.id) ?? { side: 0 as const, tier: 0 };
        const above = lay.side === 0;
        const isHover = hover?.id === d.id;
        return (
          <button
            key={d.id}
            onMouseEnter={() => setHover({ kind: "discipline", id: d.id })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: "discipline", id: d.id })}
            onBlur={() => setHover(null)}
            className="group absolute -translate-x-1/2"
            style={{ left: px, top: discY }}
            aria-label={`${d.name} (${d.year})`}
          >
            <span className="relative block h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-[#0e0b08] transition-transform group-hover:scale-125"
              style={{ background: g.color, boxShadow: isHover ? `0 0 30px ${g.color}` : `0 0 14px ${g.color}99` }} />
            <span
              className={`absolute left-1/2 w-44 -translate-x-1/2 text-center transition-colors ${
                isHover ? "text-[#f3e7d3]" : "text-white/60"
              }`}
              style={{
                ...(above ? { bottom: 24 + lay.tier * 34 } : { top: 20 + lay.tier * 34 }),
                fontSize: 13,
                lineHeight: 1.25,
                textShadow: isHover ? `0 0 14px ${g.color}` : "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {d.name}
              <span className="mt-0.5 block text-[10px] text-white/40">{d.year < 0 ? `${Math.abs(d.year)} v. Chr.` : d.year}{d.founder ? ` · ${d.founder.split(";")[0].split(",")[0]}` : ""}</span>
            </span>
          </button>
        );
      })}

      {/* Verfahren-Stationen */}
      {methods.map((m) => {
        const px = xOf(m.year);
        const lay = methodLabelLayout.get(m.id) ?? { side: 0 as const, tier: 0 };
        const above = lay.side === 0;
        const isHover = hover?.id === m.id;
        return (
          <button
            key={m.id}
            onMouseEnter={() => setHover({ kind: "method", id: m.id })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: "method", id: m.id })}
            onBlur={() => setHover(null)}
            className="group absolute -translate-x-1/2"
            style={{ left: px, top: methY }}
            aria-label={`${m.name} (${m.year})`}
          >
            <span className="relative block h-4 w-4 -translate-y-1/2 rotate-45 border-2 border-[#0e0b08] transition-transform group-hover:scale-125"
              style={{ background: "#e2a35c", boxShadow: isHover ? "0 0 26px #e2a35c" : "0 0 12px #e2a35c88" }} />
            <span
              className={`absolute left-1/2 w-40 -translate-x-1/2 text-center transition-colors ${
                isHover ? "text-[#f3e7d3]" : "text-white/60"
              }`}
              style={{
                ...(above ? { bottom: 20 + lay.tier * 30 } : { top: 16 + lay.tier * 30 }),
                fontSize: 12,
                lineHeight: 1.25,
                textShadow: isHover ? "0 0 12px #e2a35c" : "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {m.name}
              <span className="mt-0.5 block text-[10px] text-white/40">{m.year}</span>
            </span>
          </button>
        );
      })}

      <span className="absolute left-8 top-[330px] text-[11px] uppercase tracking-[0.3em] text-white/40">Schulen · Theorien · Körperansätze</span>
      <span className="absolute left-8 top-[700px] text-[11px] uppercase tracking-[0.3em] text-white/40">Trauma-Verfahren</span>
    </div>
  );

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      {reduced ? (
        <section className="py-10" aria-label="Zeitleiste (statisch)">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="mx-5 rounded-2xl border border-white/10 bg-[#0b0906]">{timeline}</div>
          </div>
          <p className="mt-3 px-5 text-center text-xs text-white/40">Statische Ansicht — horizontal scrollbar. Stationen berühren für Details.</p>
        </section>
      ) : (
        <section ref={sectionRef} className="relative h-[420vh]" aria-label="Zeitleiste mit Kamerafahrt">
          <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
            <motion.div style={{ x }} className="will-change-transform">
              <div
                className="mx-5 rounded-2xl border border-white/10"
                style={{ width: W, backgroundImage: `url(${chapter.art})`, backgroundSize: "1500px", backgroundColor: "#0b0906" }}
              >
                {timeline}
              </div>
            </motion.div>

            {/* Epoch-Fortschritt (links) */}
            <div className="absolute left-8 top-1/2 flex -translate-y-1/2 flex-col gap-2">
              {EPOCHS.map((e, i) => (
                <span
                  key={e.label}
                  className="h-8 w-1 rounded-full transition-all"
                  style={{ background: i === eraIdx ? e.tint : "rgba(255,255,255,0.12)", boxShadow: i === eraIdx ? `0 0 10px ${e.tint}` : undefined }}
                />
              ))}
            </div>

            {/* Hover-Karte */}
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-5" aria-live="polite">
              {hoverData ? (
                <motion.div
                  key={hoverData.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex max-w-2xl items-start gap-4 rounded-2xl p-5"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg"
                    style={{ background: `${hoverData.color}22`, color: hoverData.color, border: `1px solid ${hoverData.color}55` }}
                  >
                    {monogram(hoverData.title)}
                  </span>
                  <span>
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <h2 className="font-display text-xl" style={{ color: hoverData.color }}>{hoverData.title}</h2>
                      <span className="text-xs text-white/45">
                        {hoverData.year < 0 ? `${Math.abs(hoverData.year)} v. Chr.` : hoverData.year} · {hoverData.founder}
                      </span>
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/70">{hoverData.body}</p>
                    {hoverData.keyFigures && <p className="mt-1 text-[11px] text-white/40">{hoverData.group} — {hoverData.keyFigures}</p>}
                  </span>
                </motion.div>
              ) : (
                <p className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-white/45 backdrop-blur-sm">
                  Scrollen Sie durch 2.500 Jahre · Stationen berühren für Karteikarten
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="glass-soft flex flex-wrap gap-x-6 gap-y-2 rounded-2xl p-5">
          {Object.values(groups).map((g) => (
            <span key={g.label} className="flex items-center gap-2 text-sm text-white/65">
              <span className="h-3 w-3 rounded-full" style={{ background: g.color, boxShadow: `0 0 10px ${g.color}` }} />
              {g.label}
            </span>
          ))}
          <span className="flex items-center gap-2 text-sm text-white/65">
            <span className="h-3 w-3 rotate-45 bg-[#e2a35c]" style={{ boxShadow: "0 0 10px #e2a35c" }} />
            Trauma-Verfahren (untere Bahn)
          </span>
        </div>
        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
