// Transduktion: relationstreue Abbildung der Invariante in das Vokabular
// einer Welt. IDs nie verändert; fehlende Einträge FALLEN AUF DIE INVARIANTE
// zurück — eine Welt muss unvollständig überstehen können.

import type { AtlasNode } from "@/data/graph";
import { SCHATTEN, type SchattenEintrag } from "@/data/shadow";

export type WeltId = "meer" | "schatten" | "orbital";

export interface TransduktionLesart {
  label: string;
  sub?: string;
  summary?: string;
}

/** Typ-Fallbacks (Label-Ebene) — greifen, wenn kein ID-Eintrag existiert. */
const TYP_FALLBACK: Partial<Record<AtlasNode["type"], SchattenEintrag>> = {
  method: { label: "", begegnung: "ein Weg, der für viele getragen hat" },
  exercise: { label: "", begegnung: "eine Übung, die Sicherheit übt" },
  block: { label: "", begegnung: "ein Baustein des Alltags" },
  discipline: { label: "", begegnung: "eine Schule des Verstehens" },
  state: { label: "", begegnung: "ein Zustand des Nervensystems" },
};

export const HAT_TRANSDUKTION: Record<WeltId, boolean> = {
  meer: false,
  schatten: true,
  orbital: false,
};

/** Lesart eines Knotens in einer Welt. null = Invariante anzeigen. */
export function transduziere(welt: WeltId, node: AtlasNode): TransduktionLesart | null {
  if (welt !== "schatten" || !HAT_TRANSDUKTION.schatten) return null;
  const eintrag = SCHATTEN[node.id];
  if (eintrag) {
    return {
      label: eintrag.label || node.label,
      sub: node.sub,
      summary: eintrag.begegnung || node.summary,
    };
  }
  const fallback = TYP_FALLBACK[node.type];
  if (fallback) {
    return {
      label: node.label,
      sub: node.sub,
      summary: fallback.begegnung || node.summary,
    };
  }
  return null;
}

/** Abgedeckte Pflicht-IDs (Proben: Transduktions-Abdeckung). */
export const TRANSDUKTION_PFLICHT: string[] = [
  // 32 Symptome
  "flashbacks", "albttraeume", "aufdringlich", "trigger", "gefuehlserinnerungen",
  "schreck", "schlaf", "reizbar", "konzentration", "hypervigilanz", "herzrasen",
  "vermeidung-orte", "gedankenverdrängung", "gefuehlsabstumpfung", "zurueckgezogen",
  "neben-sich", "erstarrung", "luecken", "entrückt", "erstarrt",
  "gefuehlsueberflutung", "gefuehlstaubheit", "scham", "selbstschaden", "leere",
  "misstrauen", "naehe", "schmerzen", "magen", "haut", "panik",
  // 3 Zustände, 6 Kategorien, 3 Phasen, 15 Profile
  "state:ventral", "state:sympathikus", "state:dorsal",
  "cat:intrusion", "cat:arousal", "cat:vermeidung", "cat:dissoziation",
  "cat:affekt", "cat:beziehung",
  "phase:stabilisierung", "phase:konfrontation", "phase:integration",
  "p:pda", "p:pda-anforderung", "p:pda-autonomie", "p:pda-intern",
  "p:pda-indirekt", "p:pda-antworten", "p:pda-strategien", "p:pda-masking",
  "p:pda-geschlecht", "p:pda-erwachsene", "p:pda-familie", "p:pda-beziehung",
  "p:pda-adhs", "p:pda-audhd", "p:pda-kptbs",
];
