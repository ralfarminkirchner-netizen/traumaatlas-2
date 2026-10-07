import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Plus, Trash2, Wand2, X } from "lucide-react";
import { blindSpots, selfHelpLimits, synergyRules, type BlindSpot, type SynergyRule } from "@/data/blocks";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { buildingBlocks, blockCategoryLabels } from "@/data/blocks";
import { CHAPTERS } from "@/views/chapters";
import { setState, toggleProgramItem, useAtlasState } from "@/state/atlas-store";
import { openView } from "@/ocean/world";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { GlyphPath, symFor } from "../baukasten/BlockSymbol";

const chapter = CHAPTERS[7];

const KIND_META: Record<SynergyRule["kind"], { label: string; color: string }> = {
  synergy: { label: "Synergie", color: "#7fb8a4" },
  order: { label: "Reihenfolge", color: "#8fd8cf" },
  dose: { label: "Dosierung", color: "#d4b483" },
  caution: { label: "Vorsicht", color: "#c98a8a" },
};

interface ItemInfo { label: string; color: string; kind: string; desc: string; meta: string }

function itemInfo(id: string): ItemInfo {
  const b = buildingBlocks.find((x) => x.id === id);
  if (b) return { label: b.title, color: "#a3b18a", kind: "Baustein", desc: b.description, meta: `${blockCategoryLabels[b.category]} · ${b.minutes} · ${b.frequency}` };
  const e = exercises.find((x) => x.id === id);
  if (e) return { label: e.title, color: "#7fb8a4", kind: "Übung", desc: e.goal, meta: `${e.effectLabel} · ${e.minutes} · ${e.context}` };
  const m = methods.find((x) => x.id === id);
  if (m) return { label: m.name, color: "#d9a05b", kind: "Verfahren", desc: m.focusShort, meta: `${m.founder} · seit ${m.year}` };
  return { label: id, color: "#999", kind: "", desc: "", meta: "" };
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

// ── Vollbühnen-Force-Netz (SVG + rAF, mutiert DOM direkt) ────
const NET_W = 1200;
const NET_H = 640;
const CX = NET_W / 2;
const CY = NET_H / 2;

interface NetNode { id: string; x: number; y: number; vx: number; vy: number; r: number; degree: number }
interface NetEdge { a: string; b: string; ruleId: string; kind: SynergyRule["kind"] }

function LiveNet({
  program, rules, spots, highlight, reduced, onNode, onSpot,
}: {
  program: string[];
  rules: SynergyRule[];
  spots: BlindSpot[];
  highlight: string | null;
  reduced: boolean;
  onNode: (id: string) => void;
  onSpot: (id: string) => void;
}) {
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
    const netNodes: NetNode[] = program.slice(0, 20).map((id, i) => {
      const a = (i / Math.max(program.length, 1)) * Math.PI * 2;
      return {
        id,
        x: CX + Math.cos(a) * 250,
        y: CY + Math.sin(a) * 190,
        vx: 0, vy: 0,
        r: 19 + Math.min(11, (degree.get(id) ?? 0) * 3.5),
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
          const mx = (a.x + b.x) / 2 + (CX - (a.x + b.x) / 2) * 0.22;
          const my = (a.y + b.y) / 2 + (CY - (a.y + b.y) / 2) * 0.22;
          el.setAttribute("d", `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`);
        }
      }
    }
    if (reduced) {
      // Statische elliptische Anordnung
      const s = sim.current;
      s.nodes.forEach((n, i) => {
        const a = (i / Math.max(s.nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        n.x = CX + Math.cos(a) * 300;
        n.y = CY + Math.sin(a) * 215;
      });
      paint();
      return;
    }
    let raf = 0;
    const tick = () => {
      const s = sim.current;
      const n = s.nodes.length;
      // Abstoßung
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = s.nodes[i], b = s.nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          if (d2 > 95000) continue;
          const f = 15000 / d2;
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
        const f = (d - 175) * 0.004;
        a.vx += (dx / d) * f * d * 0.055; a.vy += (dy / d) * f * d * 0.055;
        b.vx -= (dx / d) * f * d * 0.055; b.vy -= (dy / d) * f * d * 0.055;
      }
      // Zentrum + Integration
      for (const node of s.nodes) {
        node.vx += (CX - node.x) * 0.0011;
        node.vy += (CY - node.y) * 0.0011;
        node.vx *= 0.88; node.vy *= 0.88;
        node.x += Math.max(-5, Math.min(5, node.vx));
        node.y += Math.max(-5, Math.min(5, node.vy));
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, nodes, edges]);

  return (
    <div className="glass-soft relative overflow-hidden rounded-3xl">
      <style>{`.net-node:focus-visible{outline:none}.net-node:focus-visible .node-ring{stroke:#8fd8cf;stroke-width:2.6;stroke-opacity:1}`}</style>
      <svg
        viewBox={`0 0 ${NET_W} ${NET_H}`}
        className="block h-[58vh] min-h-[430px] w-full sm:h-[64vh]"
        role="group"
        aria-label="Lebendes Synergie-Netz Ihres Programms — Knoten und dunkle Flecken sind anklickbar"
      >
        <defs>
          <filter id="wnetglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="wholegrad" cx="50%" cy="50%" r="50%">
            <stop offset="50%" stopColor="#040302" />
            <stop offset="85%" stopColor="#0e0b08" />
            <stop offset="100%" stopColor="#e2a35c" stopOpacity="0.9" />
          </radialGradient>
        </defs>

        {/* Blinde Flecken: dunkle Löcher mit Licht-Rand im Zentrumsr ring */}
        {spots.map((s, i) => {
          const a = (i / Math.max(spots.length, 1)) * Math.PI * 2 + 0.9;
          const hx = CX + Math.cos(a) * 118;
          const hy = CY + Math.sin(a) * 92;
          return (
            <g
              key={s.id}
              transform={`translate(${hx},${hy})`}
              role="button"
              tabIndex={0}
              aria-label={`Blinder Fleck: ${s.title} — Details öffnen`}
              className="net-node cursor-pointer"
              onClick={() => onSpot(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSpot(s.id); } }}
            >
              <circle className="node-ring" r="34" fill="url(#wholegrad)">
                {!reduced && <animate attributeName="r" values="31;37;31" dur="4.2s" repeatCount="indefinite" />}
              </circle>
              <circle r="34" fill="none" stroke="#e2a35c" strokeOpacity="0.55" strokeWidth="1.2" pointerEvents="none">
                {!reduced && <animate attributeName="stroke-opacity" values="0.55;0.15;0.55" dur="3.8s" repeatCount="indefinite" />}
              </circle>
              <text y="54" textAnchor="middle" fontSize="13" fill="#e2a35c" fillOpacity="0.95" pointerEvents="none"
                style={{ paintOrder: "stroke", stroke: "#0b0806", strokeWidth: 4 }}>
                {s.title.length > 34 ? s.title.slice(0, 32) + "…" : s.title}
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
              strokeOpacity={dim ? 0.05 : 0.55}
              strokeWidth={highlight === e.ruleId ? 3 : 1.7}
              strokeDasharray={e.kind === "caution" ? "6 6" : undefined}
              filter="url(#wnetglow)"
              style={{ transition: "stroke-opacity 200ms" }}
            >
              {!reduced && <animate attributeName="stroke-opacity" values={dim ? "0.05;0.05" : "0.55;0.22;0.55"} dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" />}
            </path>
          );
        })}

        {/* Programm-Knoten mit Glyphen */}
        {nodes.map((n) => {
          const meta = itemInfo(n.id);
          const hot = highlight !== null && rules.find((r) => r.id === highlight)?.related.includes(n.id);
          const dim = highlight !== null && !hot;
          return (
            <g
              key={n.id}
              ref={(el) => { if (el) nodeEls.current.set(n.id, el); }}
              style={{ opacity: dim ? 0.22 : 1, transition: "opacity 200ms", cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={`${meta.label} (${meta.kind}) — ${n.degree} Verbindung${n.degree === 1 ? "" : "en"}, Details öffnen`}
              className="net-node"
              onClick={() => onNode(n.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNode(n.id); } }}
            >
              <circle className="node-ring" r={n.r} fill="#0e0b08" stroke={meta.color} strokeWidth="1.8" filter="url(#wnetglow)" />
              <svg
                x={-n.r * 0.58}
                y={-n.r * 0.58}
                width={n.r * 1.16}
                height={n.r * 1.16}
                viewBox="0 0 24 24"
                fill="none"
                stroke={meta.color}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              >
                <GlyphPath sym={symFor(n.id)} />
              </svg>
              {n.degree === 0 && (
                <circle r={n.r + 5} fill="none" stroke="#e2a35c" strokeOpacity="0.55" strokeDasharray="4 4" pointerEvents="none" />
              )}
              <text
                y={-n.r - 9}
                textAnchor="middle"
                fontSize="13.5"
                fill="#e8ddcb"
                pointerEvents="none"
                style={{ paintOrder: "stroke", stroke: "#0b0806", strokeWidth: 5 }}
              >
                {meta.label.length > 26 ? meta.label.slice(0, 24) + "…" : meta.label}
              </text>
              <title>{`${meta.label} (${meta.kind}) — ${n.degree} Verbindung${n.degree === 1 ? "" : "en"}`}</title>
            </g>
          );
        })}
      </svg>
      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/40">
        Knoten und dunkle Flecken anklicken für Details · Elemente ohne Verbindung (gestrichelter Ring) sind mögliche blinde Flecken
      </p>
    </div>
  );
}

// ── Detail-Overlay (Regel · Element · blinder Fleck) ─────────
type OverlaySel = { type: "rule" | "item" | "spot"; id: string };

function OverlayShell({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  // ESC schließt nur das Overlay, nicht das ganze Kapitel (Capture-Phase vor App-Handler)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      <button
        aria-label="Detailansicht schließen"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="glass relative max-h-[82vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)] sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Schließen"
          autoFocus
          className="absolute right-4 top-4 rounded-full border border-white/10 p-1.5 text-white/50 transition-colors hover:border-white/30 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

function DetailOverlay({
  sel, rules, program, setSel, onClose,
}: {
  sel: OverlaySel;
  rules: SynergyRule[];
  program: string[];
  setSel: (s: OverlaySel) => void;
  onClose: () => void;
}) {
  if (sel.type === "rule") {
    const r = rules.find((x) => x.id === sel.id) ?? synergyRules.find((x) => x.id === sel.id);
    if (!r) return null;
    const km = KIND_META[r.kind];
    const present = r.related.filter((x) => program.includes(x));
    const missing = r.related.filter((x) => !program.includes(x));
    return (
      <OverlayShell label={`Regel: ${r.title}`} onClose={onClose}>
        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: `${km.color}1e`, color: km.color }}>
          {km.label}
        </span>
        <h3 className="font-display mt-3 pr-8 text-2xl text-[#f3e7d3]">{r.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{r.reason}</p>
        {present.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">In Ihrem Programm</p>
            <div className="flex flex-wrap gap-1.5">
              {present.map((x) => (
                <button
                  key={x}
                  onClick={() => setSel({ type: "item", id: x })}
                  className="edge-chip !text-[11px] transition-colors hover:border-white/40"
                  style={{ color: itemInfo(x).color }}
                >
                  {itemInfo(x).label}
                </button>
              ))}
            </div>
          </div>
        )}
        {missing.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Ergänzt diese Regel</p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((x) => (
                <button
                  key={x}
                  onClick={() => toggleProgramItem(x)}
                  aria-label={`${itemInfo(x).label} zum Programm hinzufügen`}
                  className="edge-chip !text-[11px] text-white/55 transition-colors hover:border-[#7fb8a4]/50 hover:text-[#7fb8a4]"
                >
                  <Plus className="mr-1 inline h-3 w-3" aria-hidden />{itemInfo(x).label}
                </button>
              ))}
            </div>
          </div>
        )}
      </OverlayShell>
    );
  }

  if (sel.type === "spot") {
    const s = blindSpots.find((x) => x.id === sel.id);
    if (!s) return null;
    const sevColor = s.severity === "dringend" ? "#c98a8a" : s.severity === "wichtig" ? "#e2a35c" : "#d4b483";
    return (
      <OverlayShell label={`Blinder Fleck: ${s.title}`} onClose={onClose}>
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: sevColor }}>
          <AlertTriangle className="h-4 w-4" aria-hidden /> Blinder Fleck · {s.severity}
        </p>
        <h3 className="font-display mt-3 pr-8 text-2xl text-[#f3e7d3]">{s.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{s.body}</p>
        <p className="mt-4 rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-[#e8c9a0]">{s.nextStep}</p>
        {s.resourceLink === "wegweiser" && (
          <button
            onClick={() => openView("wegweiser")}
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[#e2a35c] px-5 py-2 text-sm font-semibold text-[#241505]"
          >
            Zum Wegweiser <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </OverlayShell>
    );
  }

  // Element
  const info = itemInfo(sel.id);
  const inProgram = program.includes(sel.id);
  const involved = rules.filter((r) => r.related.includes(sel.id));
  return (
    <OverlayShell label={`Element: ${info.label}`} onClose={onClose}>
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ color: info.color, background: `${info.color}14`, boxShadow: `inset 0 0 0 1px ${info.color}35` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
            <GlyphPath sym={symFor(sel.id)} />
          </svg>
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: info.color }}>{info.kind}</p>
          <h3 className="font-display pr-8 text-xl leading-snug text-[#f3e7d3]">{info.label}</h3>
          <p className="mt-0.5 text-[11px] text-white/40">{info.meta}</p>
        </div>
      </div>
      {info.desc && <p className="mt-4 text-sm leading-relaxed text-white/70">{info.desc}</p>}
      {involved.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-white/40">Wirkt in diesen Regeln</p>
          <div className="flex flex-wrap gap-1.5">
            {involved.map((r) => (
              <button
                key={r.id}
                onClick={() => setSel({ type: "rule", id: r.id })}
                className="edge-chip !text-[11px] transition-colors hover:border-white/40"
                style={{ color: KIND_META[r.kind].color }}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => toggleProgramItem(sel.id)}
        className={`mt-6 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
          inProgram
            ? "border border-[#c98a8a]/40 text-[#c98a8a] hover:bg-[#c98a8a]/10"
            : "bg-[#e2a35c] text-[#241505]"
        }`}
      >
        {inProgram ? (<><Trash2 className="h-3.5 w-3.5" aria-hidden /> Aus dem Programm nehmen</>) : (<><Plus className="h-3.5 w-3.5" aria-hidden /> Zum Programm hinzufügen</>)}
      </button>
    </OverlayShell>
  );
}

export default function WechselView() {
  const reduced = useReducedMotion();
  const { program } = useAtlasState();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [sel, setSel] = useState<OverlaySel | null>(null);

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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Das Netz füllt die ganze Bühne: Jedes Element Ihres Programms ist ein Knoten,
        jede Regel eine leuchtende Verbindung — Details öffnen sich als ruhige Overlays.
      </p>

      {isPreview && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="rounded-full border border-[#8fd8cf]/30 bg-[#8fd8cf]/[0.07] px-4 py-1.5 text-xs text-[#8fd8cf]">
            Vorschau mit Beispiel-Programm — Ihr eigenes bauen Sie im Baukasten
          </p>
          <button
            onClick={() => setState({ program: EXAMPLE_PROGRAM })}
            className="flex items-center gap-1.5 rounded-full bg-[#e2a35c] px-4 py-1.5 text-xs font-semibold text-[#241505]"
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden /> Als meins übernehmen
          </button>
          <button
            onClick={() => openView("baukasten")}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white/80 hover:border-[#8fd8cf]/50 hover:text-[#8fd8cf]"
          >
            Zum Baukasten <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      {/* Regel-Chips: hervorheben + Detail-Overlay */}
      <div role="group" aria-label="Regeln im Netz hervorheben" className="mb-4 flex flex-wrap gap-1.5">
        {activeRules.map((r) => {
          const km = KIND_META[r.kind];
          const on = highlight === r.id;
          return (
            <button
              key={r.id}
              aria-pressed={on}
              onClick={() => { setHighlight(on ? null : r.id); if (!on) setSel({ type: "rule", id: r.id }); }}
              className="rounded-full border px-3.5 py-1.5 text-xs transition-all"
              style={{
                borderColor: on ? `${km.color}88` : "rgba(255,255,255,0.1)",
                background: on ? `${km.color}1a` : "transparent",
                color: on ? km.color : "rgba(255,255,255,0.55)",
                boxShadow: on ? `0 0 18px ${km.color}30` : undefined,
              }}
            >
              <span className="mr-1.5 font-semibold uppercase tracking-wider opacity-80">{km.label}</span>
              {r.title}
            </button>
          );
        })}
        {activeRules.length === 0 && (
          <p className="text-xs text-white/40">Noch keine aktiven Wechselwirkungen — fügen Sie im Baukasten Elemente hinzu.</p>
        )}
      </div>

      <LiveNet
        program={effective}
        rules={activeRules}
        spots={spots}
        highlight={highlight}
        reduced={reduced}
        onNode={(id) => setSel({ type: "item", id })}
        onSpot={(id) => setSel({ type: "spot", id })}
      />

      {/* Legende */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-white/45">
        {Object.entries(KIND_META).map(([k, m]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-5 rounded-full" style={{ background: m.color }} aria-hidden />
            {m.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-[#e2a35c]/70" aria-hidden />
          Blinder Fleck
        </span>
        <span className="ml-auto text-white/30">
          {effective.length} Elemente · {activeRules.length} Regeln aktiv · {spots.length} blinde Flecken
        </span>
      </div>

      {/* Selbsthilfe-Grenze: ruhiger Hinweisstreifen */}
      <div className="mt-8 rounded-2xl border border-[#c98a8a]/25 bg-[#c98a8a]/[0.05] px-6 py-4">
        <p className="text-sm leading-relaxed text-white/60">
          <span className="font-semibold text-[#c98a8a]">{selfHelpLimits.title}: </span>
          {selfHelpLimits.nextStep}
        </p>
      </div>

      <AnimatePresence>
        {sel && (
          <DetailOverlay
            sel={sel}
            rules={activeRules}
            program={effective}
            setSel={setSel}
            onClose={() => { setSel(null); setHighlight(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
