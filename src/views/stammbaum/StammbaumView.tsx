import { useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { disciplines, groups, type DisciplineNode } from "@/data/v1/disciplines";
import { methods } from "@/data/v1/methods";
import { CHAPTERS } from "@/views/chapters";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { PORTRAITS, PHOTO_IDS } from "@/views/kosmos/nodeAssets";

const chapter = CHAPTERS[5];

const MIN_YEAR = -450;
const MAX_YEAR = 2026;
const W = 8600;
const xOf = (year: number) => ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * W;

/** Epochen als RÄUME: Tinte, Jahresspanne, Lichtsäulen-Farbe */
const EPOCHS = [
  { from: MIN_YEAR, to: 1800, label: "Antike & Frühzeit", line: "Seelenlehre, Philosophie, erste Systematik des Erlebens.", tint: "#8a7f6e" },
  { from: 1800, to: 1900, label: "Aufklärung & Wissenschaft", line: "Empirismus, Experimentalpsychologie, Hypnoseforschung.", tint: "#9aa8c7" },
  { from: 1900, to: 1945, label: "Freud, Krieg, Exil", line: "Psychoanalyse, Behaviorismus, Reichs Körperarbeit — im Schatten der Kriege.", tint: "#c98a8a" },
  { from: 1945, to: 1990, label: "Nachkrieg & Körper", line: "Humanismus, KVT, Bioenergetik, Feldenkrais, Bindungsforschung.", tint: "#d9a05b" },
  { from: 1990, to: MAX_YEAR, label: "Das Trauma-Zeitalter", line: "Polyvagal, EMDR, Komplextrauma-Forschung — das Nervensystem wird zur Karte.", tint: "#7fb8a4" },
];

const WALL_Y = 240;        // Höhe der Porträt-Wand
const FLOOR_Y = 560;       // Bodenlinie der Lichtspuren
const METH_Y = 660;        // Verfahren-Bahn (tiefer im Boden)

type HoverNode = { kind: "discipline" | "method"; id: string };

function yearLabel(y: number) {
  return y < 0 ? `${Math.abs(y)} v. Chr.` : String(y);
}

/** Monogramm für Hover-Karte */
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

  /** Kompakte Namensschilder über/unter der Wand, Überschneidungen vermeiden. */
  const labelLayout = useMemo(() => {
    const sorted = [...disciplines].sort((a, b) => a.year - b.year);
    const placed: { x: number; side: 0 | 1; tier: number }[] = [];
    const map = new Map<string, { side: 0 | 1; tier: number }>();
    sorted.forEach((d, i) => {
      const px = xOf(d.year);
      const side: 0 | 1 = (i % 2) as 0 | 1;
      let tier = 0;
      for (const pl of placed) {
        if (pl.side === side && Math.abs(pl.x - px) < 230) tier = Math.max(tier, pl.tier + 1);
      }
      tier = Math.min(tier, 3);
      placed.push({ x: px, side, tier });
      map.set(d.id, { side, tier });
    });
    return map;
  }, []);

  const methodLabelLayout = useMemo(() => {
    const sorted = [...methods].sort((a, b) => a.year - b.year);
    const placed: { x: number; side: 0 | 1; tier: number }[] = [];
    const map = new Map<string, { side: 0 | 1; tier: number }>();
    sorted.forEach((m, i) => {
      const px = xOf(m.year);
      const side: 0 | 1 = (i % 2) as 0 | 1;
      let tier = 0;
      for (const pl of placed) {
        if (pl.side === side && Math.abs(pl.x - px) < 180) tier = Math.max(tier, pl.tier + 1);
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
        portrait: PORTRAITS[d.id] ?? null, photo: PHOTO_IDS.has(d.id),
      };
    }
    const m = methods.find((x) => x.id === hover.id)!;
    return {
      title: m.name, founder: m.founder, year: m.year, body: m.what, color: "#e2a35c",
      keyFigures: m.focusShort, group: "Trauma-Verfahren",
      portrait: PORTRAITS[`m:${m.id}`] ?? null, photo: PHOTO_IDS.has(`m:${m.id}`),
    };
  }, [hover]);

  const hall = (
    <div className="relative" style={{ width: W, height: 780 }}>
      {/* Raum-Grund: dunkle Halle mit bodentiefer Tiefenstimmung */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0b0906 0%, #0d0a07 45%, #090705 78%, #060403 100%)",
        }}
        aria-hidden="true"
      />

      {/* Epochen-Räume: Tintentransparenz + Lichtsäulen an den Grenzen */}
      {EPOCHS.map((e, i) => {
        const x0 = xOf(e.from);
        const w = xOf(e.to) - xOf(e.from);
        return (
          <div key={e.label} className="absolute inset-y-0" style={{ left: x0, width: w }}>
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(180deg, ${e.tint}0a 0%, transparent 40%, ${e.tint}08 100%)` }}
              aria-hidden="true"
            />
            {/* Raum-Inschrift */}
            <div className="absolute left-10 top-8">
              <p className="font-display text-5xl font-light" style={{ color: `${e.tint}44` }}>{i + 1}</p>
              <p className="mt-1 text-[13px] uppercase tracking-[0.3em]" style={{ color: e.tint }}>{e.label}</p>
              <p className="mt-1 max-w-[250px] text-[11px] leading-relaxed text-white/40">{e.line}</p>
              <p className="mt-1.5 text-[10px] text-white/28">{yearLabel(e.from)} — {e.to >= MAX_YEAR ? "heute" : e.to}</p>
            </div>
            {/* Lichtsäule am Raumanfang */}
            <div
              className="absolute inset-y-0 left-0 w-px"
              style={{ background: `linear-gradient(180deg, transparent, ${e.tint}66 30%, ${e.tint}66 70%, transparent)`, boxShadow: `0 0 22px ${e.tint}44` }}
              aria-hidden="true"
            />
            {i === EPOCHS.length - 1 && (
              <div
                className="absolute inset-y-0 right-0 w-px"
                style={{ background: `linear-gradient(180deg, transparent, ${e.tint}55 30%, ${e.tint}55 70%, transparent)`, boxShadow: `0 0 18px ${e.tint}33` }}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}

      {/* Wand-Linie (die Halle trägt die Porträts) */}
      <div className="absolute left-0 right-0 top-[132px] h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

      {/* Jahr-Skala am Boden */}
      <svg className="absolute inset-x-0 h-8 w-full" style={{ top: FLOOR_Y - 6 }} aria-hidden="true">
        {Array.from({ length: 25 }, (_, i) => MIN_YEAR + i * 100).map((y) => (
          <g key={y} transform={`translate(${xOf(y)}, 0)`}>
            <line y1="0" y2="10" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <text y="24" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.32)">{yearLabel(y)}</text>
          </g>
        ))}
      </svg>

      {/* Lebenslinien als Bodenlichtspuren Eltern → Kinder */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <filter id="floorlight" x="-40%" y="-40%" width="180%" height="180%">
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
                d={`M ${x0} ${WALL_Y + 66} C ${mx} ${FLOOR_Y - 4}, ${mx} ${FLOOR_Y - 4}, ${x1} ${WALL_Y + 66}`}
                fill="none"
                stroke="#9aa8c7"
                strokeOpacity="0.5"
                strokeWidth="2.2"
                filter="url(#floorlight)"
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
                d={`M ${xOf(d.year)} ${WALL_Y + 66} C ${xOf(d.year)} ${FLOOR_Y + 40}, ${xOf(m.year)} ${METH_Y - 60}, ${xOf(m.year)} ${METH_Y}`}
                fill="none"
                stroke="#e2a35c"
                strokeOpacity="0.55"
                strokeWidth="2.2"
                strokeDasharray="7 6"
                filter="url(#floorlight)"
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ root: sectionRef, margin: "0px -20% 0px 0px" }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
              />
            );
          })}
      </svg>

      {/* Porträt-Wand: große Medaillons für die Ahnen mit echtem Bild */}
      {disciplines.map((d) => {
        const px = xOf(d.year);
        const g = groups[d.group];
        const portrait = PORTRAITS[d.id];
        const isHover = hover?.id === d.id;
        if (portrait) {
          return (
            <button
              key={d.id}
              onMouseEnter={() => setHover({ kind: "discipline", id: d.id })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "discipline", id: d.id })}
              onBlur={() => setHover(null)}
              className="group absolute -translate-x-1/2"
              style={{ left: px, top: WALL_Y }}
              aria-label={`${d.name} (${yearLabel(d.year)})`}
            >
              <span
                className="relative block h-[112px] w-[112px] -translate-y-1/2 overflow-hidden rounded-full border-2 transition-transform group-hover:scale-105"
                style={{
                  borderColor: isHover ? g.color : "rgba(232,201,160,0.35)",
                  boxShadow: isHover ? `0 0 44px ${g.color}88` : `0 0 24px rgba(0,0,0,0.7), 0 0 18px ${g.color}33`,
                }}
              >
                <img src={portrait} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                <span className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 24px rgba(20,12,6,0.55)" }} aria-hidden="true" />
              </span>
              <span
                className="absolute left-1/2 top-[70px] w-44 -translate-x-1/2 text-center"
                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.95)" }}
              >
                <span className={`block text-[13px] leading-tight transition-colors ${isHover ? "text-[#f3e7d3]" : "text-white/75"}`}>
                  {d.name}
                </span>
                <span className="mt-0.5 block text-[10px] text-white/40">
                  {yearLabel(d.year)}{d.founder ? ` · ${d.founder.split(";")[0].split(",")[0]}` : ""}
                </span>
              </span>
            </button>
          );
        }
        // ohne Porträt: kleine Wand-Lampe
        const lay = labelLayout.get(d.id) ?? { side: 0 as const, tier: 0 };
        const above = lay.side === 0;
        return (
          <button
            key={d.id}
            onMouseEnter={() => setHover({ kind: "discipline", id: d.id })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: "discipline", id: d.id })}
            onBlur={() => setHover(null)}
            className="group absolute -translate-x-1/2"
            style={{ left: px, top: WALL_Y + 40 }}
            aria-label={`${d.name} (${yearLabel(d.year)})`}
          >
            <span
              className="relative block h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#0e0b08] transition-transform group-hover:scale-125"
              style={{ background: g.color, boxShadow: isHover ? `0 0 26px ${g.color}` : `0 0 12px ${g.color}88` }}
            />
            <span
              className={`absolute left-1/2 w-40 -translate-x-1/2 text-center ${isHover ? "text-[#f3e7d3]" : "text-white/55"}`}
              style={{
                ...(above ? { bottom: 18 + lay.tier * 30 } : { top: 14 + lay.tier * 30 }),
                fontSize: 12,
                lineHeight: 1.25,
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {d.name}
              <span className="mt-0.5 block text-[10px] text-white/38">{yearLabel(d.year)}</span>
            </span>
          </button>
        );
      })}

      {/* Verfahren-Bahn im Bodenbereich */}
      {methods.map((m) => {
        const px = xOf(m.year);
        const lay = methodLabelLayout.get(m.id) ?? { side: 0 as const, tier: 0 };
        const above = lay.side === 0;
        const isHover = hover?.id === m.id;
        const portrait = PORTRAITS[`m:${m.id}`];
        return (
          <button
            key={m.id}
            onMouseEnter={() => setHover({ kind: "method", id: m.id })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ kind: "method", id: m.id })}
            onBlur={() => setHover(null)}
            className="group absolute -translate-x-1/2"
            style={{ left: px, top: METH_Y }}
            aria-label={`${m.name} (${m.year})`}
          >
            {portrait ? (
              <span
                className="relative block h-14 w-14 -translate-y-1/2 overflow-hidden rounded-full border-2 transition-transform group-hover:scale-105"
                style={{
                  borderColor: isHover ? "#e2a35c" : "rgba(226,178,120,0.4)",
                  boxShadow: isHover ? "0 0 30px #e2a35c99" : "0 0 16px rgba(0,0,0,0.7)",
                }}
              >
                <img src={portrait} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </span>
            ) : (
              <span
                className="relative block h-4 w-4 -translate-y-1/2 rotate-45 border-2 border-[#0e0b08] transition-transform group-hover:scale-125"
                style={{ background: "#e2a35c", boxShadow: isHover ? "0 0 24px #e2a35c" : "0 0 12px #e2a35c88" }}
              />
            )}
            <span
              className={`absolute left-1/2 w-36 -translate-x-1/2 text-center ${isHover ? "text-[#f3e7d3]" : "text-white/55"}`}
              style={{
                ...(above ? { bottom: (portrait ? 36 : 16) + lay.tier * 28 } : { top: (portrait ? 38 : 16) + lay.tier * 28 }),
                fontSize: 11.5,
                lineHeight: 1.25,
                textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              }}
            >
              {m.name}
              <span className="mt-0.5 block text-[10px] text-white/38">{m.year}</span>
            </span>
          </button>
        );
      })}

      {/* Bahn-Beschriftungen */}
      <span className="absolute left-8 top-[196px] text-[10px] uppercase tracking-[0.3em] text-white/32">Die Wand der Ahnen</span>
      <span className="absolute left-8 text-[10px] uppercase tracking-[0.3em] text-white/32" style={{ top: METH_Y + 44 }}>Trauma-Verfahren · untere Bahn</span>
    </div>
  );

  return (
    <div>
      <p className="mb-1 max-w-3xl px-1 text-sm leading-relaxed text-white/55">
        {chapter.sub} Eine Halle zum Durchwandern: Die Ahnen hängen als echte Porträts an der Wand,
        ihre Lebenslinien ziehen sich als Lichtspuren über den Boden — Epoche für Epoche, Raum für Raum.
        Stationen berühren für Karteikarten.
      </p>

      {reduced ? (
        <section className="py-6" aria-label="Halle der Ahnen (statisch)">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="mx-2 rounded-2xl border border-white/10">{hall}</div>
          </div>
          <p className="mt-3 text-center text-xs text-white/40">Statische Ansicht — horizontal scrollbar. Stationen berühren für Details.</p>
        </section>
      ) : (
        <section ref={sectionRef} className="relative h-[420vh]" aria-label="Halle der Ahnen mit Kamerafahrt">
          <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
            <motion.div style={{ x }} className="will-change-transform">
              <div className="mx-2 rounded-2xl border border-white/10" style={{ width: W, backgroundColor: "#0b0906" }}>
                {hall}
              </div>
            </motion.div>

            {/* Raum-Fortschritt */}
            <div className="absolute left-6 top-1/2 flex -translate-y-1/2 flex-col gap-2">
              {EPOCHS.map((e, i) => (
                <span
                  key={e.label}
                  className="h-8 w-1 rounded-full transition-all"
                  style={{ background: i === eraIdx ? e.tint : "rgba(255,255,255,0.12)", boxShadow: i === eraIdx ? `0 0 10px ${e.tint}` : undefined }}
                />
              ))}
            </div>

            {/* Karteikarte */}
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-5" aria-live="polite">
              {hoverData ? (
                <motion.div
                  key={hoverData.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass flex max-w-2xl items-start gap-4 rounded-2xl p-4"
                >
                  {hoverData.portrait ? (
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full border" style={{ borderColor: `${hoverData.color}66` }}>
                      <img src={hoverData.portrait} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg"
                      style={{ background: `${hoverData.color}22`, color: hoverData.color, border: `1px solid ${hoverData.color}55` }}
                    >
                      {monogram(hoverData.title)}
                    </span>
                  )}
                  <span>
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <h2 className="font-display text-lg" style={{ color: hoverData.color }}>{hoverData.title}</h2>
                      <span className="text-xs text-white/45">{yearLabel(hoverData.year)} · {hoverData.founder}</span>
                    </span>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/70">{hoverData.body}</p>
                    {hoverData.keyFigures && <p className="mt-1 text-[11px] text-white/40">{hoverData.group} — {hoverData.keyFigures}</p>}
                    {hoverData.photo && <p className="mt-0.5 text-[10px] text-white/28">Porträt: echtes Foto (siehe Bildquellen im Kosmos-Kapitel)</p>}
                  </span>
                </motion.div>
              ) : (
                <p className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-white/45 backdrop-blur-sm">
                  Scrollen durch 2.500 Jahre · Stationen berühren für Karteikarten
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-2 py-8">
        <div className="glass-soft flex flex-wrap gap-x-6 gap-y-2 rounded-2xl p-4">
          {Object.values(groups).map((g) => (
            <span key={g.label} className="flex items-center gap-2 text-[13px] text-white/65">
              <span className="h-3 w-3 rounded-full" style={{ background: g.color, boxShadow: `0 0 10px ${g.color}` }} />
              {g.label}
            </span>
          ))}
          <span className="flex items-center gap-2 text-[13px] text-white/65">
            <span className="h-3 w-3 rotate-45 bg-[#e2a35c]" style={{ boxShadow: "0 0 10px #e2a35c" }} />
            Trauma-Verfahren (untere Bahn)
          </span>
        </div>
      </section>
    </div>
  );
}
