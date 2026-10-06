import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChapterHero } from "@/components/ChapterHero";
import { Disclaimer } from "@/components/Disclaimer";
import { bodyRegions } from "@/data/nervous";
import { symptomCategories, explanations, type Symptom } from "@/data/v1/symptoms";
import { methodSymptomsLocal } from "@/data/navigatorLinks";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { nervousStates } from "@/data/nervous";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState } from "@/state/atlas-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const chapter = CHAPTERS[3];

/** Symptom → Körperregion (aus den Körpersignalen abgeleitet) */
const SYMPTOM_REGION: Record<string, string[]> = {
  flashbacks: ["kopf"], albttraeume: ["kopf", "brust"], aufdringlich: ["kopf"], trigger: ["brust", "hals"], gefuehlserinnerungen: ["bauch"],
  schreck: ["kopf", "schultern"], schlaf: ["kopf", "brust"], reizbar: ["schultern", "hals"], konzentration: ["kopf"], hypervigilanz: ["kopf", "schultern"], herzrasen: ["brust", "hals"],
  "vermeidung-orte": ["brust"], gedankenverdrängung: ["kopf"], gefuehlsabstumpfung: ["bauch"], zurueckgezogen: ["becken"],
  "neben-sich": ["kopf", "becken"], erstarrung: ["becken", "schultern"], luecken: ["kopf"], entrückt: ["kopf", "becken"], erstarrt: ["becken", "schultern"],
  gefuehlsueberflutung: ["brust"], gefuehlstaubheit: ["bauch"], scham: ["hals", "bauch"], selbstschaden: ["schultern"], leere: ["brust", "bauch"],
  misstrauen: ["kopf", "hals"], naehe: ["brust"], schmerzen: ["schultern", "becken"], magen: ["bauch"], haut: ["schultern"], panik: ["brust", "hals"],
};

const AROUSAL_COLOR = { hyper: "#e2a35c", hypo: "#8b93c9", both: "#c9a0a8" } as const;
const KIND_COLOR = { symptom: "#c98a8a", category: "#b48ea3", state: "#8fd0b8", method: "#d9a05b", exercise: "#7fb8a4" } as const;

const REL_LABEL: Record<string, string> = {
  kategorie: "gehört zu",
  erregung: "entspricht",
  behandlt: "behandelt",
  reguliert: "reguliert",
};

interface EgoNode { id: string; label: string; kind: keyof typeof KIND_COLOR; x: number; y: number; r: number; count?: number; }
interface EgoEdge { from: string; to: string; relation: string; count: number; }

/** Ego-Graph aus ECHTEN Graphkanten: Symptom ↔ Kategorie/Erregung/Verfahren/Übung. */
function buildEgo(selected: (Symptom & { cat: string })[]) {
  const nodes: EgoNode[] = [];
  const edges: EgoEdge[] = [];
  const addNode = (n: EgoNode) => nodes.push(n);

  const catIds = [...new Set(selected.map((s) => s.cat))];
  const stateIds = new Set<string>();
  for (const s of selected) {
    if (s.arousal === "hyper" || s.arousal === "both") stateIds.add("sympathikus");
    if (s.arousal === "hypo" || s.arousal === "both") stateIds.add("dorsal");
    if (s.arousal === "both") stateIds.add("ventral");
  }

  // Verfahren/Übungen mit echten Trefferzahlen
  const methHits = new Map<string, number>();
  for (const [name, syms] of Object.entries(methodSymptomsLocal.methods)) {
    const hits = selected.filter((s) => syms.includes(s.id)).length;
    if (hits > 0) {
      const m = methods.find((x) => x.name === name);
      if (m) methHits.set(m.id, hits);
    }
  }
  const exHits = new Map<string, number>();
  for (const [exId, syms] of Object.entries(methodSymptomsLocal.exercises)) {
    const hits = selected.filter((s) => syms.includes(s.id)).length;
    if (hits > 0) exHits.set(exId, hits);
  }
  const topMeth = [...methHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topEx = [...exHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const W = 900, H = 560;
  const cx = 250, cy = H / 2;

  // Symptome: vertikale Achse links
  selected.forEach((s, i) => {
    const y = cy + (i - (selected.length - 1) / 2) * Math.min(120, 380 / Math.max(selected.length, 1));
    addNode({ id: s.id, label: s.label, kind: "symptom", x: 120, y, r: 13 });
  });
  // Kategorien + Zustände: Mittelring
  catIds.forEach((cid, i) => {
    const cat = symptomCategories.find((c) => c.id === cid)!;
    const y = cy + (i - (catIds.length - 1) / 2) * 90;
    addNode({ id: `cat:${cid}`, label: cat.title, kind: "category", x: cx, y, r: 12 });
  });
  [...stateIds].forEach((sid, i) => {
    const st = nervousStates.find((s) => s.id === sid)!;
    const y = cy + 190 + i * 64 - (stateIds.size - 1) * 32;
    addNode({ id: `state:${sid}`, label: st.short, kind: "state", x: cx, y, r: 14 });
  });
  // Verfahren: rechter Bogen oben, Übungen: unten
  topMeth.forEach(([mid, hits], i) => {
    const m = methods.find((x) => x.id === mid)!;
    const t = topMeth.length > 1 ? i / (topMeth.length - 1) : 0.5;
    addNode({ id: `m:${mid}`, label: m.name, kind: "method", x: 640 + t * 210, y: 120 - Math.sin(t * Math.PI) * 55, r: 10 + hits * 1.6, count: hits });
  });
  topEx.forEach(([eid, hits], i) => {
    const e = exercises.find((x) => x.id === eid)!;
    const t = topEx.length > 1 ? i / (topEx.length - 1) : 0.5;
    addNode({ id: `e:${eid}`, label: e.title, kind: "exercise", x: 640 + t * 210, y: 440 + Math.sin(t * Math.PI) * 55, r: 10 + hits * 1.6, count: hits });
  });

  // Kanten (echte Relationen)
  for (const s of selected) {
    edges.push({ from: s.id, to: `cat:${s.cat}`, relation: "kategorie", count: 1 });
    if (s.arousal === "hyper") edges.push({ from: s.id, to: "state:sympathikus", relation: "erregung", count: 1 });
    else if (s.arousal === "hypo") edges.push({ from: s.id, to: "state:dorsal", relation: "erregung", count: 1 });
    else {
      edges.push({ from: s.id, to: "state:sympathikus", relation: "erregung", count: 1 });
      edges.push({ from: s.id, to: "state:dorsal", relation: "erregung", count: 1 });
      edges.push({ from: s.id, to: "state:ventral", relation: "erregung", count: 1 });
    }
    for (const [mid, hits] of methHits) {
      if (hits > 0 && methodSymptomsLocal.methods[methods.find((x) => x.id === mid)!.name].includes(s.id))
        edges.push({ from: `m:${mid}`, to: s.id, relation: "behandlt", count: 1 });
    }
    for (const [eid, hits] of exHits) {
      if (hits > 0 && methodSymptomsLocal.exercises[eid]?.includes(s.id))
        edges.push({ from: `e:${eid}`, to: s.id, relation: "reguliert", count: 1 });
    }
  }

  // Kanten zwischen denselben Knoten zusammenfassen
  const merged = new Map<string, EgoEdge>();
  for (const e of edges) {
    const key = [e.from, e.to].sort().join("|");
    const prev = merged.get(key);
    if (prev) prev.count += 1;
    else merged.set(key, { ...e });
  }
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return { nodes, edges: [...merged.values()], nodeMap, W, H };
}

export default function NavigatorView() {
  const reduced = useReducedMotion();
  const { selectedSymptoms } = useAtlasState();

  const toggle = (id: string) =>
    setState({
      selectedSymptoms: selectedSymptoms.includes(id)
        ? selectedSymptoms.filter((s) => s !== id)
        : selectedSymptoms.length >= 4
          ? [...selectedSymptoms.slice(1), id]
          : [...selectedSymptoms, id],
    });

  const allSymptoms = useMemo(
    () => symptomCategories.flatMap((c) => c.symptoms.map((s) => ({ ...s, cat: c.id }))),
    [],
  );
  const selected = allSymptoms.filter((s) => selectedSymptoms.includes(s.id));
  const ego = useMemo(() => (selected.length ? buildEgo(selected) : null), [selected]);

  // Verdacht-Texte
  const verdicts = useMemo(() => {
    if (selected.length === 0) return [];
    const keys = new Set<string>();
    const arousals = new Set(selected.map((s) => s.arousal));
    keys.add(arousals.size > 1 ? "both" : [...arousals][0]);
    for (const s of selected) for (const t of s.tags) keys.add(t);
    return [...keys]
      .map((k) => ({ key: k, ...(explanations as Record<string, { title: string; body: string }>)[k] }))
      .filter((e) => e.title);
  }, [selected]);

  const activeRegions = useMemo(() => {
    const set = new Set<string>();
    for (const s of selected) for (const r of SYMPTOM_REGION[s.id] ?? []) set.add(r);
    return set;
  }, [selected]);

  const dominantArousal = !selected.length
    ? "#7fb8a4"
    : selected.filter((s) => s.arousal === "hypo").length > selected.filter((s) => s.arousal === "hyper").length
      ? "#8b93c9"
      : "#e2a35c";

  return (
    <div>
      <ChapterHero art={chapter.art} kicker={chapter.kicker} title={chapter.title} sub={chapter.sub} index={chapter.index} />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8" aria-label="Symptome auswählen und echte Beziehungen verfolgen">
        <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-white/70">
          Wählen Sie bis zu vier Symptome — der Navigator zeigt dann die <strong className="text-white/90">tatsächlichen Verbindungen</strong>:
          welche Verfahren sie behandeln, welche Übungen sie regulieren, welchem Feld und welcher Erregungslage sie angehören.
          Die Zahl an einem Knoten zeigt, für wie viele Ihrer Symptome er gilt.
        </p>

        {/* Auswahl */}
        <div className="mt-8 space-y-4">
          {symptomCategories.map((cat) => (
            <div key={cat.id} className="glass-soft rounded-2xl p-4">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg text-[#f3e7d3]">{cat.title}</h2>
                <p className="hidden text-xs text-white/40 sm:block">{cat.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.symptoms.map((s) => {
                  const on = selectedSymptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                      className={`edge-chip !px-3 !py-1.5 transition-all ${
                        on ? "!border-white/30 bg-white/[0.08] text-[#f3e7d3]" : "text-white/55 hover:text-white/85"
                      }`}
                      style={on ? { boxShadow: `0 0 16px ${AROUSAL_COLOR[s.arousal]}44, inset 0 0 12px ${AROUSAL_COLOR[s.arousal]}18` } : undefined}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: AROUSAL_COLOR[s.arousal] }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {selected.length > 0 && (
            <button onClick={() => setState({ selectedSymptoms: [] })} className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70">
              Auswahl zurücksetzen ({selected.length} von maximal 4 gewählt)
            </button>
          )}
        </div>

        {/* Ego-Graph */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="glass-soft overflow-x-auto rounded-2xl p-3">
            {!ego ? (
              <div className="flex h-[440px] flex-col items-center justify-center gap-3 text-center">
                <p className="max-w-md text-sm text-white/50">
                  Wählen Sie oben Symptome aus — hier entsteht dann Ihr persönlicher Beziehungsgraph
                  aus den <span className="text-white/75">echten Kanten des Atlas</span> (behandelt · reguliert · gehört zu · entspricht).
                </p>
              </div>
            ) : (
              <svg viewBox={`0 0 ${ego.W} ${ego.H}`} className="min-w-[720px]" role="img" aria-label={`Ego-Graph für ${selected.map((s) => s.label).join(", ")}`}>
                <defs>
                  <filter id="egoglow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.6" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Spalten-Überschriften */}
                {[
                  ["Ihre Symptome", 120],
                  ["Feld & Erregungslage", 250],
                  ["Verfahren, die das behandeln", 745],
                  ["Übungen, die das regulieren", 745],
                ].map(([l, x]) => (
                  <text key={l} x={x} y="26" textAnchor="middle" fontSize="10" letterSpacing="2" fill="rgba(255,255,255,0.35)">
                    {String(l).toUpperCase()}
                  </text>
                ))}

                {/* Kanten */}
                {ego.edges.map((e, i) => {
                  const a = ego.nodeMap.get(e.from)!;
                  const b = ego.nodeMap.get(e.to)!;
                  const mx = (a.x + b.x) / 2;
                  const color = e.relation === "behandlt" ? KIND_COLOR.method : e.relation === "reguliert" ? KIND_COLOR.exercise : "#8a7f6e";
                  return (
                    <motion.path
                      key={i}
                      d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={1 + Math.min(2.5, e.count * 0.7)}
                      strokeOpacity={0.4 + Math.min(0.35, e.count * 0.1)}
                      filter="url(#egoglow)"
                      initial={reduced ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.7, delay: i * 0.02 }}
                    >
                      <title>{`${a.label} — ${REL_LABEL[e.relation]} — ${b.label}${e.count > 1 ? ` (${e.count}×)` : ""}`}</title>
                    </motion.path>
                  );
                })}

                {/* Knoten */}
                {ego.nodes.map((n, i) => (
                  <motion.g
                    key={n.id}
                    initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                  >
                    <circle cx={n.x} cy={n.y} r={n.r} fill={KIND_COLOR[n.kind]} filter="url(#egoglow)" />
                    {n.count !== undefined && n.count > 1 && (
                      <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="600" fill="#14100b">
                        {n.count}
                      </text>
                    )}
                    <text x={n.x} y={n.y - n.r - 7} textAnchor="middle" fontSize="10.5" fill="#e8ddcb">
                      {n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label}
                    </text>
                  </motion.g>
                ))}
              </svg>
            )}
          </div>

          {/* Körper-Panel */}
          <div className="glass-soft rounded-2xl p-4">
            <p className="mb-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/40">Körperregionen</p>
            <svg viewBox="0 0 200 520" className="mx-auto h-[380px]" role="img" aria-label="Körpersilhouette mit betroffenen Regionen">
              {bodyRegions.map((r) => {
                const on = activeRegions.has(r.id);
                return (
                  <motion.path
                    key={r.id}
                    d={r.d}
                    initial={false}
                    animate={{ fillOpacity: on ? 0.6 : 1 }}
                    fill={on ? dominantArousal : "#1c1712"}
                    stroke={on ? dominantArousal : "#3a3128"}
                    strokeWidth={on ? 2 : 1.2}
                    style={on ? { filter: `drop-shadow(0 0 12px ${dominantArousal})` } : undefined}
                  >
                    <title>{r.label}</title>
                  </motion.path>
                );
              })}
            </svg>
            <p className="mt-2 text-center text-xs text-white/45">
              {activeRegions.size > 0 ? `${activeRegions.size} Region${activeRegions.size > 1 ? "en" : ""} typischerweise betroffen` : "Noch keine Auswahl"}
            </p>
          </div>
        </div>

        {/* Verdacht-Texte */}
        {verdicts.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {verdicts.map((v) => (
              <motion.div key={v.key} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
                <p className="font-display text-lg text-[#e8c9a0]">{v.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{v.body}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Disclaimer />
        </div>
      </section>
    </div>
  );
}
