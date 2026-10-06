// Nervensystem-Erweiterung für Atlas 2.0
// Polyvagal-Zustände, Toleranzfenster, Stresskaskade, Körperregionen

export type NervousStateId = "ventral" | "sympathikus" | "dorsal";

export interface NervousState {
  id: NervousStateId;
  name: string;
  short: string;
  color: string; // Hauptfarbe
  soft: string; // transparente Fläche
  description: string;
  bodySignals: string[];
  feelsLike: string;
  exercises: string[]; // exercise-ids
  methods: string[]; // method-ids
}

export const nervousStates: NervousState[] = [
  {
    id: "ventral",
    name: "Soziales Engagement (ventraler Vagus)",
    short: "Sicherheit & Verbindung",
    color: "#7fb8a4",
    soft: "rgba(127,184,164,0.14)",
    description:
      "Der jüngste Teil des autonomen Nervensystems: Herzfrequenz wird gedrosselt, Stimme und Mimik werden weich, der Körper ist offen für Kontakt. In diesem Zustand lernen, trauern, spielen und heilen wir.",
    bodySignals: ["ruhiger, tiefer Atem", "entspannter Kiefer & Schultern", "wärme im Brustraum", "Blick wird weich und beweglich"],
    feelsLike: "Geborgen, präsent, neugierig – verbunden mit sich und anderen.",
    exercises: ["sicherer-ort", "koerperscan", "co-regulation"],
    methods: ["narm", "polyvagal"],
  },
  {
    id: "sympathikus",
    name: "Sympathikus (Kampf & Flucht)",
    short: "Alarm & Energie",
    color: "#e2a35c",
    soft: "rgba(226,163,92,0.14)",
    description:
      "Das Beschleunigungssystem: Adrenalin und Cortisol schütten aus, Muskeln spannen sich, Herzfrequenz und Atmung steigen. Lebensnotwendig bei realer Gefahr – belastend, wenn der Alarm dauerhaft läuft.",
    bodySignals: ["Herzrasen, flache Atmung", "Anspannung in Kiefer, Nacken, Schultern", "Unruhe, Zwang zu Bewegung", "Schweiß, Kribbeln, Wärme"],
    feelsLike: "Getrieben, wachsam, gereizt – oder voller Panik, wenn nichts davon entladen werden kann.",
    exercises: ["sos-54321", "sos-ausatmen", "schuetteln", "abend"],
    methods: ["tfcbt", "emdr", "dbt"],
  },
  {
    id: "dorsal",
    name: "Dorsaler Vagus (Erstarrung & Rückzug)",
    short: "Notbremse & Abschalten",
    color: "#8b93c9",
    soft: "rgba(139,147,201,0.14)",
    description:
      "Die älteste Ebene, aus der Reptilien-Abstammung: Wenn Kampf und Flucht scheitern oder zwecklos erscheinen, schaltet das Nervensystem auf Sparflamme. Energie wird eingefroren – als Überlebensstrategie, nicht als Schwäche.",
    bodySignals: ["Taubheit, „weg sein“", "schwere, müde Glieder", "Druck im Brustraum, langsamer Puls", "Welt wirkt fern, wie durch Glas"],
    feelsLike: "Erstarrung, Leere, Hoffnungslosigkeit – der Körper hat die Notbremse gezogen.",
    exercises: ["aktivieren", "orientieren", "pendeln"],
    methods: ["dbr", "se", "sp"],
  },
];

// ── Toleranzfenster ────────────────────────────────────────────
export const windowOfTolerance = {
  title: "Das Toleranzfenster",
  body:
    "Der Zustand, in dem wir fühlen, denken und gleichzeitig mit uns selbst verbunden bleiben, ist begrenzt: zu viel Erregung (Hyperarousal) oder zu wenig (Hypoarousal) werfen uns aus dem Fenster. Trauma verengt es – sanfte, wiederholte Erfahrungen der Sicherheit weiten es wieder.",
  low: "Hypoarousal · Erstarrung, Taubheit, Rückzug",
  mid: "Toleranzfenster · fühlen und handeln zugleich",
  high: "Hyperarousal · Alarm, Unruhe, Überflutung",
};

// ── Stresskaskade ─────────────────────────────────────────────
export interface CascadeStep {
  id: string;
  title: string;
  time: string;
  color: string;
  body: string;
  nervous: NervousStateId;
}

export const stressCascade: CascadeStep[] = [
  {
    id: "wahrnehmung",
    title: "Wahrnehmung & Neurozeption",
    time: "0 ms – Sekunden",
    color: "#a8b8ce",
    nervous: "ventral",
    body: "Das Nervensystem prüft ununterbrochen, unbewusst und schneller als der Verstand: sicher, gefährlich oder lebensbedrohlich? Ein Geruch, ein Ton, eine Mimik genügen – es braucht keinen bewussten Gedanken.",
  },
  {
    id: "orientierung",
    title: "Orientierung & Startle",
    time: "Sekunden",
    color: "#e2a35c",
    nervous: "sympathikus",
    body: "Bei Gefahrensignal: der Körper schreckt, spitzt Ohren und Augen, dreht den Kopf zur Quelle. Muskelspannung entsteht – oft noch bevor wir wissen, warum. (Im Fokus von Deep Brain Reorienting.)",
  },
  {
    id: "mobilisierung",
    title: "Mobilisierung: Kampf oder Flucht",
    time: "Sekunden – Minuten",
    color: "#d97742",
    nervous: "sympathikus",
    body: "Adrenalin und Cortisol fluten den Körper: Herzschlag und Atmung beschleunigen sich, Blut fließt in die Muskeln. Der Organismus tut alles, um zu entkommen oder sich zu wehren.",
  },
  {
    id: "erstarrung",
    title: "Erstarrung, wenn Entkommen scheitert",
    time: "Wenn Überwältigung droht",
    color: "#8b93c9",
    nervous: "dorsal",
    body: "Ist Kampf oder Flucht unmöglich, zieht der dorsale Vagus die Notbremse: Der Körper erstarrt, Schmerzempfinden und Bewusstsein dämpfen sich. Viele traumatische Erlebnisse werden in diesem Zustand gespeichert.",
  },
  {
    id: "entladung",
    title: "Entladung & Nachbeben",
    time: "Minuten – Stunden",
    color: "#7fb8a4",
    nervous: "ventral",
    body: "Säugetiere „schütteln“ die Überlebensenergie nach der Gefahr ab (Zittern, Tieftonlaute, Gähnen) und kehren in den Sicherheitsmodus zurück. Der Mensch unterbricht diesen Kreislauf oft – die Energie bleibt im Körper zurück.",
  },
  {
    id: "speicherung",
    title: "Speicherung als Körpergedächtnis",
    time: "Langfristig",
    color: "#c9a0a8",
    nervous: "sympathikus",
    body: "Wenn die Reaktion nicht vollendet und entladen wurde, bleibt sie als „angehaltene“ Überlebensreaktion gespeichert: Trigger rufen die ganze Sequenz wieder hervor – oft ohne Bild oder Erklärung. Genau hier setzen Verarbeitungsverfahren an.",
  },
];

// ── Körperregionen (Silhouette) ───────────────────────────────
export interface BodyRegion {
  id: string;
  label: string;
  state: NervousStateId | "both";
  d: string; // SVG-Pfad in einer 200x520-Silhouette (viewBox "0 0 200 520")
  signals: string[];
}

export const bodyRegions: BodyRegion[] = [
  {
    id: "kopf",
    label: "Kopf & Gesicht",
    state: "both",
    d: "M100 24 C78 24 68 44 68 66 C68 84 74 96 80 104 L82 118 C84 126 92 132 100 132 C108 132 116 126 118 118 L120 104 C126 96 132 84 132 66 C132 44 122 24 100 24 Z",
    signals: ["Druck an Schläfen, Stirn", "Blick wird starr oder springt", "Kieferpressen, Zunge am Gaumen"],
  },
  {
    id: "hals",
    label: "Hals & Kehle",
    state: "sympathikus",
    d: "M84 132 L116 132 L122 162 L78 162 Z",
    signals: ["Kloßgefühl, Schluckbeschwerden", "Stimme wird eng oder brüchig", "Enge beim Atmen bis zur Kehle"],
  },
  {
    id: "brust",
    label: "Brustkorb & Herz",
    state: "sympathikus",
    d: "M62 168 C74 160 88 162 100 166 C112 162 126 160 138 168 L142 236 L58 236 Z",
    signals: ["Herzrasen, pochend", "Enge, Atemnot ohne Befund", "Schneller, flacher Atem"],
  },
  {
    id: "bauch",
    label: "Bauch & Solarplexus",
    state: "dorsal",
    d: "M58 240 L142 240 L138 300 L62 300 Z",
    signals: ["Magen-Darm-Beschwerden", "Kribbeln, Hohlkörpergefühl", "Übelkeit bei Erinnerungen"],
  },
  {
    id: "schultern",
    label: "Schultern & Arme",
    state: "sympathikus",
    d: "M40 170 C30 176 24 196 22 224 L18 300 L30 302 L38 250 L42 240 Z M160 170 C170 176 176 196 178 224 L182 300 L170 302 L162 250 L158 240 Z",
    signals: ["Schultern hochgezogen", "Fäuste oder Unterarme angespannt", "Schwere, müde Arme (Shutdown)"],
  },
  {
    id: "becken",
    label: "Becken & Beine",
    state: "dorsal",
    d: "M64 304 L98 304 L96 470 L70 470 Z M102 304 L136 304 L130 470 L104 470 Z",
    signals: ["Erstarrung, „wie angewurzelt“", "Zittern, schwere Beine", "kann nicht stillsitzen"],
  },
];

// ── Phasen (Stabilisierung → Verarbeitung → Integration) ────
export interface PhaseInfo {
  id: "stabilisierung" | "konfrontation" | "integration";
  label: string;
  subtitle: string;
  color: string;
  description: string;
  principles: string[];
}

export const phaseInfos: PhaseInfo[] = [
  {
    id: "stabilisierung",
    label: "Phase 1 · Stabilisierung",
    subtitle: "Sicherheit zuerst",
    color: "#7fb8a4",
    description:
      "Bevor belastende Erinnerungen berührt werden, braucht das Nervensystem wiederkehrende Erfahrungen von Sicherheit: Regulation lernen, Ressourcen aufbauen, Alltag stabilisieren. Diese Phase wird oft unterschätzt – sie ist kein „Vorschulprogramm“, sondern die Grundlage, auf der alles Weitere ruht.",
    principles: [
      "Toleranzfenster kennen und ausweiten",
      "SOS-Werkzeuge für Hyper- und Hypoarousal",
      "Routinen für Schlaf, Nahrung, Bewegung",
      "Co-Regulation: mindestens ein sicherer Mensch",
    ],
  },
  {
    id: "konfrontation",
    label: "Phase 2 · Verarbeitung",
    subtitle: "Das Trauma in dosierten Anteilen",
    color: "#e2a35c",
    description:
      "Erst wenn genug Stabilität vorhanden ist, wird das Unverarbeitete schrittweise berührt – dosiert, kontrollierbar, mit der Möglichkeit, jederzeit in die Sicherheit zurückzukehren (Pendeln). Diese Arbeit gehört in professionelle Begleitung.",
    principles: [
      "Dosierung vor Intensität (Titration)",
      "Immer eine Hand am Rückzugsort",
      "Verfahren nach Muster: EMDR, tf-KVT, SE …",
      "Nachbearbeitung einplanen, nicht überstürzen",
    ],
  },
  {
    id: "integration",
    label: "Phase 3 · Integration",
    subtitle: "Das Leben danach",
    color: "#c9a0a8",
    description:
      "Verarbeitetes wird Teil der Biografie statt ihrer Mitte: Beziehungen, Sinn, Lebensgestaltung und Selbstwert wachsen wieder. Integration ist kein Abschlusskapitel, sondern ein Übergang in ein selbstbestimmtes Leben.",
    principles: [
      "Neue Erfahrungen mit dem erweiterten Toleranzfenster",
      "Bindung und Nähe schrittweise üben",
      "Sinn, Werte und Zukunft gestalten",
      "Rückfälle als Wetter, nicht als Scheitern",
    ],
  },
];
