// Methoden-Lexikon der Traumatherapie

export type MethodFocus = "kognitiv" | "koerper" | "imaginativ" | "beziehung" | "systemisch" | "selbsthilfe";

export const focusLabels: Record<MethodFocus, string> = {
  kognitiv: "Kognitiv / Verhalten",
  koerper: "Körperbasiert",
  imaginativ: "Imaginativ",
  beziehung: "Beziehungsorientiert",
  systemisch: "Systemisch",
  selbsthilfe: "Selbsthilfe-geeignet",
};

export interface Method {
  id: string;
  name: string;
  year: number;
  founder: string;
  focus: MethodFocus[];
  focusShort: string;
  what: string;           // Was ist das?
  how: string;            // Wie arbeitet sie?
  forWhom: string;        // Für wen / was?
  phases: ("stabilisierung" | "konfrontation" | "integration")[];
  evidenz: string;        // wissenschaftliche Einordnung
  where: string;          // Wo wird sie in Deutschland angeboten / Ausbildung
}

export const methods: Method[] = [
  {
    id: "emdr", name: "EMDR", year: 1987, founder: "Francine Shapiro",
    focus: ["kognitiv"], focusShort: "Bilaterale Stimulation",
    what: "Eye Movement Desensitization and Reprocessing: Der/die Therapeut*in führt während der Erinnerung an das Trauma rhythmische Augenbewegungen (oder alternative Reize wie Klopfen/Töne) herbei.",
    how: "In Phasen: Zuerst Ressourcen und einen 'sicheren Ort' aufbauen, dann das belastende Bild mit Kognition und Körperempfindung gleichzeitig halten und mit bilateraler Stimulation abarbeiten, bis die Erregung sinkt und positive Kognitionen Platz greifen.",
    forWhom: "PTBS und andere Traumafolgestörungen, oft auch Ängste, Phobien, depressive Belastungen. Auch ohne viele Worte nutzbar.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Leitlinien-Verfahren der ersten Wahl bei PTBS (S3-Leitlinie), sehr gut evaluiert.",
    where: "Angeboten von approbierten Psychotherapeut*innen mit Zusatzqualifikation. Fachverband: EMDRIA Deutschland (emdria.de) mit Therapeut*innensuche.",
  },
  {
    id: "tfcbt", name: "Traumafokussierte KVT / Exposition", year: 1985, founder: "Edna Foa u. a.",
    focus: ["kognitiv"], focusShort: "Dosierter Wiederholungseffekt",
    what: "Verhaltenstherapeutische Konfrontation: Die traumatische Erinnerung wird schrittweise, in Sicherheit und mit Kontrolle durchlebt – in vivo, in sensu (Vorstellung) oder schriftlich, bis die Erregung von selbst sinkt.",
    how: "Stabilisierung, dann gemeinsamer Aufbau einer Hierarchie belastender Situationen, dann wiederholte, dosierte Konfrontation. Kognitive Umstrukturierung begleitet das Verfahren.",
    forWhom: "Klassische (einmalige) PTBS, Angst- und Vermeidungsstörungen. Geeignet, wenn gute Sprachfähigkeit und Stabilität vorhanden sind.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Leitlinien-Verfahren der ersten Wahl bei PTBS; eines der am besten untersuchten Verfahren überhaupt.",
    where: "Kernbestandteil jeder KVT-Ausbildung – in allen kassenärztlichen Psychotherapeutensuchen über 'Verhaltenstherapie' filterbar.",
  },
  {
    id: "net", name: "Narrative Expositionstherapie (NET)", year: 2002, founder: "Neuner, Schauer, Elbert",
    focus: ["kognitiv"], focusShort: "Lebenslinie erzählen",
    what: "Das Leben wird als durchgehende 'Liniengeschichte' erzählt und bildhaft festgehalten; das Trauma wird als Kapitel darin erzählt, bezeugt und eingeordnet.",
    how: "Über 3–4 Sitzungen: Symbole aller wichtigen Lebensstationen werden auf einem Band gelegt, das Trauma wird im Gespräch im gleichen Stil und Tempo wie das Leben erzählt – mit dem Erleben, nicht nur den Fakten.",
    forWhom: "Besonders entwickelt für Menschen mit mehrfachen/chronischen Traumata, Flucht, Krieg, Folter; auch für komplexe Biografien. Stark im Kontext von Geflüchteten (STAR-Programm).",
    phases: ["konfrontation", "integration"],
    evidenz: "Gut evaluiert, international etabliert (v. a. in humanitären Kontexten).",
    where: "Über die DeGPT-Therapeutensuche sowie Spezialambulanzen und Beratungsstellen für Geflüchtete.",
  },
  {
    id: "se", name: "Somatic Experiencing (SE)", year: 1979, founder: "Peter Levine",
    focus: ["koerper"], focusShort: "Überlebensenergie entladen",
    what: "Körperorientierte Methode: Trauma versteht SE als im Körper 'hängen gebliebene' unvollendete Überlebensreaktion (Flucht- oder Kampfimpuls, der nie vollendet wurde).",
    how: "Sanftes 'Tracking' körperlicher Empfindungen, 'Pendeln' zwischen Belastung und Ressource, 'Titration' (winzige Dosen), bis der Körper die eingefrorene Reaktion nachholen und entladen kann (z. B. durch Zittern, Erwärmen, Atem).",
    forWhom: "PTBS und KPTBS, Entwicklungstrauma, chronische Schmerzen, Ängste; auch dort, wo keine klare Erinnerung existiert – der Körper erinnert sich.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Zunehmend gut belegt; international breit etabliert. In Deutschland noch selten Kassenleistung.",
    where: "Ausbildung über Somatic Experiencing Deutschland. Suchen über se-training.de bzw. DeGPT-Verzeichnis.",
  },
  {
    id: "sp", name: "Sensomotorische Psychotherapie (SP)", year: 1981, founder: "Pat Ogden",
    focus: ["koerper"], focusShort: "Bewegung vervollständigen",
    what: "Verbindet Körperarbeit mit kognitiven und bindungsorientierten Elementen. Fünf natürliche Bewegungsreaktionen – Orientieren, Verteidigen, Rückzug, Annäherung, soziales Engagement – werden gezielt wahrgenommen und vervollständigt.",
    how: "Der/die Therapeut*in achtet auf körperliche Mikroreaktionen (Muskeltonus, Atem, Haltung) und lädt ein, diese bewusst auszuführen und zu beenden, was das Nervensystem damals nicht konnte.",
    forWhom: "Trauma- und Bindungsfolgen, Dissoziation, komplexe Traumatisierung; sehr trauma-sensibel aufgebaut.",
    phases: ["stabilisierung", "konfrontation"],
    evidenz: "Klinisch gut etabliert; wachsende Evidenzbasis.",
    where: "Ausbildungen u. a. über das Sensorimotor Psychotherapy Institute (US) mit deutschsprachigen Angeboten; Anbieter über DeGPT.",
  },
  {
    id: "narm", name: "NARM (Neuroaffektives Beziehungsmodell)", year: 2002, founder: "Laurence Heller",
    focus: ["beziehung", "koerper"], focusShort: "Verbindung statt Wiederholung",
    what: "Entwickelt für Entwicklungstrauma: Nicht die Geschichte wird wiederholt, sondern die unterbrochene Entwicklung von fünf Ressourcen – Kontakt, Bedürfnisse, Vertrauen, Autonomie, Liebe/Sexualität – wird im Hier und Jetzt vollendet.",
    how: "Arbeit mit Überlebensstrategien und Scham/Identität im gegenwärtigen Kontakt zur Therapeutin/zum Therapeuten. Somatic bottom-up trifft beziehungsorientiertes top-down.",
    forWhom: "Komplextrauma, Bindungstrauma, Störungen des Selbsterlebens und der Beziehungsfähigkeit.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Klinisch etabliert, klinische Studien vorhanden; breitere Evidenz entsteht.",
    where: "Ausbildung über NARM Deutschland (narm.de); Therapeut*innensuche dort.",
  },
  {
    id: "pitt", name: "PITT (Reddemann)", year: 1997, founder: "Luise Reddemann",
    focus: ["imaginativ"], focusShort: "Heilsame Imaginationen",
    what: "Psychodynamisch-Imaginative Traumatherapie: Mit geführten Bildern ('Innerer sicherer Ort', 'Regenbogen', 'Reise ins Gelobte Land') wird Stabilisierung, Verarbeitung und Neubewertung erreicht.",
    how: "Strukturierte Imaginationen im Halbschlaf-ähnlichen Zustand; symbolische Ressourcenfiguren werden aufgebaut, später wird die traumatische Szene mit diesen Verbündeten neu durchschritten.",
    forWhom: "Komplexe und frühkindliche Traumatisierung, wenn direkte Konfrontation zu überwältigend ist; sehr gute Stabilisierungswerkzeuge.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Klinisch breit etabliert; deutschsprachiger Standard, international bekannt.",
    where: "Wird von vielen tiefenpsychologisch Ausgebildeten eingesetzt; Bücher von Reddemann sind Selbsthilfe-geeignet.",
  },
  {
    id: "irrt", name: "Imagery Rescripting (IRRT)", year: 1999, founder: "Smucker; Arntz",
    focus: ["imaginativ", "kognitiv"], focusShort: "Bilder verändern",
    what: "Belastende inneren Bilder werden nicht nur betrachtet, sondern aktiv verändert: Das traumatisierte Selbst im Bild bekommt Schutz, Hilfe und Macht zurück.",
    how: "Ablauf in drei Phasen pro Sitzung: Bild anrufen → gegenwärtiges, erwachsenes Selbst tritt in das Bild ein und verändert es → neue Bedeutung festigen. Sehr effizient.",
    forWhom: "PTBS (auch frühkindlich), wiederkehrende Albträume, Scham- und Schuldgefühle, Ängste.",
    phases: ["konfrontation", "integration"],
    evidenz: "Gut evaluiert, auch bei PTBS aus früher Kindheit wirksam.",
    where: "Element vieler KVT- und traumaambulanter Angebote; Fortbildungen über DeGPT.",
  },
  {
    id: "brainspotting", name: "Brainspotting", year: 2003, founder: "David Grand",
    focus: ["koerper", "kognitiv"], focusShort: "Blickpunkt als Zugang",
    what: "Aus EMDR entwickelt: Ein bestimmter Blickpunkt im Sehfeld ('Brainspot') korrespondiert mit dem Ort, wo unverarbeitetes Erleben im subcortikalen Gehirn sitzt. Dort wird es 'aufgehalten'.",
    how: "Der/die Therapeut*in findet den Blickpunkt (mit Biopointer oder Finger) und begleitet das 'Prozessieren', das der Klient*in im Körper spürt – meist mit wenig Reden.",
    forWhom: "PTBS, KPTBS, Leistungsblockaden, chronische Schmerzen; gut bei viel Körpersymptomatik.",
    phases: ["konfrontation", "integration"],
    evidenz: "Klinisch breit etabliert; kontrollierte Studien wachsen.",
    where: "Ausbildung über Brainspotting Deutschland; Anbietersuche dort.",
  },
  {
    id: "dbr", name: "Deep Brain Reorienting (DBR)", year: 2016, founder: "Frank Corrigan",
    focus: ["koerper"], focusShort: "Hirnstamm-Sequenz",
    what: "Sehr sanftes, präzises Verfahren: Die Muskelspannung, die im Moment des Schocks im Gesicht/Nacken entstand, wird Schicht für Schicht gefühlt und abgebaut, bevor Emotionen überhaupt hochkommen.",
    how: "Fokus auf die erste Orientierungs- und Schockreaktion, dann langsame, sequentielle Entladung über Aufmerksamkeit und leichte Berührung. Minimal an überwältigend.",
    forWhom: "KPTBS, hohe Dissoziation, komplexe und frühkindliche Traumatisierung – besonders dort, wo alles sonst zu viel wird.",
    phases: ["stabilisierung", "konfrontation"],
    evidenz: "Junges, vielversprechendes Verfahren mit ersten klinischen Studien.",
    where: "Ausbildungen international; deutschsprachige Anbieter über DeGPT-Verzeichnis.",
  },
  {
    id: "egostate", name: "Ego-State-Therapie / IFS (Teilearbeit)", year: 1970, founder: "Watkins; R. Schwartz (IFS)",
    focus: ["beziehung", "imaginativ"], focusShort: "Mit den Teilen sprechen",
    what: "Die Persönlichkeit besteht aus 'Ich-Zuständen'/Teilen mit eigenen Gefühlen und Aufgaben (Schutzteile, verletzte Teile). Heilung heißt: Teile kennen, verstehen und ins Team holen – angeführt vom wissenden Selbst.",
    how: "Im Gespräch und in Imagination werden Teile begrüßt, deren Absicht erfragt und Vertrauen aufgebaut. Bei IFS wird 'unburdening' (Abladen alter Überzeugungen) vollzogen.",
    forWhom: "Komplextrauma, Dissoziation, dissoziative Identitätsstörung (DIS), innere Konflikte, Selbstkritik.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Klinisch sehr verbreitet; IFS erhält zunehmend Forschungsaufmerksamkeit (u. a. NIMH-Studie zu PTSD).",
    where: "Fortbildungen über DeGPT und IFS-Institute; Selbsthilfebücher (Schwartz) verbreitet.",
  },
  {
    id: "schematherapie", name: "Schematherapie", year: 1990, founder: "Jeffrey Young",
    focus: ["kognitiv", "beziehung"], focusShort: "Alte Muster durchbrechen",
    what: "Chronische, früh entstandene Muster (z. B. Verlassenheit, Minderwertigkeit, Verletzbarkeit) werden benannt, deren Ursprung verstanden und über begrenzte Reparentalisierung, Emotionsarbeit und Verhaltensexperimente verändert.",
    how: "Langfristige Therapie: Diagnostik der Schemata und Modi, dann Arbeit an Bedürfnisbefriedigung, die in der Kindheit ausblieb – kombiniert kognitive, emotionale und verhaltenstherapeutische Techniken.",
    forWhom: "KPTBS, Borderline- und andere Persönlichkeitsstörungen, chronische Depression, wiederkehrende Beziehungsmuster.",
    phases: ["stabilisierung", "konfrontation", "integration"],
    evidenz: "Gut evaluiert bei Persönlichkeitsstörungen; S3-Leitlinie Borderline empfiehlt sie.",
    where: "Angeboten von KVT-Ausgebildeten mit Zusatzqualifikation; Ausbildung über ISST-D.",
  },
  {
    id: "dbt", name: "Dialektisch-Behaviorale Therapie (DBT)", year: 1980, founder: "Marsha Linehan",
    focus: ["kognitiv", "beziehung"], focusShort: "Skills für den Alltag",
    what: "Kombiniert Veränderung (Verhaltenstherapie) mit Akzeptanz (Validation). Kern sind übertragbare Skills: Achtsamkeit, Stress tolerance, Emotionsregulation, zwischenmenschliche Effektivität.",
    how: "Einzeltherapie + Skillsgruppe + Telefoncoaching: In der Krise zuerst Skills (Notfallplan), langfristig Verhaltens- und Beziehungsmuster verändern.",
    forWhom: "Borderline-Persönlichkeitsstörung, selbstverletzendes Verhalten, starke Affektdysregulation – und als Stabilisierungsphase in jeder Traumatherapie.",
    phases: ["stabilisierung"],
    evidenz: "Beste Evidenz bei Borderline; Leitlinien-Verfahren.",
    where: "Spezialambulanzen, Kliniken und zunehmend niedergelassene Praxen mit DBT-Ausbildung.",
  },
  {
    id: "tre", name: "TRE® (Tension & Trauma Releasing Exercises)", year: 2005, founder: "David Bercelli",
    focus: ["koerper", "selbsthilfe"], focusShort: "Neurogenes Zittern",
    what: "Eine Folge von sieben körperlichen Übungen, die das natürliche neurogene Zittern (REM-artige Entladung über die Rücken-/Beinmuskulatur) auslöst – der Mechanismus, mit dem Säugetiere Stress abarbeiten.",
    how: "Übungen zur sanften Ermüdung der Bein-/Beckenmuskulatur, dann liegend das Zittern aufkommen lassen, 10–20 Minuten beobachten, danach langsam ausklingen. Nach Einzelanleitung selbstständig zuhause anwendbar.",
    forWhom: "Stressabbau, Anspannung, Erschöpfung, als Begleitung zur Traumatherapie. Nicht allein für akute PTBS gedacht.",
    phases: ["stabilisierung"],
    evidenz: "Wachsende Studienlage zu TRE und neurogenem Zittern allgemein; als Selbsthilfemethode etabliert.",
    where: "Zertifizierte TRE-Übungsleiter*innen (tre-deutschland.de) führen in die Methode ein.",
  },
  {
    id: "tsyoga", name: "Traumasensitives Yoga", year: 2002, founder: "David Emerson / Bessel van der Kolk",
    focus: ["koerper"], focusShort: "Körper zurückerobern",
    what: "Yoga-Praxis speziell für traumatisierte Menschen: kein Anpassen an 'die richtige Haltung', keine Berührung durch Lehrkräfte, jederzeit darf man aufhören, abwenden, eigene Entscheidungen treffen.",
    how: "Praxis der Körperwahrnehmung, Atem und sanfte Formen; der Fokus liegt auf Wahl und Spüren statt Leistung – Überwindung der Körperentfremdung durch freiwillige Präsenz.",
    forWhom: "Komplextrauma, Körperentfremdung, Dissoziation, nach sexueller Gewalt; häufig als Gruppenangebot in Kliniken und Beratungsstellen.",
    phases: ["stabilisierung"],
    evidenz: "RCT am Trauma Center Boston zeigte Wirksamkeit bei PTBS; international etabliert.",
    where: "Kliniken, spezialisierte Yogastudios; Ausbildung über das Trauma Center (JRI) bzw. tctsy-international.",
  },
  {
    id: "krst", name: "KReST (Bildschirmtechnik)", year: 1995, founder: "Lutz Besser",
    focus: ["kognitiv", "imaginativ"], focusShort: "Distanzierte Konfrontation",
    what: "Körper-, Ressourcen- und Systemorientierte Traumakonfrontation: Die belastende Erinnerung wird wie ein Film auf einem inneren Bildschirm betrachtet – mit Pause-, Zoom- und Perspektivwechsel-Tasten.",
    how: "Der 'innere Bildschirm' erlaubt maximale Dosierung: Stoppen, vorspulen, aus der Vogelperspektive sehen, den Regisseur fragen. Ressourcen werden vorab verankert.",
    forWhom: "PTBS und KPTBS; besonders, wenn Konfrontation sonst zu intensiv ist.",
    phases: ["stabilisierung", "konfrontation"],
    evidenz: "Klinisch etabliert im deutschsprachigen Raum; Bestandteil vieler Ambulanzen.",
    where: "Fortbildungen über die KReST-Akademie; Anwendung u. a. in Spezialambulanzen.",
  },
  {
    id: "polyvagal", name: "Polyvagal-orientierte Arbeit", year: 1994, founder: "Stephen Porges",
    focus: ["koerper", "beziehung"], focusShort: "Das Fundament vieler Verfahren",
    what: "Keine eigenständige Therapie, sondern das theoretische Fundament: Das Nervensystem hat drei Ebenen (sozial-ventral, sympathisch-kämpferisch, dorsal-erstarrend) und entscheidet unbewusst (Neurozeption) über Sicherheit.",
    how: "Übertragen in Praxis: ventrale Regulation stärken (Stimme, Gesicht, Atem, Beziehung), Toleranzfenster erweitern, Co-Regulation nutzen. Viele Übungen des Atlas beruhen darauf.",
    forWhom: "Grundlage für Verstehen und Selbsthilfe bei jedem Trauma- und Stressbild.",
    phases: ["stabilisierung"],
    evidenz: "Einflussreichstes Rahmenmodell der modernen Traumaarbeit; einzelne Annahmen wissenschaftlich diskutiert, klinisch enorm produktiv.",
    where: "Fließt in fast alle Fortbildungen ein (DeGPT, SE, NARM etc.).",
  },
];

export const phasesLabels = {
  stabilisierung: "Phase 1 · Stabilisierung",
  konfrontation: "Phase 2 · Verarbeitung",
  integration: "Phase 3 · Integration",
} as const;
