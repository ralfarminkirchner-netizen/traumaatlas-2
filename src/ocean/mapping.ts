// Mapping-Layer: Freitext-Phänomene → Atlas-Einträge.
// Transparent kuratiert: Einträge sind nachvollziehbare Wortnähen, keine Blackbox.

import { symptomCategories } from "@/data/symptoms";
import { exercises } from "@/data/exercises";
import { methods } from "@/data/methods";

export type TargetType = "symptom" | "exercise" | "method" | "category";

export interface MappedLink {
  targetId: string;
  targetType: TargetType;
  label: string;
  strength: number; // 0..1
  reason: string;
}

// Kuratierte Wortnähen: umgangssprachliches Wort → Atlas-Symptome.
// Jede Zeile ist bewusst lesbar („Wortnähe"), keine automatische Semantik.
const CURATED: { pattern: RegExp; targets: { id: string; type: TargetType; label: string; strength: number; reason: string }[] }[] = [
  {
    pattern: /depress|hoffnungslos|freudlos|freude|motivation|motiviert|sinn|wozu|gleichgültig|gleichgultig/i,
    targets: [
      { id: "leere", type: "symptom", label: "Anhaltende innere Leere, Hoffnungslosigkeit", strength: 0.9, reason: "Wortnähe: Leere / Hoffnungslosigkeit" },
      { id: "gefuehlstaubheit", type: "symptom", label: "Emotionale Taubheit, kaum Freude möglich", strength: 0.8, reason: "Wortnähe: Freudlosigkeit" },
      { id: "zurueckgezogen", type: "symptom", label: "Rückzug, Verlust der Interessen", strength: 0.7, reason: "Wortnähe: Rückzug" },
    ],
  },
  {
    pattern: /angst|panik|ängstlich|angstlich|furcht|beben|zittern/i,
    targets: [
      { id: "panik", type: "symptom", label: "Panikattacken", strength: 0.9, reason: "Wortnähe: Angst / Panik" },
      { id: "herzrasen", type: "symptom", label: "Herzrasen, Atemnot, Enge", strength: 0.7, reason: "Körperlicher Angst-Alarm" },
      { id: "hypervigilanz", type: "symptom", label: "Ständige Wachsamkeit", strength: 0.6, reason: "Wortnähe: Anspannung" },
    ],
  },
  {
    pattern: /schlaf|müd|mued|erschöpft|erschoepft|matt|batterie leer/i,
    targets: [
      { id: "schlaf", type: "symptom", label: "Schlafstörungen", strength: 0.9, reason: "Wortnähe: Schlaf" },
      { id: "konzentration", type: "symptom", label: "Konzentrations- und Gedächtnisstörungen", strength: 0.6, reason: "Begleiterscheinung von Erschöpfung" },
    ],
  },
  {
    pattern: /wut|reiz|zorn|aggressiv|gereizt|patience|unkontrollierbar/i,
    targets: [
      { id: "reizbar", type: "symptom", label: "Reizbarkeit, Wutausbrüche", strength: 0.9, reason: "Wortnähe: Wut / Reizbarkeit" },
      { id: "gefuehlsueberflutung", type: "symptom", label: "Gefühle schwanken extrem", strength: 0.6, reason: "Wortnähe: Unkontrollierbarkeit" },
    ],
  },
  {
    pattern: /scham|schuld|wertlos|kaputt|hasse mich|nicht gut genug|versag/i,
    targets: [
      { id: "scham", type: "symptom", label: "Tiefe Scham-/Schuldgefühle", strength: 0.9, reason: "Wortnähe: Scham / Schuld" },
      { id: "selbstschaden", type: "symptom", label: "Selbstschädigendes Verhalten", strength: 0.5, reason: "Möglicher Zusammenhang" },
    ],
  },
  {
    pattern: /traurig|weinen|trauer|schwer|niedergeschlagen|weinerlich/i,
    targets: [
      { id: "gefuehlsueberflutung", type: "symptom", label: "Gefühle schwanken extrem", strength: 0.7, reason: "Wortnähe: Trauer / Überflutung" },
      { id: "leere", type: "symptom", label: "Anhaltende innere Leere", strength: 0.6, reason: "Wortnähe: Niedergeschlagenheit" },
    ],
  },
  {
    pattern: /albtraum|traum|nacht|nächtlich|naechtlich/i,
    targets: [
      { id: "albttraeume", type: "symptom", label: "Wiederkehrende Albträume", strength: 0.9, reason: "Wortnähe: Albträume" },
      { id: "aufdringlich", type: "symptom", label: "Aufdringliche Erinnerungen", strength: 0.5, reason: "Wortnähe: Träume / Bilder" },
    ],
  },
  {
    pattern: /flashback|rückblende|rueckblende|wieder|vergangenheit|erinnerung/i,
    targets: [
      { id: "flashbacks", type: "symptom", label: "Flashbacks", strength: 0.9, reason: "Wortnähe: Wiedererleben" },
      { id: "trigger", type: "symptom", label: "Starke Reaktionen auf Trigger", strength: 0.7, reason: "Wortnähe: Erinnerungen" },
      { id: "gefuehlserinnerungen", type: "symptom", label: "Gefühl- oder Körpererinnerungen", strength: 0.6, reason: "Wortnähe: Erinnerung" },
    ],
  },
  {
    pattern: /starr|erstarr|lähm|laehm|eingefroren|blockiert|bewegungslos/i,
    targets: [
      { id: "erstarrung", type: "symptom", label: "Erstarre, kann nicht reagieren", strength: 0.9, reason: "Wortnähe: Erstarrung" },
      { id: "erstarrt", type: "symptom", label: "Spüre kaum meinen Körper", strength: 0.7, reason: "Wortnähe: Gefühllosigkeit" },
    ],
  },
  {
    pattern: /benommen|nebel|weg|unwirklich|realität|realitaet|glas|absent|abwesend/i,
    targets: [
      { id: "entrückt", type: "symptom", label: "Welt fühlt sich unwirklich an", strength: 0.9, reason: "Wortnähe: Unwirklichkeit" },
      { id: "neben-sich", type: "symptom", label: "Gefühl, nebenselbst zu stehen", strength: 0.8, reason: "Wortnähe: Weg-Sein" },
    ],
  },
  {
    pattern: /leer|taub|nichts fühlen|gefühllos|abgestumpft/i,
    targets: [
      { id: "gefuehlsabstumpfung", type: "symptom", label: "Gefühle fühlen taub/fern", strength: 0.9, reason: "Wortnähe: Taubheit" },
      { id: "gefuehlstaubheit", type: "symptom", label: "Emotionale Taubheit", strength: 0.8, reason: "Wortnähe: Gefühllosigkeit" },
    ],
  },
  {
    pattern: /stress|anspann|angespannt|druck|keine luft|überfordert|ueberfordert/i,
    targets: [
      { id: "hypervigilanz", type: "symptom", label: "Ständige Wachsamkeit", strength: 0.8, reason: "Wortnähe: Anspannung" },
      { id: "herzrasen", type: "symptom", label: "Herzrasen, Atemnot, Enge", strength: 0.7, reason: "Wortnähe: Druck / Enge" },
      { id: "reizbar", type: "symptom", label: "Reizbarkeit, Wutausbrüche", strength: 0.5, reason: "Typische Stressfolge" },
    ],
  },
  {
    pattern: /nähe|naehe|bindung|verlassen|allein|einsam|vertrauen/i,
    targets: [
      { id: "naehe", type: "symptom", label: "Nähe ist bedrohlich", strength: 0.8, reason: "Wortnähe: Nähe / Bindung" },
      { id: "misstrauen", type: "symptom", label: "Vertraue anderen kaum", strength: 0.7, reason: "Wortnähe: Vertrauen" },
      { id: "co-regulation", type: "exercise", label: "Übung: Co-Regulation", strength: 0.6, reason: "Übung zu diesem Thema" },
    ],
  },
  {
    pattern: /schmerz|körper|koerper|magen|haut|herz/i,
    targets: [
      { id: "schmerzen", type: "symptom", label: "Chronische Schmerzen ohne Befund", strength: 0.8, reason: "Wortnähe: Körper" },
      { id: "magen", type: "symptom", label: "Magen-Darm-Beschwerden", strength: 0.6, reason: "Wortnähe: Magen" },
    ],
  },
  {
    pattern: /konzentration|fokus|gedächtnis|gedaechtnis|vergess|lücken|luecken/i,
    targets: [
      { id: "konzentration", type: "symptom", label: "Konzentrationsstörungen", strength: 0.9, reason: "Wortnähe: Konzentration" },
      { id: "luecken", type: "symptom", label: "Erinnerungslücken", strength: 0.7, reason: "Wortnähe: Lücken" },
    ],
  },
  {
    pattern: /vermeid|meide|ausweich|nicht hingehen|ablenk/i,
    targets: [
      { id: "vermeidung-orte", type: "symptom", label: "Vermeide Orte, Situationen, Menschen", strength: 0.9, reason: "Wortnähe: Vermeidung" },
      { id: "gedankenverdrängung", type: "symptom", label: "Verdränge das Geschehene", strength: 0.7, reason: "Wortnähe: Verdrängung" },
    ],
  },
];

const ALL_SYMPTOMS = symptomCategories.flatMap((c) =>
  c.symptoms.map((s) => ({ ...s, categoryId: c.id, categoryTitle: c.title })),
);

/** Freitext → Atlas-Einträge. Liefert sortierte, deduplizierte Links. */
export function mapTextToAtlas(text: string): MappedLink[] {
  const links = new Map<string, MappedLink>();
  const add = (l: MappedLink) => {
    const key = `${l.targetType}:${l.targetId}`;
    const prev = links.get(key);
    if (!prev || prev.strength < l.strength) links.set(key, l);
  };

  // 1. Kuratierte Wortnähen
  for (const rule of CURATED) {
    if (!rule.pattern.test(text)) continue;
    for (const t of rule.targets) {
      add({ targetId: t.id, targetType: t.type, label: t.label, strength: t.strength, reason: t.reason });
    }
  }

  // 2. Token-Überlapp mit echten Symptombezeichnungen (transparent)
  const norm = (s: string) =>
    s.toLowerCase().replace(/[.,;:!?()"']/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const words = norm(text);
  if (words.length > 0) {
    for (const s of ALL_SYMPTOMS) {
      const labelWords = norm(s.label);
      const hits = labelWords.filter((lw) => words.some((w) => w.startsWith(lw) || lw.startsWith(w)));
      if (hits.length > 0) {
        const strength = Math.min(0.95, 0.45 + hits.length * 0.18);
        add({
          targetId: s.id,
          targetType: "symptom",
          label: s.label,
          strength,
          reason: `Übereinstimmung: „${hits.slice(0, 2).join(", ")}"`,
        });
      }
    }
  }

  // 3. Übungen und Verfahren nach Namensnähe
  const q = text.toLowerCase();
  for (const e of exercises) {
    const name = e.title.toLowerCase();
    if (q.length > 4 && name.split(/\s+/).some((w) => w.length > 4 && q.includes(w))) {
      add({ targetId: e.id, targetType: "exercise", label: `Übung: ${e.title}`, strength: 0.55, reason: "Namensnähe" });
    }
  }
  for (const m of methods) {
    if (q.length > 4 && m.name.toLowerCase().split(/\s+/).some((w) => w.length > 4 && q.includes(w))) {
      add({ targetId: m.id, targetType: "method", label: m.name, strength: 0.55, reason: "Namensnähe" });
    }
  }

  return [...links.values()].sort((a, b) => b.strength - a.strength).slice(0, 6);
}

/** Farbsignatur je Zieltyp — die Phänomene leuchten unterschiedlich. */
export const TYPE_COLORS: Record<TargetType, string> = {
  symptom: "#d98a7e",
  exercise: "#8fd8cf",
  method: "#e2b35c",
  category: "#b48ea3",
};

/** Erregungslage einer Symptom-ID (für Anziehung/Abstoßung im Meer). */
export function arousalOfSymptom(id: string): "hyper" | "hypo" | "both" | null {
  const s = ALL_SYMPTOMS.find((x) => x.id === id);
  return s ? s.arousal : null;
}
