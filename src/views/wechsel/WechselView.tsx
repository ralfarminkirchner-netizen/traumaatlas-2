import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Wand2 } from "lucide-react";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { blindSpots, selfHelpLimits, synergyRules, type SynergyRule } from "@/data/blocks";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { buildingBlocks } from "@/data/blocks";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState } from "@/state/atlas-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ITEM_IMAGES } from "../baukasten/itemAssets";

const chapter = CHAPTERS[7];

const KIND_META: Record<SynergyRule["kind"], { label: string; color: string }> = {
  synergy: { label: "Synergie", color: "#7fb8a4" },
  order: { label: "Reihenfolge", color: "#8fd8cf" },
  dose: { label: "Dosierung", color: "#d4b483" },
  caution: { label: "Vorsicht", color: "#c98a8a" },
};

function itemMeta(id: string): { label: string; color: string; kind: string } {
  const b = buildingBlocks.find((x) => x.id === id);
  if (b) return { label: b.title, color: "#a3b18a", kind: "Baustein" };
  const e = exercises.find((x) => x.id === id);
  if (e) return { label: e.title, color: "#7fb8a4", kind: "Übung" };
  const m = methods.find((x) => x.id === id);
  if (m) return { label: m.name, color: "#d9a05b", kind: "Verfahren" };
  return { label: id, color: "#999", kind: "" };
}

const EXAMPLE_PROGRAM = ["sicherer-ort", "sos-54321", "abend", "schlaf-ritual", "bewegung-gehen", "emdr"];

/** Regel-Kanten: alle Paare der im Programm vorhandenen `related`-Elemente. */
function ruleEdges(rule: SynergyRule, program: string[]): [string, string][] {
  const present = rule.related.filter((r) => program.includes(r));
  const pairs: [string, string][] = [];
  for (let i = 0; i < present.length; i++)
    for (let j = i + 1; j < present.length; j++) pairs.push([present[i], present[j]]);
  return pairs;
}

// ── Lebendes Force-Netz (SVG + rAF, mutiert DOM direkt) ─────
interface NetNode { id: string; x: number; y: number; vx: number; vy: number; r: number; degree: number; }
interface NetEdge { a: string; b: string; ruleId: string; kind: SynergyRule["kind"] }

function LiveNet({
  program, rules, spots, highlight, reduced,
}: {
  program: string[]; rules: SynergyRule[]; spots: typeof blindSpots; highlight: string | null; reduced: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<string, SVGPathElement>());
  const sim = useRef<{ nodes: NetNode[]; edges: NetEdge[] }>({ nodes: [], edges: [] });

  const { nodes, edges } = useMemo(() => {
    const degree = new Map<string, number>();
    const edgeList: NetEdge[] = [];
    for (const r of rules) {
      for (const [a, b] of ruleEdges(r, program)) {
        edgeList.push({ a, b, ruleId: r.id, kind: r.kind });
        degree.set(a, (degree.get(a) ?? 0) + 1);
        degree.set(b, (degree.get(b) ?? 0) + 1);
      }
    }
    // Auch verwaiste Programm-Elemente anzeigen (Grad 0 → blinde-Fleck-Kandidaten)
    const netNodes: NetNode[] = program.slice(0, 18).map((id, i) => {
      const a = (i / Math.max(program.length, 1)) * Math.PI * 2;
      return {
        id,
        x: 210 + Math.cos(a) * 120,
        y: 210 + Math.sin(a) * 120,
        vx: 0, vy: 0,
        r: 8 + Math.min(6, (degree.get(id) ?? 0) * 2),
        degree: degree.get(id) ?? 0,
      };
    });
    return { nodes: netNodes, edges: edgeList };
  }, [program, rules]);

  useEffect(() => {
    sim.current = { nodes: nodes.map((n) => ({ ...n })), edges };
  }, [nodes, edges]);

  // Physics-Loop
  useEffect(() => {
    if (reduced) {
      // Statische Kreisanordnung
      const s = sim.current;
      s.nodes.forEach((n, i) => {
        const a = (i / Math.max(s.nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        n.x = 210 + Math.cos(a) * 130;
        n.y = 210 + Math.sin(a) * 130;
      });
      paint();
      return;
    }
    let raf = 0;
    function paint() {
      const s = sim.current;
      for (const node of s.nodes) {
        const el = nodeEls.current.get(node.id);
        if (el) el.setAttribute("transform", `translate(${node.x},${node.y})`);
      }
      for (const e of s.edges) {
        const el = edgeEls.current.get(`${e.a}|${e.b}|${e.ruleId}`);
        const a = s.nodes.find((x) => x.id === e.a);
        const b = s.nodes.find((x) => x.id === e.b);
        if (el && a && b) {
          const mx = (a.x + b.x) / 2 + (210 - (a.x + b.x) / 2) * 0.25;
          const my = (a.y + b.y) / 2 + (210 - (a.y + b.y) / 2) * 0.25;
          el.setAttribute("d", `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`);
        }
      }
    }
    const tick = () => {
      const s = sim.current;
      const n = s.nodes.length;
      // Abstossung
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = s.nodes[i], b = s.nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          if (d2 > 24000) continue;
          const f = 2600 / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }
      // Federn
      for (const e of s.edges) {
        const a = s.nodes.find((x) => x.id === e.a);
        const b = s.nodes.find((x) => x.id === e.b);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const f = (d - 105) * 0.004;
        a.vx += (dx / d) * f * d * 0.06; a.vy += (dy / d) * f * d * 0.06;
        b.vx -= (dx / d) * f * d * 0.06; b.vy -= (dy / d) * f * d * 0.06;
      }
      // Zentrum + Integration
      for (const node of s.nodes) {
        node.vx += (210 - node.x) * 0.0012;
        node.vy += (210 - node.y) * 0.0012;
        node.vx *= 0.88; node.vy *= 0.88;
        node.x += Math.max(-4, Math.min(4, node.vx));
        node.y += Math.max(-4, Math.min(4, node.vy));
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, nodes, edges]);

  return (
    <div className="glass-soft rounded-2xl p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
        Lebendes Synergie-Netz · {program.length} Elemente · {edges.length} Regel-Verbindungen · {spots.length} blinde Flecken
      </p>
      <svg ref={svgRef} viewBox="0 0 420 420" className="w-full" role="img" aria-label="Force-Netz Ihres Programms">
        <defs>
          <filter id="wnetglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="wholegrad" cx="50%" cy="50%" r="50%">
            <stop offset="52%" stopColor="#050403" />
            <stop offset="86%" stopColor="#0e0b08" />
            <stop offset="100%" stopColor="#e2a35c" stopOpacity="0.9" />
          </radialGradient>
        </defs>

        {/* Blinde Flecken: dunkle Löcher mit Licht-Rand, lebendig im Netz */}
        {spots.map((s, i) => {
          const a = (i / Math.max(spots.length, 1)) * Math.PI * 2 + 0.9;
          const hx = 210 + Math.cos(a) * 62;
          const hy = 210 + Math.sin(a) * 62;
          return (
            <g key={s.id}>
              <circle cx={hx} cy={hy} r="20" fill="url(#wholegrad)">
                {!reduced && <animate attributeName="r" values="18;22;18" dur="4.2s" repeatCount="indefinite" />}
              </circle>
              <circle cx={hx} cy={hy} r="20" fill="none" stroke="#e2a35c" strokeOpacity="0.55" strokeWidth="1">
                {!reduced && <animate attributeName="stroke-opacity" values="0.55;0.15;0.55" dur="3.8s" repeatCount="indefinite" />}
              </circle>
              <text x={hx} y={hy + 36} textAnchor="middle" fontSize="8.5" fill="#e2a35c" fillOpacity="0.9">
                {s.title.length > 32 ? s.title.slice(0, 30) + "…" : s.title}
              </text>
              <title>{`${s.title}: ${s.body}`}</title>
            </g>
          );
        })}

        {/* Regel-Kanten */}
        {edges.map((e, i) => {
          const color = KIND_META[e.kind].color;
          const dim = highlight !== null && highlight !== e.ruleId;
          return (
            <path
              key={`${e.a}|${e.b}|${e.ruleId}`}
              ref={(el) => { if (el) edgeEls.current.set(`${e.a}|${e.b}|${e.ruleId}`, el); }}
              fill="none"
              stroke={color}
              strokeOpacity={dim ? 0.06 : 0.6}
              strokeWidth={highlight === e.ruleId ? 2.6 : 1.6}
              strokeDasharray={e.kind === "caution" ? "5 5" : undefined}
              filter="url(#wnetglow)"
              style={{ transition: "stroke-opacity 200ms" }}
            >
              {!reduced && <animate attributeName="stroke-opacity" values={dim ? "0.06;0.06" : "0.6;0.25;0.6"} dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />}
            </path>
          );
        })}

        {/* Programm-Knoten (mit Bild-Avatar, falls vorhanden) */}
        {nodes.map((n) => {
          const meta = itemMeta(n.id);
          const hot = highlight !== null && rules.find((r) => r.id === highlight)?.related.includes(n.id);
          const dim = highlight !== null && !hot;
          const img = ITEM_IMAGES[n.id];
          const clipId = `av-${n.id.replace(/[^a-z0-9]/gi, "")}`;
          return (
            <g
              key={n.id}
              ref={(el) => { if (el) nodeEls.current.set(n.id, el); }}
              style={{ opacity: dim ? 0.25 : 1, transition: "opacity 200ms" }}
            >
              {img ? (
                <g>
                  <clipPath id={clipId}>
                    <circle r={n.r} />
                  </clipPath>
                  <image
                    href={img}
                    x={-n.r}
                    y={-n.r}
                    width={n.r * 2}
                    height={n.r * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipId})`}
                  />
                  <circle r={n.r} fill="none" stroke={meta.color} strokeWidth="1.6" filter="url(#wnetglow)" />
                </g>
              ) : (
                <circle r={n.r} fill={meta.color} filter="url(#wnetglow)" />
              )}
              {n.degree === 0 && (
                <circle r={n.r + 4} fill="none" stroke="#e2a35c" strokeOpacity="0.5" strokeDasharray="3 3" />
              )}
              <text y={-n.r - 6} textAnchor="middle" fontSize="8.5" fill="#e8ddcb">
                {meta.label.length > 22 ? meta.label.slice(0, 20) + "…" : meta.label}
              </text>
              <title>{`${meta.label} (${meta.kind}) — ${n.degree} Verbindung${n.degree === 1 ? "" : "en"}`}</title>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-[11px] text-white/40">
        Elemente ohne Verbindung (gestrichelter Ring) sind mögliche blinde Flecken · Karten rechts anklicken hebt ihre Elemente hervor
      </p>
    </div>
  );
}

/** Regel- und Blinde-Flecken-Karten (rechte Spalte). */
function RuleCards({
  rules, spots, highlight, setHighlight, program,
}: {
  rules: SynergyRule[];
  spots: typeof blindSpots;
  highlight: string | null;
  setHighlight: (id: string | null) => void;
  program: string[];
}) {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-3">{rules.map((r) => (
        <motion.button
          key={r.id}
          onClick={() => setHighlight(highlight === r.id ? null : r.id)}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass block w-full rounded-2xl border-l-2 p-5 text-left transition-shadow"
          style={{
            borderLeftColor: KIND_META[r.kind].color,
            boxShadow: highlight === r.id ? `0 0 30px ${KIND_META[r.kind].color}33` : undefined,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: `${KIND_META[r.kind].color}1e`, color: KIND_META[r.kind].color }}
            >
              {KIND_META[r.kind].label}
            </span>
            <h3 className="font-display text-lg text-[#f3e7d3]">{r.title}</h3>
            <span className="ml-auto text-[10px] text-white/30">{highlight === r.id ? "im Netz hervorgehoben" : "anklicken zum Hervorheben"}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{r.reason}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.related.filter((x) => program.includes(x)).map((x) => (
              <span key={x} className="edge-chip !text-[10px]" style={{ color: itemMeta(x).color }}>
                {itemMeta(x).label}
              </span>
            ))}
          </div>
        </motion.button>
      ))}

      {spots.map((s) => (
        <motion.div
          key={s.id}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[#e2a35c]/25 bg-[#0a0805] p-5"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(226,163,92,0.16), transparent 65%)" }}
            aria-hidden="true"
          />
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4"
              style={{ color: s.severity === "dringend" ? "#c98a8a" : s.severity === "wichtig" ? "#e2a35c" : "#d4b483" }}
              aria-hidden
            />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Blinder Fleck · {s.severity}</span>
          </div>
          <h3 className="font-display mt-2 text-lg text-[#f3e7d3]">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
          <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm text-[#e8c9a0]">{s.nextStep}</p>
        </motion.div>
      ))}

      <div className="rounded-2xl border border-[#c98a8a]/30 bg-[#c98a8a]/[0.06] p-5">
        <h3 className="font-display text-lg text-[#c98a8a]">{selfHelpLimits.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{selfHelpLimits.body}</p>
        <p className="mt-3 text-sm text-[#e8c9a0]">{selfHelpLimits.nextStep}</p>
      </div>
    </div>
  );
}

export default function WechselView() {
  const reduced = useReducedMotion();
  const { program } = useAtlasState();
  const [highlight, setHighlight] = useState<string | null>(null);

  // Ohne eigenes Programm: Beispiel-Programm als lebendige Vorschau
  const isPreview = program.length === 0;
  const effective = isPreview ? EXAMPLE_PROGRAM : program;
  const activeRules = useMemo(() => synergyRules.filter((r) => r.when(effective)), [effective]);
  const spots = useMemo(
    () => blindSpots.filter((b) => b.check(effective, effective.some((p) => methods.some((m) => m.id === p)))),
    [effective],
  );

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Wechselwirkungen des eigenen Programms">
        {isPreview ? (
          <div className="mx-auto max-w-2xl">
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center">
                <p className="rounded-full border border-[#8fd8cf]/30 bg-[#8fd8cf]/[0.07] px-4 py-1.5 text-xs text-[#8fd8cf]">
                  Vorschau mit Beispiel-Programm — Ihr eigenes bauen Sie im Baukasten
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setState({ program: EXAMPLE_PROGRAM })}
                    className="flex items-center gap-1.5 rounded-full bg-[#e2a35c] px-4 py-1.5 text-xs font-semibold text-[#241505]"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden /> Als meins übernehmen
                  </button>
                  <button
                    onClick={() => setState({ view: "baukasten" })}
                    className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/80 hover:border-[#8fd8cf]/50 hover:text-[#8fd8cf]"
                  >
                    Zum Baukasten <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
                <LiveNet program={effective} rules={activeRules} spots={spots} highlight={highlight} reduced={reduced} />
                <RuleCards rules={activeRules} spots={spots} highlight={highlight} setHighlight={setHighlight} program={effective} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[440px_1fr]">
            <LiveNet program={effective} rules={activeRules} spots={spots} highlight={highlight} reduced={reduced} />

            <RuleCards rules={activeRules} spots={spots} highlight={highlight} setHighlight={setHighlight} program={effective} />
          </div>
        )}

        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
