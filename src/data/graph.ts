// Der große Atlas-Graph: vereinigt Disziplinen, Verfahren, Übungen,
// Symptome, Kategorien, Nervensystem-Zustände, Phasen und Bausteine.
// Kantentypen: abstammung · fundierung · behandelt · reguliert
//              phase · kategorie · erregung · zielzustand

import { disciplines } from "./v1/disciplines";
import { methods } from "./v1/methods";
import { exercises } from "./v1/exercises";
import { symptomCategories } from "./v1/symptoms";
import { buildingBlocks } from "./blocks";
import { nervousStates, phaseInfos, type NervousStateId } from "./nervous";

export type NodeType =
  | "discipline"
  | "method"
  | "exercise"
  | "symptom"
  | "category"
  | "state"
  | "phase"
  | "block";

export type EdgeType =
  | "abstammung"
  | "fundierung"
  | "behandlt"
  | "reguliert"
  | "phase"
  | "kategorie"
  | "erregung"
  | "zielzustand";

export interface AtlasNode {
  id: string;
  type: NodeType;
  label: string;
  sub?: string;
  year?: number;
  group?: string; // discipline-group oder Kategoriename
  summary?: string;
  arousal?: "hyper" | "hypo" | "both";
}

export interface AtlasEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
}

export const nodeTypeMeta: Record<NodeType, { label: string; color: string; soft: string; blurb: string }> = {
  discipline: { label: "Schulen & Theorien", color: "#9aa8c7", soft: "rgba(154,168,199,0.16)", blurb: "Historische Schulen, Richtungen, Theorien und Körperansätze" },
  method: { label: "Trauma-Verfahren", color: "#d9a05b", soft: "rgba(217,160,91,0.16)", blurb: "Die 16 wichtigsten Verfahren der Traumatherapie" },
  exercise: { label: "Übungen", color: "#7fb8a4", soft: "rgba(127,184,164,0.16)", blurb: "Praktische Regulation für den Alltag" },
  symptom: { label: "Symptome", color: "#c98a8a", soft: "rgba(201,138,138,0.16)", blurb: "32 Symptome in 6 Kategorien" },
  category: { label: "Symptomfelder", color: "#b48ea3", soft: "rgba(180,142,163,0.16)", blurb: "Die sechs großen Felder der Traumafolgen" },
  state: { label: "Nervensystem", color: "#8fd0b8", soft: "rgba(143,208,184,0.18)", blurb: "Die drei Zustände des autonomen Nervensystems" },
  phase: { label: "Phasen", color: "#d4b483", soft: "rgba(212,180,131,0.16)", blurb: "Stabilisierung → Verarbeitung → Integration" },
  block: { label: "Alltagsbausteine", color: "#a3b18a", soft: "rgba(163,177,138,0.16)", blurb: "Schlaf, Bewegung, Beziehung, Struktur" },
};

export const edgeTypeLabels: Record<EdgeType, string> = {
  abstammung: "hervorgegangen aus",
  fundierung: "basiert auf",
  behandlt: "behandelt",
  reguliert: "reguliert / aktiviert",
  phase: "gehört zur Phase",
  kategorie: "gehört zu",
  erregung: "entspricht Erregungslage",
  zielzustand: "zielt auf Zustand",
};

// Verfahren → Symptome, die sie behandeln (kuratierte Zuordnung)
const methodSymptoms: Record<string, string[]> = {
  emdr: ["flashbacks", "albttraeume", "aufdringlich", "trigger"],
  tfcbt: ["vermeidung-orte", "gedankenverdrängung", "flashbacks", "hypervigilanz"],
  net: ["luecken", "gefuehlserinnerungen", "scham"],
  se: ["gefuehlserinnerungen", "erstarrt", "herzrasen", "schmerzen", "schreck"],
  sp: ["erstarrung", "erstarrt", "naehe", "misstrauen", "entrückt"],
  narm: ["naehe", "misstrauen", "zurueckgezogen", "leere", "gefuehlsueberflutung"],
  pitt: ["hypervigilanz", "schlaf", "gefuehlsabstumpfung", "gefuehlserinnerungen"],
  irrt: ["albttraeume", "aufdringlich", "scham"],
  brainspotting: ["herzrasen", "panik", "gefuehlserinnerungen", "flashbacks"],
  dbr: ["erstarrung", "neben-sich", "entrückt", "luecken"],
  egostate: ["scham", "selbstschaden", "gefuehlstaubheit", "misstrauen"],
  schematherapie: ["scham", "leere", "naehe", "misstrauen", "gefuehlsueberflutung"],
  dbt: ["gefuehlsueberflutung", "selbstschaden", "reizbar", "panik", "konzentration"],
  tre: ["herzrasen", "magen", "reizbar", "schmerzen"],
  tsyoga: ["erstarrt", "schmerzen", "entrückt", "konzentration"],
  krst: ["flashbacks", "trigger", "aufdringlich", "albttraeume"],
  polyvagal: ["herzrasen", "erstarrt", "hypervigilanz", "neben-sich"],
};

// Übungen → Symptome (was sie lindern)
const exerciseSymptoms: Record<string, string[]> = {
  "sos-54321": ["flashbacks", "panik", "trigger", "herzrasen", "hypervigilanz"],
  "sos-ausatmen": ["herzrasen", "panik", "reizbar", "hypervigilanz"],
  "sos-orientieren": ["neben-sich", "entrückt", "erstarrung", "konzentration"],
  voo: ["herzrasen", "magen", "reizbar", "hypervigilanz"],
  schuetteln: ["reizbar", "schmerzen", "herzrasen", "hypervigilanz"],
  "sicherer-ort": ["hypervigilanz", "flashbacks", "albttraeume", "leere"],
  koerperscan: ["erstarrt", "gefuehlsabstumpfung", "entrückt", "konzentration"],
  pendeln: ["gefuehlserinnerungen", "schmerzen", "scham", "erstarrt"],
  aktivieren: ["erstarrung", "neben-sich", "entrückt", "erstarrt"],
  abend: ["schlaf", "hypervigilanz", "aufdringlich"],
  selbstberuehrung: ["herzrasen", "panik", "haut", "reizbar"],
  "co-regulation": ["zurueckgezogen", "leere", "misstrauen", "naehe"],
};

function buildGraph() {
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const pushEdge = (from: string, to: string, type: EdgeType) =>
    edges.push({ id: `${from}->${to}:${type}`, from, to, type });

  // Disziplinen
  for (const d of disciplines) {
    nodes.push({
      id: d.id,
      type: "discipline",
      label: d.name,
      sub: d.founder,
      year: d.year,
      group: d.group,
      summary: d.summary,
    });
    for (const p of d.parents) pushEdge(d.id, p, "abstammung");
  }

  // Verfahren
  for (const m of methods) {
    nodes.push({
      id: `m:${m.id}`,
      type: "method",
      label: m.name,
      sub: m.founder,
      year: m.year,
      summary: `${m.what}`,
    });
    // Fundierung: Methode basiert auf gleichnamiger Disziplin
    if (disciplines.some((d) => d.id === m.id)) pushEdge(`m:${m.id}`, m.id, "fundierung");
    for (const ph of m.phases) pushEdge(`m:${m.id}`, `phase:${ph}`, "phase");
    for (const s of methodSymptoms[m.id] ?? []) pushEdge(`m:${m.id}`, s, "behandlt");
  }

  // Übungen
  for (const e of exercises) {
    nodes.push({
      id: `e:${e.id}`,
      type: "exercise",
      label: e.title,
      sub: e.effectLabel,
      summary: `${e.goal}`,
      arousal: e.effect,
    });
    const target: NervousStateId = e.effect === "hyper" ? "sympathikus" : e.effect === "hypo" ? "dorsal" : "ventral";
    pushEdge(`e:${e.id}`, `state:${target}`, "reguliert");
    for (const s of exerciseSymptoms[e.id] ?? []) pushEdge(`e:${e.id}`, s, "reguliert");
  }

  // Symptome + Kategorien
  for (const c of symptomCategories) {
    nodes.push({ id: `cat:${c.id}`, type: "category", label: c.title, sub: c.subtitle, summary: c.subtitle });
    for (const s of c.symptoms) {
      nodes.push({
        id: s.id,
        type: "symptom",
        label: s.label,
        sub: c.title,
        group: c.id,
        arousal: s.arousal,
        summary: s.hint,
      });
      pushEdge(s.id, `cat:${c.id}`, "kategorie");
      if (s.arousal === "hyper") pushEdge(s.id, "state:sympathikus", "erregung");
      else if (s.arousal === "hypo") pushEdge(s.id, "state:dorsal", "erregung");
      else {
        pushEdge(s.id, "state:sympathikus", "erregung");
        pushEdge(s.id, "state:dorsal", "erregung");
      }
    }
  }

  // Nervensystem-Zustände
  for (const st of nervousStates) {
    nodes.push({ id: `state:${st.id}`, type: "state", label: st.name, sub: st.short, summary: st.description });
  }

  // Phasen
  for (const p of phaseInfos) {
    nodes.push({ id: `phase:${p.id}`, type: "phase", label: p.label, sub: p.subtitle, summary: p.description });
  }

  // Alltagsbausteine
  for (const b of buildingBlocks) {
    nodes.push({ id: `b:${b.id}`, type: "block", label: b.title, sub: b.frequency, summary: b.effect });
    pushEdge(`b:${b.id}`, `state:${b.targetState === "both" ? "ventral" : b.targetState}`, "zielzustand");
  }

  return { nodes, edges };
}

export const atlasGraph = buildGraph();

// Nachbarschafts-Index
export const neighborIndex: Map<string, Set<string>> = (() => {
  const idx = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!idx.has(a)) idx.set(a, new Set());
    idx.get(a)!.add(b);
  };
  for (const e of atlasGraph.edges) {
    add(e.from, e.to);
    add(e.to, e.from);
  }
  return idx;
})();

export function neighborsOf(id: string): Set<string> {
  return neighborIndex.get(id) ?? new Set();
}

// Alle Symptom-IDs pro Kategorie (Navigator)
export const symptomsByCategory = symptomCategories.map((c) => ({
  id: c.id,
  title: c.title,
  subtitle: c.subtitle,
  symptoms: c.symptoms,
}));
