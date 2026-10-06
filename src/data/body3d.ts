// 3D-Ankerpunkte für das Körpermodell (TRAUMAATLAS)
// Erweitert nervous.ts (bodyRegions) um Raumkoordinaten, ohne die Vorgänger-Dateien zu ändern.
// Modellraum: stehende Figur, Füße bei y=0, Kopf bei y≈1.8, Blickrichtung +z.

export type Vec3 = [number, number, number];

export interface RegionAnchor {
  /** id identisch zu bodyRegions (nervous.ts) */
  id: string;
  label: string;
  /** Mittelpunkt der Region im Modellraum */
  position: Vec3;
  /** ungefährer Radius der Region (Kugel/Emblem) */
  radius: number;
  /** Hyperarousal (Sympathikus): typische Belastung dieser Region */
  loadHyper: string;
  /** Hypoarousal (dorsaler Vagus): typische Belastung dieser Region */
  loadHypo: string;
  /** Ventrale Sicherheit: wie sich die Region bei Regulation anfühlt */
  loadVentral: string;
  /** passende Übungen (ids aus exercises.ts) */
  exercises: string[];
  /** dazugehörige Anatomie-Strukturen (ids aus structures) */
  structures: string[];
}

export const regionAnchors: RegionAnchor[] = [
  {
    id: "kopf",
    label: "Kopf & Gesicht",
    position: [0, 1.6, 0],
    radius: 0.15,
    loadHyper: "Denken kreist, Schläfen drücken, Kiefer presst – der Kopf wird zum Kommandozentrum des Alarms.",
    loadHypo: "Weg sein, der Blick wird glasig und leer – Gedanken sind wie durch Watte.",
    loadVentral: "Denken wird klar und flexibel, der Blick weich und beweglich.",
    exercises: ["sos-54321", "sos-orientieren"],
    structures: ["masseter-links", "masseter-rechts"],
  },
  {
    id: "hals",
    label: "Hals & Kehle",
    position: [0, 1.4, 0.01],
    radius: 0.07,
    loadHyper: "Kloßgefühl, Schlucken fällt schwer, die Stimme wird eng – der Vagus meldet Alarm.",
    loadHypo: "Stimme wird flach und tonlos, die Kehle fühlt sich wie zugeschnürt an.",
    loadVentral: "Atem und Stimme fließen, Sprechen fühlt sich leicht an.",
    exercises: ["voo", "sos-ausatmen"],
    structures: ["vagus-hals"],
  },
  {
    id: "brust",
    label: "Brustkorb & Herz",
    position: [0, 1.2, 0.03],
    radius: 0.16,
    loadHyper: "Herzrasen, pochende Enge, flache Schnappatmung – das Beschleunigungssystem läuft auf Hochtouren.",
    loadHypo: "Druck und Kälte im Brustraum, langsamer Puls, das Herz scheint sich zurückzuziehen.",
    loadVentral: "Herzschlag und Atem werden ruhig, tiefer, gleichmäßig.",
    exercises: ["sos-ausatmen", "koerperscan"],
    structures: ["herz", "vagus-brust"],
  },
  {
    id: "bauch",
    label: "Bauch & Solarplexus",
    position: [0, 0.96, 0.03],
    radius: 0.13,
    loadHyper: "Magen zieht sich zusammen, Kribbeln, Übelkeit – die Verdauung wird zugunsten der Alarmbereitschaft abgeschaltet.",
    loadHypo: "Hohlkörpergefühl, Taubheit, der Bauchraum fühlt sich leer und abgeschaltet an.",
    loadVentral: "Wärme und Weite im Bauchraum, der Solarplexus wird zum Ruhepol.",
    exercises: ["koerperscan", "pendeln"],
    structures: ["solarplexus", "magen", "vagus-bauch"],
  },
  {
    id: "schultern",
    label: "Schultern & Arme",
    position: [0, 1.32, 0],
    radius: 0.2,
    loadHyper: "Schultern hochgezogen, Nacken wie Stein, Fäuste oder Unterarme angespannt – Kampfbereitschaft im Gewebe.",
    loadHypo: "Schwere, müde Glieder, die Arme hängen kraftlos herunter – die Energie ist weg.",
    loadVentral: "Schultern sinken von selbst, die Arme werden schwer auf angenehme Weise.",
    exercises: ["schuetteln", "abend"],
    structures: ["trapezius"],
  },
  {
    id: "becken",
    label: "Becken & Beine",
    position: [0, 0.52, 0],
    radius: 0.18,
    loadHyper: "Kann nicht stillsitzen, Beine wollen rennen oder treten – Mobilisierung ohne Ausgang.",
    loadHypo: "Erstarrung, „wie angewurzelt“, schwere zittrige Beine – die Notbremse zieht den Körper nach unten.",
    loadVentral: "Fest stehen, spüren, dass der Boden trägt – Wurzeln statt Anker.",
    exercises: ["aktivieren", "sos-orientieren"],
    structures: ["zwerchfell"],
  },
];

export type StructureId =
  | "vagus-hals"
  | "vagus-brust"
  | "vagus-bauch"
  | "solarplexus"
  | "zwerchfell"
  | "masseter-links"
  | "masseter-rechts"
  | "trapezius"
  | "herz"
  | "magen"
  | "hpa";

export interface BodyStructure {
  id: StructureId;
  label: string;
  kind: "nerv" | "organ" | "muskel";
  /** Mittelpunkt */
  position: Vec3;
  /** Skalierung (Kugel-Radius oder Torus-/Röhren-Parameter) */
  scale: number;
  /** für Röhren (Vagus): Wegpunkte */
  path?: Vec3[];
  note: string;
}

/** Vagusnerv-Verlauf: Hals → Brust → Bauch (leuchtende Struktur) */
export const vagusPath: Vec3[] = [
  [0, 1.46, 0.07],
  [0.015, 1.34, 0.1],
  [-0.01, 1.22, 0.11],
  [0.01, 1.08, 0.1],
  [0, 0.94, 0.08],
  [0, 0.82, 0.05],
];

export const bodyStructures: BodyStructure[] = [
  { id: "vagus-hals", label: "Vagus · Hals", kind: "nerv", position: [0, 1.42, 0.08], scale: 0.012, path: vagusPath.slice(0, 2), note: "Der Ventralisierungs-Nerv zieht vom Hirnstamm durch den Hals." },
  { id: "vagus-brust", label: "Vagus · Brust", kind: "nerv", position: [0, 1.2, 0.1], scale: 0.012, path: vagusPath.slice(1, 4), note: "Verästelt sich an Herz und Lunge – Herzraten-Variabilität wird hier gedrosselt." },
  { id: "vagus-bauch", label: "Vagus · Bauch", kind: "nerv", position: [0, 0.9, 0.07], scale: 0.012, path: vagusPath.slice(3), note: "Der Bauchast reguliert Verdauung und den Ruhezustand des Körpers." },
  { id: "solarplexus", label: "Solarplexus", kind: "nerv", position: [0, 1.03, 0.1], scale: 0.035, note: "Nervengeflecht unter dem Zwerchfell – beim Startle zieht es sich zusammen." },
  { id: "zwerchfell", label: "Zwerchfell", kind: "muskel", position: [0, 1.0, 0], scale: 0.14, note: "Die Atemmuskel-Scheibe: bei Alarm hebt sie sich, Atem wird flach." },
  { id: "masseter-links", label: "M. masseter (links)", kind: "muskel", position: [-0.085, 1.56, 0.05], scale: 0.035, note: "Kaumuskel – Kieferpressen ist ein klassisches Sympathikus-Signal." },
  { id: "masseter-rechts", label: "M. masseter (rechts)", kind: "muskel", position: [0.085, 1.56, 0.05], scale: 0.035, note: "Kaumuskel – Kieferpressen ist ein klassisches Sympathikus-Signal." },
  { id: "trapezius", label: "Trapezius & Nacken", kind: "muskel", position: [0, 1.36, -0.05], scale: 0.09, note: "Die Anspannung des Nacken-Schulter-Rands speichert Dauerbereitschaft." },
  { id: "herz", label: "Herz", kind: "organ", position: [-0.06, 1.24, 0.07], scale: 0.055, note: "Schlägt bei Sympathikus schnell und hart, bei dorsalem Vagus gedrosselt." },
  { id: "magen", label: "Magen-Darm-Trakt", kind: "organ", position: [0.06, 0.92, 0.05], scale: 0.06, note: "Die „zweite Gehirnachse“ – viele Trigger sitzen im Bauch." },
  { id: "hpa", label: "HPA-Achse", kind: "nerv", position: [0.1, 1.66, -0.02], scale: 0.025, note: "Hypothalamus–Hypophyse–Nebenniere: das Hormon-Dreieck des Stresssystems (kleine Ikone am Kopf)." },
];

/** Transparenz-Stufen: 0 Haut, 1 Muskulatur, 2 Organe, 3 Nervensystem */
export const LAYERS = [
  { id: 0, label: "Haut", hint: "Die sichtbare Oberfläche" },
  { id: 1, label: "Muskulatur", hint: "Wo Spannung gespeichert wird" },
  { id: 2, label: "Organe", hint: "Herz, Atmung, Verdauung" },
  { id: 3, label: "Nervensystem", hint: "Vagus & Strukturen" },
] as const;

// ── Symptom → Körperregion-Mapping (Erweiterung von navigatorLinks) ──
export interface SymptomRegionMap {
  symptomId: string;
  regionIds: string[];
}

/** regionIds verweisen auf bodyRegions/regionAnchors-ids */
export const symptomRegionMap: SymptomRegionMap[] = [
  { symptomId: "flashbacks", regionIds: ["kopf", "brust"] },
  { symptomId: "albttraeume", regionIds: ["kopf", "brust"] },
  { symptomId: "aufdringlich", regionIds: ["kopf"] },
  { symptomId: "trigger", regionIds: ["brust", "hals"] },
  { symptomId: "gefuehlserinnerungen", regionIds: ["bauch", "becken"] },
  { symptomId: "schreck", regionIds: ["schultern", "kopf"] },
  { symptomId: "schlaf", regionIds: ["kopf", "schultern"] },
  { symptomId: "reizbar", regionIds: ["kopf", "schultern"] },
  { symptomId: "konzentration", regionIds: ["kopf"] },
  { symptomId: "hypervigilanz", regionIds: ["kopf", "schultern"] },
  { symptomId: "herzrasen", regionIds: ["brust", "hals"] },
  { symptomId: "vermeidung-orte", regionIds: ["becken", "kopf"] },
  { symptomId: "gedankenverdrängung", regionIds: ["kopf"] },
  { symptomId: "gefuehlsabstumpfung", regionIds: ["bauch", "kopf"] },
  { symptomId: "zurueckgezogen", regionIds: ["becken", "brust"] },
  { symptomId: "neben-sich", regionIds: ["kopf", "becken"] },
  { symptomId: "erstarrung", regionIds: ["becken", "schultern"] },
  { symptomId: "luecken", regionIds: ["kopf"] },
  { symptomId: "entrueckt", regionIds: ["kopf", "becken"] },
  { symptomId: "erstarrt", regionIds: ["becken", "bauch"] },
  { symptomId: "gefuehlsueberflutung", regionIds: ["brust", "bauch"] },
  { symptomId: "gefuehlstaubheit", regionIds: ["brust", "bauch"] },
  { symptomId: "scham", regionIds: ["brust", "bauch"] },
  { symptomId: "selbstschaden", regionIds: ["schultern", "becken"] },
  { symptomId: "leere", regionIds: ["bauch", "becken"] },
  { symptomId: "misstrauen", regionIds: ["brust", "hals"] },
  { symptomId: "naehe", regionIds: ["brust", "hals"] },
  { symptomId: "schmerzen", regionIds: ["schultern", "becken"] },
  { symptomId: "magen", regionIds: ["bauch"] },
  { symptomId: "haut", regionIds: ["kopf", "schultern"] },
  { symptomId: "panik", regionIds: ["brust", "hals"] },
];
