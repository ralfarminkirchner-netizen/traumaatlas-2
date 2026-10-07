import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GitCompareArrows, History, Waves, X } from "lucide-react";
import { bodyRegions } from "@/data/nervous";
import { symptomCategories, explanations, type Symptom } from "@/data/v1/symptoms";
import { methodSymptomsLocal } from "@/data/navigatorLinks";
import { exercises } from "@/data/v1/exercises";
import { methods } from "@/data/v1/methods";
import { nervousStates } from "@/data/nervous";
import { CHAPTERS } from "@/views/chapters";
import { setState, useAtlasState } from "@/state/atlas-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { addAtlasPhenomenon, markUnderstood } from "@/ocean/world";

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
const KIND_LABEL = { symptom: "Symptom", category: "Feld", state: "Erregungslage", method: "Verfahren", exercise: "Übung" } as const;

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

  selected.forEach((s, i) => {
    const y = cy + (i - (selected.length - 1) / 2) * Math.min(120, 380 / Math.max(selected.length, 1));
    addNode({ id: s.id, label: s.label, kind: "symptom", x: 120, y, r: 13 });
  });
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

/** Detail-Inhalt eines angeklickten Knotens — echte Daten aus der Datenschicht. */
function NodeDetail({ node, onClose }: { node: EgoNode; onClose: () => void }) {
  const method = node.kind === "method" ? methods.find((m) => `m:${m.id}` === node.id) : undefined;
  const exercise = node.kind === "exercise" ? exercises.find((e) => `e:${e.id}` === node.id) : undefined;
  const category = node.kind === "category" ? symptomCategories.find((c) => `cat:${c.id}` === node.id) : undefined;
  const state = node.kind === "state" ? nervousStates.find((s) => `state:${s.id}` === node.id) : undefined;
  const symptom = node.kind === "symptom"
    ? symptomCategories.flatMap((c) => c.symptoms).find((s) => s.id === node.id)
    : undefined;

  const throwToSea = () => {
    const type = node.kind === "method" ? "method" : node.kind === "exercise" ? "exercise" : "symptom";
    addAtlasPhenomenon(node.id.replace(/^(m:|e:)/, ""), type as "method" | "exercise" | "symptom", node.label);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-2xl p-4"
      role="dialog"
      aria-label={`Detail: ${node.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: KIND_COLOR[node.kind] }}>
            {KIND_LABEL[node.kind]}{node.count ? ` · trifft auf ${node.count} zu` : ""}
          </p>
          <h3 className="font-display mt-0.5 text-lg leading-tight text-[#f3e7d3]">{node.label}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Detail schließen" className="rounded-full p-1 text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-white/70">
        {method && (
          <>
            <p><strong className="text-[#e8c9a0]">Was ist das?</strong> {method.what}</p>
            <p><strong className="text-[#e8c9a0]">Wie arbeitet es?</strong> {method.how}</p>
            <p><strong className="text-[#e8c9a0]">Für wen?</strong> {method.forWhom}</p>
            <p className="text-[12px] text-white/50"><strong className="text-white/70">Evidenz:</strong> {method.evidenz}</p>
          </>
        )}
        {exercise && (
          <>
            <p className="italic text-white/55">{exercise.when}</p>
            <ol className="space-y-1">
              {exercise.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 font-display" style={{ color: KIND_COLOR.exercise }}>{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
            {exercise.caution && <p className="text-[12px] text-[#c98a8a]">Vorsicht: {exercise.caution}</p>}
          </>
        )}
        {category && <p>{category.subtitle}. {category.symptoms.length} Symptome gehören zu diesem Feld.</p>}
        {state && (
          <>
            <p className="italic text-white/55">„{state.feelsLike}"</p>
            <p>{state.description}</p>
          </>
        )}
        {symptom && (
          <>
            <p>Erregungslage: <span style={{ color: AROUSAL_COLOR[symptom.arousal] }}>{symptom.arousal === "hyper" ? "Hyperarousal" : symptom.arousal === "hypo" ? "Hypoarousal" : "beides möglich"}</span></p>
            {symptom.hint && <p className="italic text-white/55">„{symptom.hint}"</p>}
            <p className="text-[12px] text-white/50">
              Typische Körperregionen: {(SYMPTOM_REGION[symptom.id] ?? []).join(", ") || "—"}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={throwToSea}
        className="mt-3 flex items-center gap-1.5 rounded-full border border-[#8fd8cf]/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#8fd8cf] hover:bg-[#8fd8cf]/10"
        title="Als Atlas-Phänomen ins Meer der Phänomene werfen"
      >
        <Waves className="h-3.5 w-3.5" aria-hidden /> Ins Meer werfen
      </button>
    </motion.div>
  );
}

/** Vergleich zweier Symptome mit gemeinsamen und eigenen Angeboten. */
function SymptomCompare({ all, selectedIds }: { all: (Symptom & { cat: string })[]; selectedIds: string[] }) {
  const [aId, setAId] = useState<string>(selectedIds[0] ?? "");
  const [bId, setBId] = useState<string>(selectedIds[1] ?? selectedIds[0] ?? "");
  const a = all.find((s) => s.id === aId);
  const b = all.find((s) => s.id === bId);
  if (!a || !b) return null;

  const methodsFor = (s: Symptom) =>
    Object.entries(methodSymptomsLocal.methods).filter(([, syms]) => syms.includes(s.id)).map(([name]) => name);
  const exercisesFor = (s: Symptom) =>
    Object.entries(methodSymptomsLocal.exercises).filter(([, syms]) => syms.includes(s.id)).map(([id]) => exercises.find((e) => e.id === id)?.title ?? id);
  const aM = methodsFor(a), bM = methodsFor(b);
  const aE = exercisesFor(a), bE = exercisesFor(b);
  const sharedM = aM.filter((x) => bM.includes(x));
  const sharedE = aE.filter((x) => bE.includes(x));

  const Row = ({ label, va, vb }: { label: string; va: React.ReactNode; vb: React.ReactNode }) => (
    <div className="grid grid-cols-[90px_1fr_1fr] gap-2 border-t border-white/[0.06] pt-1.5 text-[12px]">
      <span className="text-white/40">{label}</span>
      <span className="text-white/75">{va}</span>
      <span className="text-white/75">{vb}</span>
    </div>
  );

  const Sel = ({ value, onChange, other }: { value: string; onChange: (v: string) => void; other: string }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-[#14100b] px-2 py-1.5 text-[12px] text-[#f3e7d3]"
      aria-label="Symptom für Vergleich wählen"
    >
      {all.map((s) => (
        <option key={s.id} value={s.id} disabled={s.id === other}>
          {s.label.length > 44 ? s.label.slice(0, 42) + "…" : s.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-white/40">
        <GitCompareArrows className="h-3.5 w-3.5" aria-hidden /> Zwei Symptome vergleichen
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Sel value={aId} onChange={setAId} other={bId} />
        <Sel value={bId} onChange={setBId} other={aId} />
      </div>
      <div className="mt-2 space-y-1.5">
        <Row label="Feld" va={symptomCategories.find((c) => c.id === a.cat)?.title} vb={symptomCategories.find((c) => c.id === b.cat)?.title} />
        <Row
          label="Erregung"
          va={<span style={{ color: AROUSAL_COLOR[a.arousal] }}>{a.arousal}</span>}
          vb={<span style={{ color: AROUSAL_COLOR[b.arousal] }}>{b.arousal}</span>}
        />
        <Row label="Verfahren" va={`${aM.length} · ${aM.slice(0, 3).join(", ")}${aM.length > 3 ? "…" : ""}`} vb={`${bM.length} · ${bM.slice(0, 3).join(", ")}${bM.length > 3 ? "…" : ""}`} />
        <Row label="Übungen" va={`${aE.length} · ${aE.slice(0, 3).join(", ")}${aE.length > 3 ? "…" : ""}`} vb={`${bE.length} · ${bE.slice(0, 3).join(", ")}${bE.length > 3 ? "…" : ""}`} />
        {(sharedM.length > 0 || sharedE.length > 0) && (
          <div className="border-t border-white/[0.06] pt-1.5 text-[12px] text-[#e8c9a0]">
            Gemeinsam: {[
              ...sharedM.map((m) => `Verfahren: ${m}`),
              ...sharedE.map((e) => `Übung: ${e}`),
            ].join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NavigatorView() {
  const reduced = useReducedMotion();
  const { selectedSymptoms } = useAtlasState();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

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
  const detailNode = detailId ? ego?.nodeMap.get(detailId) ?? null : null;

  const openDetail = (node: EgoNode) => {
    setDetailId(node.id);
    setHistory((h) => [node.id, ...h.filter((x) => x !== node.id)].slice(0, 6));
    // „Verstehen" wirkt aufs Meer: Nebel lichtet sich, das eigene Komplex wächst
    markUnderstood(node.id.replace(/^(m:|e:|cat:|state:)/, ""));
  };

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

  const historyNodes = history
    .map((id) => ego?.nodeMap.get(id))
    .filter((n): n is EgoNode => !!n)
    .slice(0, 5);

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm leading-relaxed text-white/55">
        {chapter.sub} Wähle bis zu vier Symptome — dann alle Knoten im Graph anklicken:
        echte Verfahren- und Übungsdaten, ein gemerkter Verlauf und der Vergleich zweier Symptome.
      </p>

      <section className="w-full px-1 py-2" aria-label="Symptome auswählen und echte Beziehungen verfolgen">
        {/* Auswahl */}
        <div className="space-y-2">
          {symptomCategories.map((cat) => (
            <div key={cat.id} className="glass-soft rounded-2xl px-3 py-2">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base text-[#f3e7d3]">{cat.title}</h2>
                <p className="hidden text-[11px] text-white/40 lg:block">{cat.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cat.symptoms.map((s) => {
                  const on = selectedSymptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                      className={`edge-chip !px-2.5 !py-1 text-[12px] transition-all ${
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
            <button onClick={() => { setState({ selectedSymptoms: [] }); setDetailId(null); }} className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70">
              Auswahl zurücksetzen ({selected.length} von maximal 4 gewählt)
            </button>
          )}
        </div>

        {/* Ego-Graph auf VOLLER Bühne */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="glass-soft overflow-x-auto rounded-2xl p-3">
            {!ego ? (
              <div className="flex h-[440px] flex-col items-center justify-center gap-3 text-center">
                <p className="max-w-md text-sm text-white/50">
                  Wähle oben Symptome aus — hier entsteht dann dein persönlicher Beziehungsgraph
                  aus den <span className="text-white/75">echten Kanten des Atlas</span> (behandelt · reguliert · gehört zu · entspricht).
                  Jeder Knoten ist anklickbar.
                </p>
              </div>
            ) : (
              <svg viewBox={`0 0 ${ego.W} ${ego.H}`} className="min-h-[480px] min-w-[760px] lg:min-h-[560px]" role="img" aria-label={`Ego-Graph für ${selected.map((s) => s.label).join(", ")}`}>
                <defs>
                  <filter id="egoglow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.6" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {[
                  ["Deine Symptome", 120],
                  ["Feld & Erregungslage", 250],
                  ["Verfahren", 745],
                  ["Übungen", 745],
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

                {/* Knoten — klickbar */}
                {ego.nodes.map((n, i) => {
                  const isDetail = detailId === n.id;
                  return (
                    <motion.g
                      key={n.id}
                      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, duration: 0.4 }}
                      style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: "pointer" }}
                      onClick={() => openDetail(n)}
                      role="button"
                      aria-label={`${KIND_LABEL[n.kind]}: ${n.label} — Details öffnen`}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(n); } }}
                    >
                      {isDetail && <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="#ede4d4" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.9} />}
                      <circle cx={n.x} cy={n.y} r={n.r} fill={KIND_COLOR[n.kind]} filter="url(#egoglow)" opacity={isDetail ? 1 : 0.92} />
                      {n.count !== undefined && n.count > 1 && (
                        <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="600" fill="#14100b">
                          {n.count}
                        </text>
                      )}
                      <text x={n.x} y={n.y - n.r - 7} textAnchor="middle" fontSize="10.5" fill="#e8ddcb">
                        {n.label.length > 30 ? n.label.slice(0, 28) + "…" : n.label}
                      </text>
                    </motion.g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Rechte Spalte: Verlauf, Detail, Körper, Vergleich */}
          <div className="flex min-h-0 flex-col gap-3">
            {historyNodes.length > 0 && (
              <div className="glass-soft rounded-2xl p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-white/40">
                  <History className="h-3.5 w-3.5" aria-hidden /> Dein Verlauf
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {historyNodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setDetailId(n.id)}
                      className={`edge-chip !py-0.5 text-[11px] ${detailId === n.id ? "!border-white/30 text-[#f3e7d3]" : "text-white/55 hover:text-white/85"}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[n.kind] }} />
                      {n.label.length > 26 ? n.label.slice(0, 24) + "…" : n.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {detailNode && <NodeDetail node={detailNode} onClose={() => setDetailId(null)} />}

            {/* Körper-Panel */}
            <div className="glass-soft rounded-2xl p-3">
              <p className="mb-1 text-center text-[10px] uppercase tracking-[0.25em] text-white/40">Körperregionen</p>
              <svg viewBox="0 0 200 520" className="mx-auto h-[300px]" role="img" aria-label="Körpersilhouette mit betroffenen Regionen">
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
              <p className="mt-1 text-center text-xs text-white/45">
                {activeRegions.size > 0 ? `${activeRegions.size} Region${activeRegions.size > 1 ? "en" : ""} typischerweise betroffen` : "Noch keine Auswahl"}
              </p>
            </div>

            <SymptomCompare all={allSymptoms} selectedIds={selectedSymptoms} />
          </div>
        </div>

        {/* Verdacht-Texte */}
        {verdicts.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {verdicts.map((v) => (
              <motion.div key={v.key} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
                <p className="font-display text-base text-[#e8c9a0]">{v.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{v.body}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
