// Symptomatlas: Kategorien, Symptome und die Logik dahinter
// Auswahl → Erregungslage (Hyper/Hypo), Verdachtsmuster, Zusammenhänge, Hilfen

export interface Symptom {
  id: string;
  label: string;
  hint?: string;
  arousal: "hyper" | "hypo" | "both";
  tags: ("ptbs" | "kptbs" | "koerper" | "beziehung" | "selbstbild")[];
}

export interface SymptomCategory {
  id: string;
  title: string;
  subtitle: string;
  symptoms: Symptom[];
}

export const symptomCategories: SymptomCategory[] = [
  {
    id: "intrusion",
    title: "Wiedererleben (Intrusionen)",
    subtitle: "Das Vergangene dringt in die Gegenwart – die typische PTBS-Trias",
    symptoms: [
      { id: "flashbacks", label: "Flashbacks", hint: "Fühle mich plötzlich wieder mitten im Geschehen", arousal: "hyper", tags: ["ptbs"] },
      { id: "albttraeume", label: "Wiederkehrende Albträume", arousal: "hyper", tags: ["ptbs"] },
      { id: "aufdringlich", label: "Quälend aufdringliche Erinnerungen", arousal: "hyper", tags: ["ptbs"] },
      { id: "trigger", label: "Starke körperliche/emotionale Reaktion auf Trigger", hint: "Herzrasen, Schweiß bei Erinnerungen, Gerüchen, Orten", arousal: "hyper", tags: ["ptbs", "koerper"] },
      { id: "gefuehlserinnerungen", label: "Gefühl- oder Körpererinnerungen ohne Bilder", hint: "Plötzliche Leere, Ekel, Zwang ohne erklärbaren Grund", arousal: "both", tags: ["kptbs", "koerper"] },
    ],
  },
  {
    id: "arousal",
    title: "Anhaltende Erregung / Nervensystem-Alarm",
    subtitle: "Der Körper bleibt in Alarmbereitschaft (Hyperarousal)",
    symptoms: [
      { id: "schreck", label: "Übermäßige Schreckhaftigkeit", arousal: "hyper", tags: ["ptbs", "koerper"] },
      { id: "schlaf", label: "Schlafstörungen, Ein-/Durchschlafprobleme", arousal: "hyper", tags: ["ptbs", "koerper"] },
      { id: "reizbar", label: "Reizbarkeit, Wutausbrüche, Anspannung", arousal: "hyper", tags: ["ptbs", "kptbs"] },
      { id: "konzentration", label: "Konzentrations- und Gedächtnisstörungen", arousal: "both", tags: ["ptbs", "kptbs"] },
      { id: "hypervigilanz", label: "Ständige Wachsamkeit, 'Etwas Schlimmes passiert gleich'", arousal: "hyper", tags: ["ptbs", "koerper"] },
      { id: "herzrasen", label: "Herzrasen, Atemnot, Enge in Brust/Hals ohne Befund", arousal: "hyper", tags: ["koerper"] },
    ],
  },
  {
    id: "vermeidung",
    title: "Vermeidung & Rückzug",
    subtitle: "Der Versuch, das Unverarbeitete fernzuhalten",
    symptoms: [
      { id: "vermeidung-orte", label: "Vermeide Orte, Situationen, Menschen, die erinnern", arousal: "hypo", tags: ["ptbs"] },
      { id: "gedankenverdrängung", label: "Verdränge das Geschehene, ertrage es nicht, daran zu denken", arousal: "hypo", tags: ["ptbs"] },
      { id: "gefuehlsabstumpfung", label: "Gefühle fühlen taub/fern, 'nichts fühlen'", arousal: "hypo", tags: ["ptbs", "kptbs"] },
      { id: "zurueckgezogen", label: "Ziehe mich zunehmend zurück, verliere Interessen", arousal: "hypo", tags: ["kptbs", "beziehung"] },
    ],
  },
  {
    id: "dissoziation",
    title: "Dissoziation & Erstarrung",
    subtitle: "Wenn das Nervensystem abschaltet (Hypoarousal)",
    symptoms: [
      { id: "neben-sich", label: "Gefühl, 'nebenselbst' zu stehen, weg zu sein", arousal: "hypo", tags: ["kptbs"] },
      { id: "erstarrung", label: "Erstarre in bestimmten Situationen, kann nicht reagieren", arousal: "hypo", tags: ["kptbs", "koerper"] },
      { id: "luecken", label: "Erinnerungslücken, weiße Flecken in der Biografie", arousal: "hypo", tags: ["kptbs"] },
      { id: "entrückt", label: "Welt fühlt sich unwirklich an, wie durch Glas", arousal: "hypo", tags: ["kptbs"] },
      { id: "erstarrt", label: "Spüre kaum meinen Körper, hänge wie gelähmt", arousal: "hypo", tags: ["kptbs", "koerper"] },
    ],
  },
  {
    id: "affekt",
    title: "Gefühle & Selbstbild",
    subtitle: "Zusatzbereiche der komplexen PTBS (ICD-11)",
    symptoms: [
      { id: "gefuehlsueberflutung", label: "Gefühle schwanken extrem, kann sie kaum steuern", arousal: "hyper", tags: ["kptbs"] },
      { id: "gefuehlstaubheit", label: "Emotionale Taubheit, kaum Freude möglich", arousal: "hypo", tags: ["kptbs", "selbstbild"] },
      { id: "scham", label: "Tiefe Scham-/Schuldgefühle, 'Ich bin kaputt/wertlos'", arousal: "both", tags: ["kptbs", "selbstbild"] },
      { id: "selbstschaden", label: "Selbstschädigendes oder riskantes Verhalten", arousal: "hyper", tags: ["kptbs"] },
      { id: "leere", label: "Anhaltende innere Leere, Hoffnungslosigkeit", arousal: "hypo", tags: ["kptbs", "selbstbild"] },
    ],
  },
  {
    id: "beziehung",
    title: "Beziehungen & Körper-Symptome",
    subtitle: "Wie Trauma Beziehungen und den Körper verändert",
    symptoms: [
      { id: "misstrauen", label: "Vertraue anderen kaum, bleibe auf Distanz", arousal: "both", tags: ["kptbs", "beziehung"] },
      { id: "naehe", label: "Nähe ist bedrohlich – ich ziehe mich weg oder klammere", arousal: "both", tags: ["kptbs", "beziehung"] },
      { id: "schmerzen", label: "Chronische Schmerzen ohne organischen Befund", arousal: "both", tags: ["koerper", "kptbs"] },
      { id: "magen", label: "Magen-Darm-Beschwerden, Übelkeit, nervöser Magen", arousal: "both", tags: ["koerper"] },
      { id: "haut", label: "Hautreaktionen, Juckreiz, Rötungen in Stresszeiten", arousal: "both", tags: ["koerper"] },
      { id: "panik", label: "Panikattacken", arousal: "hyper", tags: ["koerper", "ptbs"] },
    ],
  },
];

// Erklärungen, die der Navigator je nach Auswahl zeigt
export const explanations = {
  hyper: {
    title: "Ihr Nervensystem wirkt übererregt (Hyperarousal)",
    body: "Sympathikus und Alarmzentrum (Amygdala) sind daueraktiviert: Der Körper lebt in Kampf-oder-Flucht-Modus, obwohl die Gefahr vorbei ist. Das ist keine Schwäche, sondern eine überlebensnotwendige Reaktion, die nicht abgeschaltet wurde. Typisch: Schlafprobleme, Wut, Herzrasen, Schreckhaftigkeit, Intrusionen.",
  },
  hypo: {
    title: "Ihr Nervensystem wirkt untererregt (Hypoarousal)",
    body: "Der dorsale Vagus hat die 'Notbremse' gezogen: Erstarrung, Taubheit, Rückzug, Dissoziation. Das Nervensystem hat gelernt, dass Widerstand zwecklos war – und antwortet jetzt mit Abschalten statt Abwehr. Typisch: Gefühlsabstumpfung, Erinnerungslücken, innere Leere, 'weg sein'.",
  },
  both: {
    title: "Ihr Nervensystem pendelt zwischen beiden Zuständen",
    body: "Viele Betroffene schwanken oder fühlen beides gleichzeitig (z. B. Herzrasen und Erstarrung zugleich). Das kostet enorm Energie – vergleichbar mit Gas und Bremse gleichzeitig durchtreten – und führt oft in chronische Erschöpfung.",
  },
  ptbs: {
    title: "Muster, das an eine klassische PTBS erinnert",
    body: "Intrusionen, Vermeidung und anhaltende Bedrohungswahrnehmung nach einem (meist einmaligen) Ereignis. Gut behandelbar, vor allem mit traumafokussierter KVT und EMDR (Leitlinien-Verfahren).",
  },
  kptbs: {
    title: "Muster, das an ein Komplextrauma erinnert",
    body: "Die Auswahl deutet auf Folgen wiederholter oder lang anhaltender Traumatisierung hin (häufig in Kindheit/Abhängigkeitsbeziehungen). Hinzu kommen Affektdysregulation, negatives Selbstbild und Beziehungsstörungen – die Kernmerkmale der komplexen PTBS (ICD-11: 6B41, seit 2022 eigenständig anerkannt). Hier hilft vor allem eine phasenorientierte Traumatherapie mit verlässlicher therapeutischer Beziehung.",
  },
  koerper: {
    title: "Der Körper trägt die Geschichte mit",
    body: "Haut, Magen-Darm-Trakt, Brust, Kiefer, Muskulatur: Der Körper reagiert oft früher als der Kopf. Das vegetative Nervensystem 'merkt' sich Belastung (sog. Neurozeption). Körperorientierte Verfahren und Regulation sprechen genau diese Ebene an.",
  },
  beziehung: {
    title: "Trauma ist ein Beziehungserlebnis – Heilung auch",
    body: "Wer in Beziehungen verletzt wurde, braucht Erfahrungen von Sicherheit in Beziehung, um zu heilen (Co-Regulation). Bindungs- und beziehungsorientierte Verfahren (NARM, Schematherapie, sensomotorische Psychotherapie) setzen hier an.",
  },
  selbstbild: {
    title: "Das Selbstbild wurde verletzt",
    body: "Chronische Scham und das Gefühl, 'kaputt' zu sein, sind Kernsymptome komplexer Traumatisierung – keine Tatsachen über Sie. Sie sind die innere Übernahme dessen, was Ihnen angetan wurde, und veränderbar.",
  },
};

export const emergencyNote = {
  title: "Wichtig",
  lines: [
    "Dieser Atlas dient der Orientierung und ersetzt keine Diagnose oder Therapie.",
    "Bei akuter Krise: Telefonseelsorge 0800 111 0 111 / 0800 111 0 222 (kostenfrei, rund um die Uhr), Hilfetelefon 116 123 oder 112.",
    "Ein Verdachtsmuster ist kein Diagnose-Ersatz – nur Fachkräfte können das nach einem ausführlichen Gespräch beurteilen.",
  ],
};
