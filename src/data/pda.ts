// Neuroprofile — PDA-Profil (Pervasive Drive for Autonomy / Pathological
// Demand Avoidance) mit allen bekannten Varianten und Phänomenen.
// Eingebunden via graph.ts (buildGraph). Kein Diagnose-Code (DSM-5-TR /
// ICD-11), sondern ein über Diagnosen hinweg beschriebenes Muster.
// Stand: 2026-10-11 · siehe docs/pda-profil/PDA-PROFIL.md

import type { AtlasEdge, AtlasNode } from "./graph";

export const pdaNodes: AtlasNode[] = [
  // ── Kern ────────────────────────────────────────────────────────
  {
    id: "p:pda",
    type: "profile",
    label: "PDA-Profil",
    sub: "Pervasive Drive for Autonomy",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Anforderungen — auch innere, auch gewollte — wirken als Bedrohung; Autonomie ist Sicherheit. Kein Diagnose-Code, ein Muster: „Can't, not won't.“",
  },
  {
    id: "p:pda-anforderung",
    type: "profile",
    label: "Anforderung als Bedrohung",
    sub: "Kernmechanismus",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Die Neurozeption prüft jede Forderung unbewusst auf Kontrollverlust — das Nervensystem antwortet mit Alarm statt mit Willen. Amygdala übernimmt, der präfrontale Cortex geht offline.",
  },
  {
    id: "p:pda-autonomie",
    type: "profile",
    label: "Autonomie als Sicherheit",
    sub: "Gegenpol",
    group: "neuroprofile",
    summary:
      "Wo Wahlmöglichkeit, Tempovorrecht und Ausstieg offen sind, sinkt der Alarm. Sicherheit entsteht hier nicht durch Geborgenheit, sondern durch Selbstwirksamkeit.",
  },

  // ── Arten von Anforderungen ─────────────────────────────────────
  {
    id: "p:pda-intern",
    type: "profile",
    label: "Innere Anforderungen",
    sub: "Selbst auferlegt",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Die eigenen Forderungen an sich selbst blockieren am häufigsten: Duschen, Essen, Schlafengehen, eine Nachricht beantworten — sogar Vorfreude kann lähmen, sobald sie zur Erwartung wird.",
  },
  {
    id: "p:pda-indirekt",
    type: "profile",
    label: "Indirekte & implizite Anforderungen",
    sub: "Die unsichtbare Last",
    group: "neuroprofile",
    arousal: "hyper",
    summary:
      "Rechnungen, Termine, unbeantwortete Nachrichten, feste Pläne — und Lob: Anerkennung erzeugt den Druck, es beim nächsten Mal genauso zu schaffen. Druck und Belohnung verstärken das Muster.",
  },

  // ── Antworten & Strategien ──────────────────────────────────────
  {
    id: "p:pda-antworten",
    type: "profile",
    label: "Die vielen F's",
    sub: "Bedrohungsantworten statt Verweigerung",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Kampf, Flucht, Erstarrung (Freeze), Fawning, Fantasie, Vergessen (Blank werden), Fibbing, Flopping (abschalten), Funster (unkontrollierter Humor) — das Spektrum der Alarmantworten.",
  },
  {
    id: "p:pda-strategien",
    type: "profile",
    label: "Sozialstrategien des Vermeidens",
    sub: "Vermeidung mit sozialen Mitteln",
    group: "neuroprofile",
    summary:
      "Ablenken, verhandeln, Ausreden („Meine Arme sind zu schwach!“), Vertrösten, Charme, Humor, Rollenspiel — das Profil verweigert selten offen, es umkurvt die Anforderung sozial.",
  },

  // ── Erscheinungsformen ──────────────────────────────────────────
  {
    id: "p:pda-masking",
    type: "profile",
    label: "Maskierung & Internalisierung",
    sub: "Der Komplizen-Modus",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Internalisierer ertragen Anforderungen nur unter hohem Innendruck — die Blockade bleibt unsichtbar. Jahrzehntelanges Mitgehen mit Qual: oft erst im Erwachsenenalter erkannt.",
  },
  {
    id: "p:pda-geschlecht",
    type: "profile",
    label: "Übersehen bei Mädchen & Frauen",
    sub: "Diagnostische Lücke",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Sozialisierte Anpassung trifft auf Maskierung: Mädchen und Frauen werden übersehen oder falsch eingestuft (Angststörung, Borderline, „hochsensibel“). Das Muster fällt oft erst im Erwachsenenalter auf.",
  },
  {
    id: "p:pda-erwachsene",
    type: "profile",
    label: "PDA bei Erwachsenen",
    sub: "Verwaltung, Hierarchie & Zyklus-Burnout",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Formulare, Steuererklärung, unbeantwortete Mails, Mikromanagement: Vorgaben sind die Erwachsenen-Version der Schulaufgabe. Typisch: glänzen bei selbstgewählten Projekten, Kollaps bei fremden — und wiederkehrendes Burnout durch Dauer-Masking.",
  },
  {
    id: "p:pda-familie",
    type: "profile",
    label: "Familie & Schule",
    sub: "Low-Demand statt Durchsetzung",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Schulverweigerung trotz Lernwunsch, tägliche Kämpfe um Essen, Schlaf, Anziehen. Was hilft: Low-Demand-Umfeld, Zusammenarbeit statt Durchsetzung, deklarative Sprache, eingebaute Wahlmöglichkeiten.",
  },
  {
    id: "p:pda-beziehung",
    type: "profile",
    label: "PDA in Beziehungen",
    sub: "Der Schauplatz der Anforderung",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "„Bring bitte den Müll raus“ kann innere Panik auslösen — obwohl man es will. Von außen wirkt es kalt oder trotzig, von innen ist es Alarm. Jahre falscher Deutung hinterlassen Scham und Beziehungsverletzungen.",
  },

  // ── Überlappungen ───────────────────────────────────────────────
  {
    id: "p:pda-adhs",
    type: "profile",
    label: "Überlappung ADHS",
    sub: "Anforderung trifft Interesse-Modus",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Studien deuten darauf hin, dass PDA-Züge bei ADHS mindestens so häufig sind wie bei Autismus. Beim ADHS-Nervensystem kommt zum Anforderungsalarm der Interesse-Modus: Aufgaben ohne innere Zündung sind doppelt unerreichbar.",
  },
  {
    id: "p:pda-audhd",
    type: "profile",
    label: "Überlappung AuDHD",
    sub: "Gas und Bremse gleichzeitig",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Autistisches Strukturbedürfnis trifft ADHS-Neugier: Innere Anforderungen blockieren, äußere fordern — das Nervensystem hält Gas und Bremse gleichzeitig durch. Höchste Erschöpfungsgefahr des Spektrums.",
  },
  {
    id: "p:pda-kptbs",
    type: "profile",
    label: "Überlappung Komplextrauma",
    sub: "Vermeidung als Überlebensstrategie",
    group: "neuroprofile",
    arousal: "both",
    summary:
      "Bei wiederholter früher Traumatisierung verschmelzen Anforderungsvermeidung mit Überlebensstrategien: Kontrolle als Sicherheit, Fawning als gelernte Anpassung. Die Scham über Blockaden trägt die Geschichte mit.",
  },
];

const e = (from: string, to: string, type: AtlasEdge["type"]): AtlasEdge => ({
  id: `${from}->${to}:${type}`,
  from,
  to,
  type,
});

export const pdaEdges: AtlasEdge[] = [
  // ── Kern ────────────────────────────────────────────────────────
  e("p:pda", "cat:vermeidung", "profil"),
  e("p:pda", "erstarrung", "profil"),
  e("p:pda", "panik", "profil"),
  e("p:pda", "reizbar", "profil"),
  e("p:pda", "konzentration", "profil"),
  e("p:pda", "hypervigilanz", "profil"),
  e("p:pda", "zurueckgezogen", "profil"),
  e("p:pda", "scham", "profil"),
  e("p:pda", "m:polyvagal", "fundierung"),
  e("p:pda", "phase:stabilisierung", "phase"),
  e("p:pda-anforderung", "state:sympathikus", "erregung"),
  e("p:pda-anforderung", "state:dorsal", "erregung"),
  e("p:pda-autonomie", "state:ventral", "zielzustand"),

  // ── Behandlungs- & Übungskontext (Angebot statt Aufforderung) ──
  e("m:narm", "p:pda", "behandlt"),
  e("m:se", "p:pda", "behandlt"),
  e("m:dbt", "p:pda", "behandlt"),
  e("m:schematherapie", "p:pda", "behandlt"),
  e("e:pendeln", "p:pda", "reguliert"),
  e("e:sicherer-ort", "p:pda", "reguliert"),
  e("e:sos-orientieren", "p:pda", "reguliert"),
  e("e:co-regulation", "p:pda", "reguliert"),
  e("e:sos-54321", "p:pda", "reguliert"),

  // ── Varianten → Kern ────────────────────────────────────────────
  e("p:pda-intern", "p:pda", "profil"),
  e("p:pda-indirekt", "p:pda", "profil"),
  e("p:pda-antworten", "p:pda", "profil"),
  e("p:pda-strategien", "p:pda", "profil"),
  e("p:pda-masking", "p:pda", "profil"),
  e("p:pda-geschlecht", "p:pda", "profil"),
  e("p:pda-erwachsene", "p:pda", "profil"),
  e("p:pda-familie", "p:pda", "profil"),
  e("p:pda-beziehung", "p:pda", "profil"),
  e("p:pda-adhs", "p:pda", "profil"),
  e("p:pda-audhd", "p:pda", "profil"),
  e("p:pda-kptbs", "p:pda", "profil"),

  // ── Innere Anforderungen ────────────────────────────────────────
  e("p:pda-intern", "state:dorsal", "erregung"),
  e("p:pda-intern", "schlaf", "profil"),
  e("e:abend", "p:pda-intern", "reguliert"),
  e("e:koerperscan", "p:pda-intern", "reguliert"),

  // ── Indirekte Anforderungen ─────────────────────────────────────
  e("p:pda-indirekt", "hypervigilanz", "profil"),
  e("p:pda-indirekt", "state:sympathikus", "erregung"),

  // ── Die vielen F's ──────────────────────────────────────────────
  e("p:pda-antworten", "state:sympathikus", "erregung"),
  e("p:pda-antworten", "state:dorsal", "erregung"),
  e("p:pda-antworten", "erstarrung", "profil"),
  e("p:pda-antworten", "neben-sich", "profil"),
  e("e:sos-ausatmen", "p:pda-antworten", "reguliert"),
  e("e:schuetteln", "p:pda-antworten", "reguliert"),

  // ── Maskierung & Geschlecht ─────────────────────────────────────
  e("p:pda-masking", "state:sympathikus", "erregung"),
  e("p:pda-masking", "gefuehlsabstumpfung", "profil"),
  e("p:pda-geschlecht", "scham", "profil"),

  // ── Erwachsene ──────────────────────────────────────────────────
  e("p:pda-erwachsene", "konzentration", "profil"),
  e("p:pda-erwachsene", "schlaf", "profil"),
  e("p:pda-erwachsene", "leere", "profil"),

  // ── Familie & Schule ────────────────────────────────────────────
  e("p:pda-familie", "vermeidung-orte", "profil"),
  e("p:pda-familie", "reizbar", "profil"),
  e("p:pda-familie", "cat:arousal", "profil"),

  // ── Beziehung ───────────────────────────────────────────────────
  e("p:pda-beziehung", "naehe", "profil"),
  e("p:pda-beziehung", "misstrauen", "profil"),
  e("e:co-regulation", "p:pda-beziehung", "reguliert"),
  e("m:narm", "p:pda-beziehung", "behandlt"),

  // ── Überlappungen ───────────────────────────────────────────────
  e("p:pda-adhs", "konzentration", "profil"),
  e("p:pda-adhs", "reizbar", "profil"),
  e("p:pda-audhd", "gefuehlsueberflutung", "profil"),
  e("p:pda-kptbs", "cat:vermeidung", "profil"),
  e("p:pda-kptbs", "scham", "profil"),
  e("e:pendeln", "p:pda-kptbs", "reguliert"),
  e("m:schematherapie", "p:pda-kptbs", "behandlt"),
];
