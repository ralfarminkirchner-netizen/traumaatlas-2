// PDA-Profil — importierbarer Knotenblock (Übernahme-Entwurf, siehe PDA-PROFIL.md)
// Stand: 2026-10-11 · verändert KEINE bestehenden Dateien.
//
// Übernahme in src/data/graph.ts:
//   import type { AtlasNode, AtlasEdge } ... — die Typen hier passend zu
//   src/data/graph.ts (AtlasNode/AtlasEdge) verorten; in buildGraph():
//     nodes.push(...pdaNodes);
//     for (const e of pdaEdges) pushEdge(e.from, e.to, e.type as EdgeType);
//   Zusätzlich nötig: NodeType "profile" + EdgeType "profil" inkl. Meta
//   (PDA-PROFIL.md, Abschnitt 2.1). Bis dahin bleibt dieser Block inaktiv.

export interface PdaAtlasNode {
  id: string;
  type: "profile";
  label: string;
  sub?: string;
  group?: string;
  summary?: string;
  arousal?: "hyper" | "hypo" | "both";
}

export interface PdaAtlasEdge {
  id: string;
  from: string;
  to: string;
  type:
    | "profil" // kommt vor bei / prägt (NEU — in EdgeType aufnehmen)
    | "fundierung"
    | "erregung"
    | "zielzustand"
    | "reguliert"
    | "behandlt"
    | "phase";
}

export const pdaNodes: PdaAtlasNode[] = [
  {
    id: "p:pda",
    type: "profile",
    label: "PDA-Profil",
    sub: "Pervasive Drive for Autonomy",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Anforderungen — auch innere, auch gewollte — wirken als Bedrohung; Autonomie ist Sicherheit. Kein Diagnose-Code, ein Muster.",
  },
  {
    id: "p:pda-anforderung",
    type: "profile",
    label: "Anforderung als Bedrohung",
    sub: "Kernmechanismus",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Neurozeption prüft jede Forderung unbewusst auf Kontrollverlust — das Nervensystem antwortet mit Alarm statt mit Willen.",
  },
  {
    id: "p:pda-autonomie",
    type: "profile",
    label: "Autonomie als Sicherheit",
    sub: "Gegenpol",
    group: "neuroprofile",
    summary:
      "Wo Wahlmöglichkeit, Tempovorrecht und Ausstieg offen sind, sinkt der Alarm. Sicherheit entsteht durch Selbstwirksamkeit.",
  },
];

const e = (from: string, to: string, type: PdaAtlasEdge["type"]): PdaAtlasEdge => ({
  id: `${from}->${to}:${type}`,
  from,
  to,
  type,
});

export const pdaEdges: PdaAtlasEdge[] = [
  // Profil → Feld & Symptom-Überlappungen
  e("p:pda", "cat:vermeidung", "profil"),
  e("p:pda", "erstarrung", "profil"),
  e("p:pda", "panik", "profil"),
  e("p:pda", "reizbar", "profil"),
  e("p:pda", "konzentration", "profil"),
  e("p:pda", "hypervigilanz", "profil"),
  e("p:pda", "zurueckgezogen", "profil"),
  e("p:pda", "scham", "profil"),
  // Erklärungs- und Behandlungskontext
  e("p:pda", "m:polyvagal", "fundierung"),
  e("p:pda", "phase:stabilisierung", "phase"),
  e("m:narm", "p:pda", "behandlt"),
  e("m:se", "p:pda", "behandlt"),
  e("m:dbt", "p:pda", "behandlt"),
  // Kernmechanismus → Erregungslagen
  e("p:pda-anforderung", "state:sympathikus", "erregung"),
  e("p:pda-anforderung", "state:dorsal", "erregung"),
  // Gegenpol → Sicherheitszustand
  e("p:pda-autonomie", "state:ventral", "zielzustand"),
  // Autonomie-erhaltende Übungen (Angebot statt Aufforderung)
  e("e:pendeln", "p:pda", "reguliert"),
  e("e:sicherer-ort", "p:pda", "reguliert"),
  e("e:orientieren", "p:pda", "reguliert"),
  e("e:co-regulation", "p:pda", "reguliert"),
];

// nodeTypeMeta-Ergänzung (in graph.ts übernehmen):
//   profile: { label: "Neuroprofile", color: "#a98fc7",
//              soft: "rgba(169,143,199,0.16)",
//              blurb: "Muster des Nervensystems, die über einzelne
//                      Diagnosen hinweg beschrieben werden" }
// edgeTypeLabels-Ergänzung:
//   profil: "kommt vor bei / prägt"
