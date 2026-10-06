// Alltagsbausteine + Wechselwirkungsregeln + Blinde-Flecken-Logik (Atlas 2.0)

import type { NervousStateId } from "./nervous";

// ── Alltagsbausteine ─────────────────────────────────────────
export type BlockCategory = "schlaf" | "bewegung" | "sozial" | "achtsamkeit" | "alltag";

export interface BuildingBlock {
  id: string;
  title: string;
  category: BlockCategory;
  minutes: string;
  frequency: string;
  targetState: NervousStateId | "both";
  description: string;
  effect: string;
}

export const blockCategoryLabels: Record<BlockCategory, string> = {
  schlaf: "Schlaf & Erholung",
  bewegung: "Bewegung & Körper",
  sozial: "Soziale Co-Regulation",
  achtsamkeit: "Achtsamkeit & Innenwelt",
  alltag: "Alltag & Struktur",
};

export const buildingBlocks: BuildingBlock[] = [
  {
    id: "schlaf-ritual",
    title: "Festes Abendritual",
    category: "schlaf",
    minutes: "20–30 Min.",
    frequency: "täglich",
    targetState: "ventral",
    description:
      "Gleiche Uhrzeit, gedämpftes Licht, Bildschirme früh weg, danach warm duschen und den Körper herunterfahren.",
    effect: "Wiederholung signalisiert dem Nervensystem zuverlässig: Der Tag ist zu Ende, wir sind sicher.",
  },
  {
    id: "schlaf-bett",
    title: "Bett nur zum Schlafen",
    category: "schlaf",
    minutes: "—",
    frequency: "täglich",
    targetState: "ventral",
    description:
      "Wachen auf, Grübeln und Warten gehören raus aus dem Bett: nach ~20 Minuten aufstehen, gedämpftes Licht, etwas Ruhiges tun, zurückkehren.",
    effect: "Das Bett wird wieder mit Schlaf statt mit Alarm verknüpft (Stimuluskontrolle).",
  },
  {
    id: "bewegung-gehen",
    title: "Täglicher Spaziergang",
    category: "bewegung",
    minutes: "20–45 Min.",
    frequency: "täglich",
    targetState: "both",
    description:
      "Gehen im ruhigen Tempo, möglichst draußen. Kein Leistungsziel – es zählt die rhythmische, gleichförmige Bewegung.",
    effect: "Rhythmische Bewegung drosselt den Sympathikus und entlädt Stresschemie – die Basis jeder Regulation.",
  },
  {
    id: "bewegung-kraft",
    title: "Sanfte Kraft & Dehnung",
    category: "bewegung",
    minutes: "15–30 Min.",
    frequency: "2–3× pro Woche",
    targetState: "sympathikus",
    description:
      "Leichte Kraftübungen, Dehnen oder traumasensitives Yoga: der Körper spürt Grenzen und Kraft – Wahl bleibt immer bei Ihnen.",
    effect: "Rückeroberung des Körpers: Grenzen spüren statt sie ertragen zu müssen (Embodiment).",
  },
  {
    id: "sozial-kontakt",
    title: "Ein fester sicherer Kontakt",
    category: "sozial",
    minutes: "flexibel",
    frequency: "wöchentlich",
    targetState: "ventral",
    description:
      "Eine Person, bei der Sie sich sicher fühlen, bewusst einplanen: anrufen, treffen, gemeinsam etwas tun.",
    effect: "Co-Regulation ist das stärkste Regulationssystem des Menschen – mehr als jede Solo-Technik.",
  },
  {
    id: "sozial-notfallplan",
    title: "Notfallplan mit Menschen",
    category: "sozial",
    minutes: "30 Min. einmalig",
    frequency: "nach Bedarf",
    targetState: "both",
    description:
      "Mit 1–2 Vertrauten klären: Was mache ich in einer Krise? Wer darf ich anrufen, was sage ich, was brauche ich dann?",
    effect: "Macht aus „ich bin allein damit“ einen konkreten, übbaren Plan – Sicherheit durch Verbindlichkeit.",
  },
  {
    id: "achtsamkeit-atem",
    title: "Kurze Atem-Anker",
    category: "achtsamkeit",
    minutes: "3–5 Min.",
    frequency: "1–2× täglich",
    targetState: "both",
    description:
      "Mehrmals am Tag kurz innehhalten: 3 langsame Ausatmungen, kurz den Körper scannen. Nicht „meditieren müssen“, nur ankommen.",
    effect: "Mikro-Dosen der Präsenz trainieren das Nervensystem, zwischen Erregung und Ruhe hin- und herzuwechseln.",
  },
  {
    id: "achtsamkeit-tagebuch",
    title: "3-Zeilen-Abendjournal",
    category: "achtsamkeit",
    minutes: "5 Min.",
    frequency: "täglich",
    targetState: "ventral",
    description:
      "Abends drei Zeilen: Was hat heute gestresst? Was hat getragen? Was gebe ich an morgen weiter?",
    effect: "Externalisiert Grübeln und schafft Übersicht – der Kopf darf nach dem Schreiben „Feierabend“ machen.",
  },
  {
    id: "alltag-struktur",
    title: "Fester Tagesrhythmus",
    category: "alltag",
    minutes: "—",
    frequency: "täglich",
    targetState: "ventral",
    description:
      "Feste Anker im Tag: Aufstehzeit, eine Mahlzeit, eine kleine Aufgabe, eine Ruhepause – gleichbleibend, auch an schlechten Tagen.",
    effect: "Vorhersehbarkeit ist für ein traumatisiertes Nervensystem Nahrung: Es lernt, dass es sich orientieren kann.",
  },
  {
    id: "alltag-pausen",
    title: "Regelmäßige Dehnungs-Pausen",
    category: "alltag",
    minutes: "2 Min.",
    frequency: "3–4× pro Tag",
    targetState: "both",
    description:
      "Kurze Pausen mit bewusstem Ausatmen, Gähnen, Recken und Wahrnehmen des Raums – eingebaut zwischen Aufgaben.",
    effect: "Hält das Toleranzfenster tagsüber offen, bevor Überlastung entsteht – Prävention statt Feuerwehr.",
  },
];

// ── Wechselwirkungs-Regeln ───────────────────────────────────
// Prüfen das gespeicherte Programm und erzeugen Empfehlungen.
export interface SynergyRule {
  id: string;
  when: (prog: string[]) => boolean;
  kind: "synergy" | "order" | "dose" | "caution";
  title: string;
  reason: string;
  related: string[]; // ids von Bausteinen/Übungen
}

const has = (prog: string[], ...ids: string[]) => ids.some((i) => prog.includes(i));

export const synergyRules: SynergyRule[] = [
  {
    id: "stab-vor-konfrontation",
    when: (p) => p.includes("sicherer-ort") && has(p, "tfcbt", "emdr", "irrt", "krst", "brainspotting"),
    kind: "order",
    title: "Stabilisierung vor Konfrontation",
    reason:
      "Sie haben einen sicheren Ort aufgebaut UND ein Konfrontationsverfahren eingeplant. Genau das ist die richtige Reihenfolge der Phasenarbeit: Ressource zuerst verankern, dann dosiert an das Trauma. Planen Sie das Konfrontationsverfahren erst, wenn der sichere Ort jederzeit abrufbar ist.",
    related: ["sicherer-ort", "tfcbt", "emdr"],
  },
  {
    id: "koerper-plus-kognitiv",
    when: (p) =>
      has(p, "koerperscan", "voo", "pendeln", "schuetteln", "tre", "tsyoga") &&
      has(p, "tfcbt", "kvt", "irrt", "net", "schematherapie"),
    kind: "synergy",
    title: "Körper + Verstand ergänzen sich",
    reason:
      "Kombinieren Sie körperliche Regulation mit kognitiven Verfahren: Die kognitive Ebene ordnet das Geschehen, die körperliche Ebene entlädt, was im Gewebe gespeichert ist. Beide zusammen wirken nachhaltiger als jede einzelne.",
    related: ["koerperscan", "voo", "tfcbt", "irrt"],
  },
  {
    id: "hyper-sos",
    when: (p) => has(p, "sos-54321", "sos-ausatmen", "voo", "selbstberuehrung") && has(p, "abend", "schlaf-ritual"),
    kind: "synergy",
    title: "SOS-Werkzeuge + Abendritual",
    reason:
      "Schnelle Hilfen wirken vor allem tagsüber bei akutem Alarm; das Abendritual senkt die Grundspannung über Nacht. Beides zusammen behandelt sowohl die Spitzen als auch die Grundlast – ein vollständiges Regulationssystem.",
    related: ["sos-54321", "abend", "schlaf-ritual"],
  },
  {
    id: "hypo-sos",
    when: (p) => has(p, "aktivieren", "orientieren") && has(p, "pendeln", "koerperscan"),
    kind: "synergy",
    title: "Aktivierung + dosiertes Hinschauen",
    reason:
      "Bei Erstarrung (Hypoarousal) zuerst aktivieren, dann erst dosiert an die belastende Empfindung herantasten. Die Kombination aus Aktivierungs-SOS und Pendeln übt genau den Wechsel, den das Toleranzfenster braucht.",
    related: ["aktivieren", "pendeln"],
  },
  {
    id: "co-reg-verstaerker",
    when: (p) => has(p, "co-regulation", "sozial-kontakt", "sozial-notfallplan"),
    kind: "synergy",
    title: "Co-Regulation verstärkt alles Weitere",
    reason:
      "Ein ruhiges, warmes Gegenüber reguliert das eigene Nervensystem automatisch mit – stärker als jede Solo-Übung. Bausteine mit sozialem Kontakt wirken als Verstärker für alle anderen Elemente des Programms.",
    related: ["co-regulation", "sozial-kontakt"],
  },
  {
    id: "dose-confrontation",
    when: (p) => has(p, "tfcbt", "emdr", "net", "irrt", "krst", "brainspotting", "dbr") && !has(p, "pendeln", "sicherer-ort", "sos-54321"),
    kind: "dose",
    title: "Dosierung fehlt",
    reason:
      "Ihr Programm enthält ein Konfrontationsverfahren, aber noch kein Werkzeug für Dosierung und Rückzug (z. B. Pendeln, sicherer Ort). Fügen Sie ein Regulationselement hinzu – Kontrolle und Abbruchmöglichkeit sind der Kern traumasensibler Verarbeitung.",
    related: ["pendeln", "sicherer-ort"],
  },
  {
    id: "caution-schuetteln",
    when: (p) => has(p, "schuetteln", "tre") && has(p, "tfcbt", "emdr", "irrt", "net", "krst"),
    kind: "caution",
    title: "Entladung und Konfrontation dosieren",
    reason:
      "Körperliche Entladung (Abschütteln/TRE) und Konfrontationsverfahren wirken beide tief – nicht alles an einem Tag. Wechseln Sie sie ab und lassen Sie jeweils Verarbeitungszeit. Bei Komplextrauma lieber mit Fachkraft üben.",
    related: ["schuetteln", "tfcbt"],
  },
  {
    id: "ruhetag",
    when: (p) => p.length >= 6,
    kind: "dose",
    title: "Mehr ist nicht besser",
    reason:
      "Ihr Programm ist schon umfangreich. Ein Nervensystem, das aus der Überwältigung kommt, profitiert mehr von wenigen, zuverlässigen Ritualen als von vielen Pflichten. Prüfen Sie: Was davon fühlt sich wirklich stützend an? Was darf weg?",
    related: [],
  },
];

// ── Blinde Flecken ───────────────────────────────────────────
export interface BlindSpot {
  id: string;
  check: (prog: string[], hasTraumaMethod: boolean) => boolean;
  severity: "hinweis" | "wichtig" | "dringend";
  title: string;
  body: string;
  nextStep: string;
  resourceLink?: string; // Anker im Wegweiser
}

export const blindSpots: BlindSpot[] = [
  {
    id: "soziale-ebene",
    check: (p) => !has(p, "co-regulation", "sozial-kontakt", "sozial-notfallplan"),
    severity: "wichtig",
    title: "Die soziale Ebene fehlt",
    body:
      "Ihr Programm arbeitet bisher allein. Das ist verständlich – doch das menschliche Nervensystem reguliert sich vor allem in sicheren Beziehungen. Reine Solo-Übungen können Co-Regulation nicht ersetzen, nur ergänzen.",
    nextStep: "Überlegen Sie, wer in Ihrem Umfeld auch nur annähernd sicher anfühlt – und planen Sie einen kleinen, konkreten Kontakt (siehe Baustein „Ein fester sicherer Kontakt“).",
  },
  {
    id: "schlaf-ebene",
    check: (p) => !has(p, "abend", "schlaf-ritual", "schlaf-bett"),
    severity: "wichtig",
    title: "Schlaf & Erholung fehlen",
    body:
      "Ohne Schlaf bleibt jede Regulation Stückwerk: Ein übermüdetes Nervensystem hat ein deutlich engeres Toleranzfenster. Schlafprobleme gehören zu den häufigsten Traumafolgen – und sind zugleich der griffigste Hebel.",
    nextStep: "Beginnen Sie mit einem einzigen Element: fester Aufstehzeit ODER das Abendritual. Kleiner starten, als Sie denken.",
  },
  {
    id: "bewegung-ebene",
    check: (p) => !has(p, "bewegung-gehen", "bewegung-kraft", "schuetteln", "tre", "tsyoga", "alltag-pausen"),
    severity: "hinweis",
    title: "Bewegung kommt nicht vor",
    body:
      "Trauma wird nicht nur im Kopf gespeichert, sondern im Gewebe. Rhythmische, selbstbestimmte Bewegung ist einer der direktesten Wege, das Nervensystem zu regulieren – und braucht kein Fitnessziel.",
    nextStep: "Ein 15-minütiger Spaziergang zählt voll. Es geht um Rhythmus, nicht um Leistung.",
  },
  {
    id: "professionelle-begleitung",
    check: (_p, hasTraumaMethod) => hasTraumaMethod,
    severity: "dringend",
    title: "Verarbeitung ohne professionelle Begleitung geplant",
    body:
      "In Ihrem Programm steht ein Verarbeitungsverfahren (Konfrontation). Das ist mutig – und gehört in Begleitung einer ausgebildeten Fachkraft. Selbstanwendung von Konfrontation kann die Symptome verschlimmern statt lindern.",
    nextStep: "Suchen Sie über den Wegweiser eine/einen Psychotraumatherapeut:in (DeGPT-Verzeichnis) oder eine Spezialambulanz – der Weg über die 116117-Terminservicestelle ist der schnellste.",
    resourceLink: "wegweiser",
  },
  {
    id: "stabilisierung-zu-kurz",
    check: (p) => has(p, "tfcbt", "emdr", "net", "irrt", "krst", "brainspotting") && !has(p, "sicherer-ort", "pendeln", "sos-54321", "koerperscan"),
    severity: "dringend",
    title: "Mögliche Überforderung: Konfrontation ohne Stabilisierung",
    body:
      "Ihr Programm springt zur Verarbeitung, bevor Regulation und Ressourcen aufgebaut sind. Das ist die häufigste Ursache dafür, dass Traumatherapie abbricht oder verschlimmert – nicht Ihr Trauma ist das Problem, sondern die Reihenfolge.",
    nextStep: "Verschieben Sie Verarbeitungselemente in eine spätere Phase und bauen Sie zuerst 2–3 Stabilisierungsbausteine auf (siehe Phase 1).",
  },
  {
    id: "angehoerigenarbeit",
    check: () => false, // wird im Verlauf ggf. parametrisiert; Default: nicht sichtbar
    severity: "hinweis",
    title: "Angehörige bleiben außen vor",
    body:
      "Wenn Menschen in Ihrem Umfeld von Ihrer Geschichte betroffen sind (Partner:innen, Familie), hat auch das Auswirkungen auf sie – und ihr Verständnis auf Sie.",
    nextStep: "Der Wegweiser listet Angehörigen-Angebote (AGUS e. V.) und neutraler Beratung (UPD).",
    resourceLink: "wegweiser",
  },
];

// ── Selbsthilfe-Grenzen ──────────────────────────────────────
export const selfHelpLimits: BlindSpot = {
  id: "selbsthilfe-grenze",
  check: () => true,
  severity: "dringend",
  title: "Wann Selbsthilfe nicht mehr reicht",
  body:
    "Dieser Atlas kann orientieren, regulieren und begleiten – er kann aber keine Therapie ersetzen. Suchen Sie professionelle Unterstützung, wenn: Symptome länger als einige Wochen anhalten oder stärker werden, Alltag, Arbeit oder Beziehungen deutlich leiden, Dissoziation oder Erstarrung häufiger vorkommen, Suizidgedanken auftreten – oder Sie einfach spüren, dass Sie mehr brauchen, als ein Atlas geben kann.",
  nextStep: "Akut: Telefonseelsorge 0800 111 0 111 (rund um die Uhr, kostenfrei) oder 112. Zur Therapiesuche: Wegweiser-Tab oben – die 116117-Terminservicestelle findet ein Erstgespräch innerhalb von 4 Wochen.",
  resourceLink: "wegweiser",
};
