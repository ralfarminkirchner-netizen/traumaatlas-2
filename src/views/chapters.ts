// Kapitel-Metadaten des Beziehungsuniversums
import type { ViewId } from "@/state/atlas-store";

import kvStart from "@/assets/kv-start.jpg";
import kvKaskade from "@/assets/kv-kaskade.jpg";
import kvPolyvagal from "@/assets/kv-polyvagal.jpg";
import kvToleranz from "@/assets/kv-toleranz.jpg";
import kvNavigator from "@/assets/kv-navigator.jpg";
import kvLexikon from "@/assets/kv-lexikon.jpg";
import kvStammbaum from "@/assets/kv-stammbaum.jpg";
import kvBaukasten from "@/assets/kv-baukasten.jpg";
import kvWechsel from "@/assets/kv-wechsel.jpg";
import kvWegweiser from "@/assets/kv-wegweiser.jpg";

export interface Chapter {
  id: ViewId;
  index: string; // "01" …
  title: string;
  kicker: string;
  sub: string;
  art: string;
}

export const CHAPTERS: Chapter[] = [
  { id: "kaskade", index: "02", title: "Die Stresskaskade", kicker: "Körper & Kaskade", sub: "Sechs Stationen einer überlebten Sekunde — als Reise durch die abstrakte Körperform.", art: kvKaskade },
  { id: "polyvagal", index: "03", title: "Drei Ebenen des Nervensystems", kicker: "Polyvagal", sub: "Ventraler Vagus, Sympathikus, dorsaler Vagus — drei Zonen, die ineinanderfließen.", art: kvPolyvagal },
  { id: "toleranz", index: "04", title: "Das Toleranzfenster", kicker: "Regulation", sub: "Ein Wellenband, das sich verbiegen lässt: Spielraum zwischen Erstarrung und Überflutung.", art: kvToleranz },
  { id: "navigator", index: "05", title: "Symptom-Navigator", kicker: "Orientierung", sub: "Vom Symptom zum Muster: Flüsse durch Erregungslage, Verdacht, Übung und Körperregion.", art: kvNavigator },
  { id: "lexikon", index: "06", title: "Übungs-Lexikon", kicker: "Selbsthilfe", sub: "Zwölf übungen mit Anleitung — gefiltert nach dem, das Nervensystem gerade braucht.", art: kvLexikon },
  { id: "stammbaum", index: "07", title: "Der Stammbaum", kicker: "Geschichte", sub: "Von der Antike bis heute: 140 Jahre Schulen, Theorien und Verfahren als Jahres-Landschaft.", art: kvStammbaum },
  { id: "baukasten", index: "08", title: "Programm-Baukasten", kicker: "Struktur", sub: "Stabilisierung, Verarbeitung, Integration: Das eigene Programm aus Bausteinen bauen.", art: kvBaukasten },
  { id: "wechsel", index: "09", title: "Wechselwirkungen", kicker: "System", sub: "Synergien, Reihenfolgen und blinde Flecken des eigenen Programms — als Netz.", art: kvWechsel },
  { id: "wegweiser", index: "10", title: "Wegweiser", kicker: "Hilfe finden", sub: "Verzeichnisse, Ambulanzen, Hotlines — der ruhige Weg zu professioneller Begleitung.", art: kvWegweiser },
];

export const HERO = {
  start: { id: "start" as ViewId, art: kvStart },
  kosmos: {
    id: "kosmos" as ViewId,
    art: kvStart,
    title: "Der große Graph",
    sub: "124 Knoten · 329 Beziehungen — Disziplinen, Verfahren, Symptome, Übungen als begehbarer Kosmos.",
  },
};
