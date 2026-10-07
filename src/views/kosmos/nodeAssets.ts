// Porträt-Medaillons für Knoten mit Schlüsselpersönlichkeit.
// Echte, gemeinfreie Fotos von Wikimedia Commons, wo verfügbar
// (siehe src/assets/portraits/credits.json); sonst künstlerische Darstellung
// (AI), weil es kein freies Foto gibt — kenntlich gemacht in den Credits.
import phFreud from "@/assets/portraits/freud.jpg";
import phJung from "@/assets/portraits/jung.jpg";
import phWundt from "@/assets/portraits/wundt.jpg";
import phReich from "@/assets/portraits/reich.jpg";
import phRogers from "@/assets/portraits/rogers.jpg";
import phVanderkolk from "@/assets/portraits/vanderkolk.jpg";
import phBowlby from "@/assets/portraits/bowlby.jpg";
import phPorges from "@/assets/portraits/porges.jpg";
import phPerls from "@/assets/portraits/perls.jpg";
import phAdler from "@/assets/portraits/adler.jpg";

import pfLevine from "@/assets/gen/med-pf-levine.png";
import pfShapiro from "@/assets/gen/med-pf-shapiro.png";
import pfHerman from "@/assets/gen/med-pf-herman.png";
import pfLinehan from "@/assets/gen/med-pf-linehan.png";

/** nodeId → Porträt (URL) */
export const PORTRAITS: Record<string, string> = {
  psychoanalyse: phFreud,
  jung: phJung,
  adler: phAdler,
  wundt: phWundt,
  reich: phReich,
  bindung: phBowlby,
  herman: pfHerman,
  polyvagal: phPorges,
  humanistisch: phRogers,
  gestalt: phPerls,
  "m:polyvagal": phPorges,
  "m:emdr": pfShapiro,
  "m:se": pfLevine,
  "m:dbt": pfLinehan,
  "m:tsyoga": phVanderkolk,
};

/** Ids, für die echte Fotos vorliegen (Credits: portraits/credits.json). */
export const PHOTO_IDS = new Set([
  "psychoanalyse", "jung", "wundt", "reich", "humanistisch", "m:tsyoga",
  "bindung", "polyvagal", "gestalt",
]);

export const PORTRAIT_NODE_IDS = new Set(Object.keys(PORTRAITS));

/** Quellenangaben für die Credits-Ansicht. */
export const PORTRAIT_CREDITS: { id: string; name: string; source: string; license: string }[] = [
  { id: "psychoanalyse", name: "Sigmund Freud", source: "Wikimedia Commons, Foto: Max Halberstadt", license: "Public domain" },
  { id: "jung", name: "C. G. Jung", source: "Wikimedia Commons", license: "Public domain" },
  { id: "wundt", name: "Wilhelm Wundt", source: "Wikimedia Commons", license: "Public domain" },
  { id: "reich", name: "Wilhelm Reich", source: "Wikimedia Commons", license: "Public domain" },
  { id: "humanistisch", name: "Carl Rogers", source: "Wikimedia Commons, APA 1947", license: "CC0" },
  { id: "m:tsyoga", name: "Bessel van der Kolk", source: "Wikimedia Commons, 2022", license: "CC BY 3.0" },
  { id: "bindung", name: "John Bowlby", source: "Wikipedia (en)", license: "siehe en.wikipedia.org" },
  { id: "polyvagal", name: "Stephen Porges", source: "Wikipedia (en)", license: "siehe en.wikipedia.org" },
  { id: "gestalt", name: "Fritz Perls", source: "Wikimedia Commons", license: "siehe Commons" },
  { id: "adler", name: "Alfred Adler", source: "Wikimedia Commons (Porträtzeichnung)", license: "Public domain" },
  { id: "m:se", name: "Peter Levine", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:emdr", name: "Francine Shapiro", source: "künstlerische Darstellung (kein brauchbares freies Foto)", license: "—" },
  { id: "herman", name: "Judith Herman", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:dbt", name: "Marsha Linehan", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
];
