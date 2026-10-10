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
import pfFoa from "@/assets/gen/med-pf-foa.png";
import pfNeuner from "@/assets/gen/med-pf-neuner.png";
import pfOgden from "@/assets/gen/med-pf-ogden.png";
import pfHeller from "@/assets/gen/med-pf-heller.png";
import pfReddemann from "@/assets/gen/med-pf-reddemann.png";
import pfSmucker from "@/assets/gen/med-pf-smucker.png";
import pfGrand from "@/assets/gen/med-pf-grand.png";
import pfCorrigan from "@/assets/gen/med-pf-corrigan.png";
import pfSchwartz from "@/assets/gen/med-pf-schwartz.png";
import pfYoung from "@/assets/gen/med-pf-young.png";
import pfBerceli from "@/assets/gen/med-pf-berceli.png";
import pfBesser from "@/assets/gen/med-pf-besser.png";

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
  "m:tfcbt": pfFoa,
  "m:net": pfNeuner,
  "m:sp": pfOgden,
  "m:narm": pfHeller,
  "m:pitt": pfReddemann,
  "m:irrt": pfSmucker,
  "m:brainspotting": pfGrand,
  "m:dbr": pfCorrigan,
  "m:egostate": pfSchwartz,
  "m:schematherapie": pfYoung,
  "m:tre": pfBerceli,
  "m:krst": pfBesser,
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
  { id: "m:tfcbt", name: "Edna Foa", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:net", name: "Neuner, Schauer, Elbert", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:sp", name: "Pat Ogden", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:narm", name: "Laurence Heller", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:pitt", name: "Luise Reddemann", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:irrt", name: "Smucker; Arntz", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:brainspotting", name: "David Grand", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:dbr", name: "Frank Corrigan", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:egostate", name: "Watkins; R. Schwartz (IFS)", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:schematherapie", name: "Jeffrey Young", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:tre", name: "David Berceli", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
  { id: "m:krst", name: "Lutz Besser", source: "künstlerische Darstellung (kein freies Foto)", license: "—" },
];
