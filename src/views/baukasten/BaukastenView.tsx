import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, GripVertical, Plus, Trash2 } from "lucide-react";
import { buildingBlocks, blockCategoryLabels } from "@/data/blocks";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { phaseInfos } from "@/data/nervous";
import { methodSymptomsLocal } from "@/data/navigatorLinks";
import { CHAPTERS } from "@/views/chapters";
import { BlockSymbol, type SymbolKey } from "./BlockSymbol";
import { toggleProgramItem, useAtlasState } from "@/state/atlas-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[6];

type PhaseId = "stabilisierung" | "konfrontation" | "integration";
type ItemKind = "block" | "exercise" | "method";

interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  sub: string;
  color: string;
  minutes?: string;
  group: string;
  sym: SymbolKey;
}

const KIND_COLOR: Record<ItemKind, string> = { block: "#a3b18a", exercise: "#7fb8a4", method: "#d9a05b" };

const PALETTE: Item[] = [
  ...buildingBlocks.map((b) => ({
    id: b.id, kind: "block" as const, title: b.title,
    sub: b.effect, color: KIND_COLOR.block,
    minutes: b.minutes, group: blockCategoryLabels[b.category],
    sym: b.id as SymbolKey,
  })),
  ...exercises.map((e) => ({
    id: e.id, kind: "exercise" as const, title: e.title,
    sub: e.effectLabel, color: KIND_COLOR.exercise, minutes: e.minutes,
    group: "Übungen", sym: `fx-${e.effect}` as SymbolKey,
  })),
  ...methods.map((m) => ({
    id: m.id, kind: "method" as const, title: m.name,
    sub: m.focusShort, color: KIND_COLOR.method, group: "Verfahren", sym: "method" as SymbolKey,
  })),
];

const GROUP_ORDER = ["Schlaf & Erholung", "Bewegung & Körper", "Soziale Co-Regulation", "Achtsamkeit & Innenwelt", "Alltag & Struktur", "Übungen", "Verfahren"];

/** Minuten-String → Zahl (Mittelwert), 0 wenn nicht parsbar. */
function minutesOf(m?: string): number {
  if (!m) return 0;
  const nums = m.match(/\d+/g)?.map(Number) ?? [];
  if (!nums.length) return 0;
  return nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
}

/** Beziehungen zwischen Programm-Elementen (für Live-Verbindungslinien). */
function relatedPairs(program: string[]): [string, string][] {
  const pairs = new Set<string>();
  const has = (id: string) => program.includes(id);
  const methNameToId = new Map(methods.map((m) => [m.name, m.id]));
  for (const [exId, syms] of Object.entries(methodSymptomsLocal.exercises)) {
    for (const [methName, msyms] of Object.entries(methodSymptomsLocal.methods)) {
      const mid = methNameToId.get(methName);
      if (mid && has(exId) && has(mid) && syms.some((s) => msyms.includes(s))) {
        pairs.add([exId, mid].sort().join("|"));
      }
    }
  }
  return [...pairs].map((p) => p.split("|") as [string, string]);
}

export default function BaukastenView() {
  const reduced = useReducedMotion();
  const { program } = useAtlasState();
  const [phaseOf, setPhaseOf] = useState<Record<string, PhaseId>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [overPhase, setOverPhase] = useState<PhaseId | null>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; key: string }[]>([]);

  const defaultPhase = (item: Item): PhaseId => (item.kind === "method" ? "konfrontation" : "stabilisierung");
  const phaseFor = (id: string): PhaseId => {
    const item = PALETTE.find((p) => p.id === id);
    return phaseOf[id] ?? (item ? defaultPhase(item) : "stabilisierung");
  };

  const programItems = useMemo(
    () => program.map((id) => PALETTE.find((p) => p.id === id)).filter((p): p is Item => !!p),
    [program],
  );

  const weeklyMinutes = useMemo(
    () => programItems.reduce((acc, p) => acc + minutesOf(p.minutes), 0),
    [programItems],
  );
  const pairs = useMemo(() => relatedPairs(program), [program]);

  // ── Live-Verbindungslinien messen ─────────────────────────
  const updateLines = useCallback(() => {
    const shelf = shelfRef.current;
    if (!shelf) return;
    const rect = shelf.getBoundingClientRect();
    const centers = new Map<string, { x: number; y: number }>();
    shelf.querySelectorAll<HTMLElement>("[data-item-id]").forEach((el) => {
      const r = el.getBoundingClientRect();
      centers.set(el.dataset.itemId!, { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 });
    });
    setLines(
      pairs
        .filter(([a, b]) => centers.has(a) && centers.has(b))
        .map(([a, b]) => {
          const ca = centers.get(a)!, cb = centers.get(b)!;
          return { x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y, key: `${a}|${b}` };
        }),
    );
  }, [pairs]);

  useLayoutEffect(() => updateLines(), [updateLines, program, phaseOf]);
  useEffect(() => {
    window.addEventListener("resize", updateLines);
    return () => window.removeEventListener("resize", updateLines);
  }, [updateLines]);

  // ── Drag & Drop ───────────────────────────────────────────
  const onDropInPhase = (phase: PhaseId) => {
    if (!dragging) return;
    if (!program.includes(dragging)) toggleProgramItem(dragging);
    setPhaseOf((p) => ({ ...p, [dragging]: phase }));
    setDragging(null);
    setOverPhase(null);
  };

  const exportProgram = () => {
    const byPhase = (ph: PhaseId) => programItems.filter((p) => phaseFor(p.id) === ph);
    const text = [
      "TRAUMAATLAS 3 — Mein Programm",
      `Exportiert: ${new Date().toLocaleString("de-DE")}`,
      "",
      ...phaseInfos.map((ph) =>
        [
          `${ph.label} (${ph.subtitle})`,
          ...byPhase(ph.id).map((i) => `  · ${i.title} — ${i.sub}${i.minutes ? ` (${i.minutes})` : ""}`),
          "",
        ].join("\n"),
      ),
      `Geschätzter Zeitaufwand: ca. ${Math.round(weeklyMinutes)} Minuten pro Woche`,
      "",
      "Hinweis: Dieses Programm ersetzt keine Therapie. Verarbeitungsverfahren gehören in professionelle Begleitung.",
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "traumaatlas-programm.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, items: PALETTE.filter((p) => p.group === g) })).filter((g) => g.items.length),
    [],
  );

  return (
    <div>
      <p className="mb-8 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Elemente in die drei Phasen ziehen — leuchtende Linien zeigen live,
        welche Elemente sich über gemeinsame Symptome gegenseitig verstärken.
      </p>

      <section aria-label="Programm-Baukasten">
        {/* Bibliothek (gruppiert) */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {grouped.map(({ group, items }) => (
            <div key={group} className="glass-soft rounded-2xl p-4">
              <p className="mb-2.5 text-[10px] uppercase tracking-[0.25em] text-white/40">{group}</p>
              <div className="grid max-h-72 grid-cols-2 content-start gap-2 overflow-y-auto scrollbar-thin sm:grid-cols-3">
                {items.map((p) => {
                  const inProgram = program.includes(p.id);
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      drag={!reduced && !inProgram}
                      dragSnapToOrigin
                      onDragStart={() => setDragging(p.id)}
                      onDragEnd={() => { setDragging(null); setOverPhase(null); }}
                      whileDrag={reduced ? undefined : { scale: 1.06, zIndex: 30, boxShadow: `0 16px 44px rgba(0,0,0,0.6), 0 0 26px ${p.color}77` }}
                      className={`group relative cursor-grab select-none overflow-hidden rounded-xl border active:cursor-grabbing ${
                        inProgram ? "border-white/[0.04] opacity-30" : "border-white/12"
                      }`}
                      style={{ borderColor: inProgram ? undefined : `${p.color}55` }}
                    >
                      <div
                        className="relative flex h-[72px] items-center justify-center"
                        style={{ background: `radial-gradient(circle at 50% 62%, ${p.color}1f, ${p.color}08 70%)`, color: p.color }}
                      >
                        <BlockSymbol sym={p.sym} className="h-9 w-9" strokeWidth={1.55} />
                        {!inProgram && (
                          <button
                            onClick={() => toggleProgramItem(p.id)}
                            aria-label={`${p.title} hinzufügen`}
                            className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white/80 backdrop-blur-sm transition-colors hover:text-[#7fb8a4]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <GripVertical className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-white/40" aria-hidden />
                      </div>
                      <div className="px-2 pb-1.5 pt-1.5">
                        <p className="truncate text-[11px] font-medium leading-tight text-white/90">{p.title}</p>
                        <p className="truncate text-[9px] text-white/40">{p.minutes ?? p.sub}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-white/35">
          Elemente in eine Phase ziehen — oder mit „+" hinzufügen. Ausgegraute Elemente sind bereits eingeplant.
        </p>

        {/* 3-Phasen-Regal */}
        <div ref={shelfRef} className="relative mt-8">
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
            <defs>
              <filter id="bkglow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="bkline" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8fd8cf" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7fb8a4" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            {lines.map((l) => (
              <path
                key={l.key}
                d={`M ${l.x1} ${l.y1} C ${(l.x1 + l.x2) / 2} ${l.y1}, ${(l.x1 + l.x2) / 2} ${l.y2}, ${l.x2} ${l.y2}`}
                fill="none"
                stroke="url(#bkline)"
                strokeWidth="1.8"
                strokeDasharray="7 6"
                filter="url(#bkglow)"
              >
                {!reduced && <animate attributeName="stroke-dashoffset" values="26;0" dur="1.4s" repeatCount="indefinite" />}
              </path>
            ))}
          </svg>

          <div className="relative z-10 grid gap-4 lg:grid-cols-3">
            {phaseInfos.map((ph) => {
              const items = programItems.filter((p) => phaseFor(p.id) === ph.id);
              const active = overPhase === ph.id && dragging !== null;
              return (
                <div
                  key={ph.id}
                  onMouseUp={() => onDropInPhase(ph.id)}
                  onDragOver={(e) => { e.preventDefault(); setOverPhase(ph.id); }}
                  onDragLeave={() => setOverPhase((p) => (p === ph.id ? null : p))}
                  className="min-h-[280px] rounded-2xl border border-dashed p-4 transition-all"
                  style={{
                    borderColor: active ? ph.color : `${ph.color}55`,
                    background: active ? `${ph.color}16` : `${ph.color}08`,
                    boxShadow: active ? `0 0 40px ${ph.color}33` : undefined,
                  }}
                  aria-label={`${ph.label} — Ablagezone`}
                >
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="font-display text-lg" style={{ color: ph.color }}>{ph.label}</h2>
                    <span className="text-[11px] text-white/40">{items.length} Elemente</span>
                  </div>
                  <p className="mb-3 text-xs text-white/45">{ph.subtitle}</p>
                  <div className="flex flex-col gap-2">
                    {items.map((p) => (
                      <motion.div
                        key={p.id}
                        layout
                        data-item-id={p.id}
                        initial={reduced ? false : { opacity: 0, scale: 0.9, y: -10, rotate: -1.5 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 24 }}
                        className="glass-slide flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                        style={{ boxShadow: `0 6px 24px rgba(0,0,0,0.35), inset 3px 0 0 ${p.color}` }}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ color: p.color, background: `${p.color}14`, boxShadow: `inset 0 0 0 1px ${p.color}30` }}
                        >
                          <BlockSymbol sym={p.sym} className="h-5 w-5" strokeWidth={1.6} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-[#f3e7d3]">{p.title}</span>
                          <span className="block truncate text-[10px] text-white/40">{p.sub}{p.minutes ? ` · ${p.minutes}` : ""}</span>
                        </span>
                        <button
                          onClick={() => toggleProgramItem(p.id)}
                          aria-label={`${p.title} entfernen`}
                          className="rounded-full p-1 text-white/35 transition-colors hover:text-[#c98a8a]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                    {items.length === 0 && (
                      <p className="rounded-xl border border-white/[0.06] p-4 text-center text-xs text-white/30">
                        {dragging ? "Loslassen zum Einplanen" : "Elemente hierher ziehen"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zusammenfassung + Export */}
        <div className="glass mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-6 py-4">
          <Stat n={program.length} label="Elemente" />
          <Stat n={Math.round(weeklyMinutes)} label="Minuten/Woche (geschätzt)" />
          <Stat n={lines.length} label="aktive Verstärkungen" />
          <div className="ml-auto">
            <button
              onClick={exportProgram}
              disabled={program.length === 0}
              className="flex items-center gap-2 rounded-full bg-[#e2a35c] px-6 py-2.5 text-sm font-semibold text-[#241505] shadow-[0_0_30px_rgba(226,163,92,0.3)] transition-shadow hover:shadow-[0_0_50px_rgba(226,163,92,0.5)] disabled:opacity-40"
            >
              <Download className="h-4 w-4" aria-hidden /> Programm exportieren
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl text-[#e2a35c]">{n}</p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  );
}
