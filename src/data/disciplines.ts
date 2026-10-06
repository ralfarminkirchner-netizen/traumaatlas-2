// Historischer Stammbaum: Disziplinen, Schulen, Verfahren
// Positions: x = Jahr (1870–2010), y = vertikale Lage (0–100)

export interface DisciplineNode {
  id: string;
  name: string;
  year: number; // Entstehungsjahr
  founder?: string;
  group: "wurzel" | "schule" | "richtung" | "verfahren" | "theorie" | "koerper";
  summary: string;
  parents: string[]; // ids, aus denen es hervorging
  keyFigures?: string;
}

export const groups: Record<DisciplineNode["group"], { label: string; color: string; bg: string; border: string }> = {
  wurzel: { label: "Wurzeln", color: "#78716c", bg: "#f5f5f4", border: "#d6d3d1" },
  schule: { label: "Schulen / Paradigmen", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  richtung: { label: "Therapierichtungen", color: "#0e7490", bg: "#cffafe", border: "#67e8f9" },
  verfahren: { label: "Trauma-Verfahren", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  theorie: { label: "Theorien / Fundamente", color: "#6d28d9", bg: "#ede9fe", border: "#c4b5fd" },
  koerper: { label: "Körper-/Soma-Ansätze", color: "#047857", bg: "#d1fae5", border: "#6ee7b7" },
};

export const disciplines: DisciplineNode[] = [
  // ── Wurzeln ──────────────────────────────────────────────
  { id: "antike", name: "Antike Seelenlehre", year: -400, founder: "Platon, Stoa, Aristoteles", group: "wurzel",
    summary: "Griechische Philosophie prägt das Denken über Seele, Affekte und Gelassenheit – erste Systematik menschlichen Erlebens.",
    parents: [], keyFigures: "Platon, Aristoteles, Epikur, Stoa" },
  { id: "aufklaerung", name: "Empirismus & Aufklärung", year: 1700, founder: "Hume, Locke", group: "wurzel",
    summary: "Erkenntnis durch Beobachtung und Erfahrung – Grundlage jeder späteren empirischen Psychologie.",
    parents: ["antike"], keyFigures: "David Hume, John Locke" },
  { id: "wundt", name: "Experimentalpsychologie", year: 1879, founder: "Wilhelm Wundt", group: "schule",
    summary: "Wundt gründet das erste psychologische Institut Leipzig. Die Psychologie wird Wissenschaft. Ausgangspunkt aller Schulen.",
    parents: ["aufklaerung"], keyFigures: "Wilhelm Wundt, William James" },
  { id: "gestalt", name: "Gestaltpsychologie", year: 1912, founder: "Wertheimer, Köhler, Koffka", group: "schule",
    summary: "Das Ganze ist mehr als die Summe seiner Teile – Wahrnehmung wird als Ganzheit verstanden. Prägt später Gestalttherapie und Traumakonzepte.",
    parents: ["wundt"], keyFigures: "Max Wertheimer, Wolfgang Köhler" },
  { id: "hypnose", name: "Hypnose & Suggestion", year: 1880, founder: "Mesmer, Bernheim; Breuer & Freud", group: "richtung",
    summary: "Studienhysterie und magnetische Heilung: Breuers 'kathartisches Verfahren' mit Anna O. wird zur Keimzelle der Psychoanalyse – und der Idee, dass Körper und Seele zusammenhängen.",
    parents: ["aufklaerung"], keyFigures: "J.-M. Charcot, J. Breuer, H. Bernheim" },

  // ── Hauptströmungen ──────────────────────────────────────
  { id: "psychoanalyse", name: "Psychoanalyse", year: 1895, founder: "Sigmund Freud", group: "schule",
    summary: "Das Unbewusste prägt Erleben und Verhalten; frühe Kindheitserfahrungen und Abwehrmechanismen formen die Psyche. 'Hysterie leidet vor allem an Erinnerungen.'",
    parents: ["hypnose"], keyFigures: "Sigmund Freud" },
  { id: "adler", name: "Individualpsychologie", year: 1912, founder: "Alfred Adler", group: "schule",
    summary: "Gefühl von Minderwertigkeit, Lebensstil und Gemeinschaftsgefühl als Schlüssel der Persönlichkeit. Erste Tiefenpsychologie-Schulausgliederung.",
    parents: ["psychoanalyse"], keyFigures: "Alfred Adler" },
  { id: "jung", name: "Analytische Psychologie", year: 1913, founder: "C. G. Jung", group: "schule",
    summary: "Kollektives Unbewusstes, Archetypen, Individuation – Erweiterung der Psychoanalyse um symbolische und spirituelle Dimensionen.",
    parents: ["psychoanalyse"], keyFigures: "C. G. Jung" },
  { id: "neopsychoanalyse", name: "Neopsychoanalyse / Tiefenpsychologie", year: 1930, founder: "Horney, Fromm, Sullivan", group: "richtung",
    summary: "Kultur- und Beziehungsfokus statt Triebdeterminismus – Grundlage der heutigen tiefenpsychologisch fundierten Psychotherapie (TPP).",
    parents: ["psychoanalyse", "adler"], keyFigures: "Karen Horney, Erich Fromm, H. S. Sullivan" },
  { id: "behaviorismus", name: "Behaviorismus", year: 1913, founder: "Watson; Pawlow, Skinner", group: "schule",
    summary: "Nur beobachtbares Verhalten zählt: Lernen durch Konditionierung (klassisch, operant). Wird zur Gegenströmung der Introspektion und später Basis der Verhaltenstherapie.",
    parents: ["wundt"], keyFigures: "J. B. Watson, I. Pawlow, B. F. Skinner" },
  { id: "vt", name: "Verhaltenstherapie", year: 1950, founder: "Wolpe, Eysenck, Kanfer", group: "richtung",
    summary: "Umlernen statt Verstehen: Konditionierung kann umgekehrt werden (Konfrontation, Desensibilisierung). Erste wissenschaftlich evaluierte Therapieform in Deutschland.",
    parents: ["behaviorismus"], keyFigures: "J. Wolpe, H. Eysenck, F. Kanfer" },
  { id: "kvt", name: "Kognitive Verhaltenstherapie (KVT)", year: 1960, founder: "Beck, Ellis", group: "richtung",
    summary: "Gedanken, Gefühle und Verhalten wirken wechselseitig: Störende Deutungsmuster werden erkannt und umstrukturiert. Weltweit am weitesten verbreitetes Verfahren.",
    parents: ["vt", "gestalt"], keyFigures: "A. T. Beck, A. Ellis" },
  { id: "humanistisch", name: "Humanistische Psychologie", year: 1951, founder: "Maslow, Rogers", group: "schule",
    summary: "'Dritte Kraft': Der Mensch strebt nach Selbstverwirklichung. Wachstum statt Defizit – Grundlage personenzentrierter Beratung und vieler Körper- und Kreativtherapien.",
    parents: ["gestalt"], keyFigures: "A. Maslow, C. Rogers" },
  { id: "systemisch", name: "Systemische Therapie", year: 1955, founder: "Bateson, Satir, Minuchin", group: "richtung",
    summary: "Probleme entstehen und bestehen im System der Beziehungen (Familie, Paar, Organisation). Kommunikationsmuster und Grenzen werden verändert.",
    parents: ["humanistisch", "behaviorismus"], keyFigures: "G. Bateson, V. Satir, S. Minuchin" },
  { id: "erkson", name: "Hypnotherapie (Erickson)", year: 1955, founder: "Milton H. Erickson", group: "richtung",
    summary: "Nutzbare Ressourcen des Unbewussten aktivieren statt Symptome bekämpfen – prägt NLP, imaginative Verfahren und Teile der modernen Traumatherapie.",
    parents: ["hypnose", "humanistisch"], keyFigures: "Milton H. Erickson" },
  { id: "kognitivismus", name: "Kognitionswissenschaft", year: 1960, founder: "Miller, Neisser, Piaget", group: "schule",
    summary: "Der Mensch als Informationsverarbeitungssystem: Denken, Aufmerksamkeit, Gedächtnis als zentrale Gegenstände – Fundament der Neuropsychologie.",
    parents: ["wundt", "gestalt"], keyFigures: "U. Neisser, G. Miller, J. Piaget" },
  { id: "neuro", name: "Neurowissenschaften", year: 1980, founder: "LeDoux, Damasio, Schore", group: "theorie",
    summary: "Amygdala, limbisches System, HPA-Achse: Emotion und Trauma werden neurobiologisch greifbar. Brücke zwischen Körper und Psyche.",
    parents: ["kognitivismus"], keyFigures: "J. LeDoux, A. Damasio, A. Schore" },
  { id: "bindung", name: "Bindungstheorie", year: 1969, founder: "John Bowlby; Mary Ainsworth", group: "theorie",
    summary: "Bindung ist Überlebensprogramm: frühe Bindungserfahrungen prägen, wie Nervensystem und Beziehungen fürs Leben funktionieren.",
    parents: ["psychoanalyse", "ethologie"], keyFigures: "J. Bowlby, M. Ainsworth" },

  // ── Körperarbeit ─────────────────────────────────────────
  { id: "reich", name: "Körperpsychotherapie (Reich)", year: 1933, founder: "Wilhelm Reich", group: "koerper",
    summary: "Charakterpanzer und Muskelrüstung: Unterdrückte Emotionen werden im Körper festgehalten – Keimzelle fast aller körperorientierten Therapieformen.",
    parents: ["psychoanalyse"], keyFigures: "Wilhelm Reich" },
  { id: "bioenergetik", name: "Bioenergetische Analyse", year: 1956, founder: "Alexander Lowen", group: "koerper",
    summary: "Weiterführung von Reichs Arbeit: Atem, Bewegung und Grundhaltungen lösen körperliche Blockaden. Etabliert Körperarbeit als seriöses Feld.",
    parents: ["reich"], keyFigures: "Alexander Lowen" },
  { id: "hakomi", name: "Hakomi (Mindful Somatic)", year: 1980, founder: "Ron Kurtz", group: "koerper",
    summary: "Achtsame, sanfte Körperarbeit mit 'Experimenten' – Mutter der sensomotorischen Psychotherapie und Basis moderner somatischer Traumaarbeit.",
    parents: ["reich", "humanistisch"], keyFigures: "Ron Kurtz" },
  { id: "feldenkrais", name: "Feldenkrais / Somatic Education", year: 1949, founder: "Moshé Feldenkrais", group: "koerper",
    summary: "Durch feine, bewusste Bewegung lernt das Nervensystem neue Wege – Selbstwahrnehmung als Eintritt in Körper-Geist-Heilung.",
    parents: ["wundt"], keyFigures: "Moshé Feldenkrais" },

  // ── Trauma-Theorien ──────────────────────────────────────
  { id: "polyvagal", name: "Polyvagal-Theorie", year: 1994, founder: "Stephen Porges", group: "theorie",
    summary: "Drei Ebenen des autonomen Nervensystems (ventraler Vagus, Sympathikus, dorsaler Vagus) erklären Sicherheit, Abwehr und Schockstarre. Fundament moderner Traumatherapie.",
    parents: ["neuro"], keyFigures: "Stephen W. Porges" },
  { id: "ethologie", name: "Ethologie & Tierbeobachtung", year: 1960, founder: "Lorenz, Tinbergen", group: "theorie",
    summary: "Beobachtung, wie Tiere Schock und Gefahr im Körper abarbeiten ('Abschütteln') – direkter Impuls für Somatic Experiencing.",
    parents: ["wundt"], keyFigures: "K. Lorenz, N. Tinbergen" },
  { id: "dissoziationstheorie", name: "Strukturelle Dissoziation", year: 2006, founder: "van der Hart, Nijenhuis, Steele", group: "theorie",
    summary: "Traumafolgen als Auseinanderfallen der Persönlichkeit in 'Anscheinend Normalen Teil' und emotionalen Teilen – Grundlage der Ego-State- und Teilearbeit.",
    parents: ["neopsychoanalyse", "neuro"], keyFigures: "O. van der Hart, E. Nijenhuis" },
  { id: "herman", name: "Komplextrauma-Forschung", year: 1992, founder: "Judith Herman", group: "theorie",
    summary: "'Wiederholte Traumatisierung' (Krieg, häusliche Gewalt, Missbrauch) als eigenes Krankheitsbild – mündet in der ICD-11-Diagnose komplexe PTBS (6B41).",
    parents: ["neopsychoanalyse"], keyFigures: "Judith L. Herman" },

  // ── Trauma-Verfahren ─────────────────────────────────────
  { id: "emdr", name: "EMDR", year: 1987, founder: "Francine Shapiro", group: "verfahren",
    summary: "Eye Movement Desensitization and Reprocessing: Bilaterale Stimulation (Augenbewegungen) beschleunigt die Verarbeitung belastender Erinnerungen. Leitlinien-Verfahren bei PTBS.",
    parents: ["kvt", "erkson"], keyFigures: "Francine Shapiro" },
  { id: "tfcbt", name: "Traumafokussierte KVT / Exposition", year: 1985, founder: "Foa u. a.", group: "verfahren",
    summary: "Dosierter Wiederholungseffekt: Die Erinnerung wird in Sicherheit durchlebt, bis die Erregung sinkt. Kern der Leitlinien-Therapie der PTBS.",
    parents: ["kvt"], keyFigures: "E. Foa, J. Margraf" },
  { id: "net", name: "Narrative Exposition (NET)", year: 2002, founder: "Neuner, Schauer, Elbert", group: "verfahren",
    summary: "Biografisch-kognitives Verfahren, entwickelt für (Kriegs-)Flüchtlinge: Das Leben wird als Liniengeschichte erzählt, das Trauma bekommt seinen Platz. STAR-Programm.",
    parents: ["kvt"], keyFigures: "F. Neuner, M. Schauer, T. Elbert" },
  { id: "se", name: "Somatic Experiencing", year: 1979, founder: "Peter Levine", group: "verfahren",
    summary: "Trauma als unvollständige Überlebensreaktion im Körper: Titration, Pendeln und das Nachholen der unterbrochenen Fluchtreaktion entladen gebundene Stressenergie.",
    parents: ["ethologie", "bioenergetik", "polyvagal"], keyFigures: "Peter A. Levine" },
  { id: "sp", name: "Sensomotorische Psychotherapie", year: 1981, founder: "Pat Ogden", group: "verfahren",
    summary: "Körperliche Mikroreaktionen als Tor zum Trauma: Fünf Bewegungs-Grundmuster (Orientieren, Verteidigen, Rückzug...) werden gezielt vervollständigt. Bindungs- und traumasensibel.",
    parents: ["hakomi", "kvt"], keyFigures: "Pat Ogden" },
  { id: "narm", name: "NARM", year: 2002, founder: "Laurence Heller", group: "verfahren",
    summary: "Neuroaffektives Beziehungsmodell für Entwicklungstrauma: Fünf Ressourcen (Kontakt, Bedürfnisse, Vertrauen, Autonomie, Liebe) – Heilung durch Verbindung statt Wiederholung.",
    parents: ["se", "humanistisch", "bindung"], keyFigures: "Laurence Heller" },
  { id: "pitt", name: "PITT (Reddemann)", year: 1997, founder: "Luise Reddemann", group: "verfahren",
    summary: "Psychodynamisch-Imaginative Traumatherapie: Imaginationen ('Innerer sicherer Ort', 'Regenbogen', 'Reise') stabilisieren und verarbeiten bei komplexer Traumatisierung.",
    parents: ["neopsychoanalyse", "erkson"], keyFigures: "Luise Reddemann" },
  { id: "irrt", name: "Imagery Rescripting (IRRT)", year: 1999, founder: "M. Smucker; Arntz", group: "verfahren",
    summary: "Belastende innere Bilder werden aktiv verändert: Das traumatisierte Selbst im Bild bekommt Hilfe und Schutz – wirkt auch bei PTBS aus früher Kindheit.",
    parents: ["kvt", "erkson"], keyFigures: "Mervin Smucker, Arnoud Arntz" },
  { id: "brainspotting", name: "Brainspotting", year: 2003, founder: "David Grand", group: "verfahren",
    summary: "Aus EMDR entwickelt: Ein bestimmter Blickpunkt ('Brainspot') öffnet direkten Zugang zu unverarbeitetem Erleben im tiefen Gehirn (subcortical).",
    parents: ["emdr"], keyFigures: "David Grand" },
  { id: "dbr", name: "Deep Brain Reorienting", year: 2016, founder: "Frank Corrigan", group: "verfahren",
    summary: "Arbeitet die Schock- und Orientierungssequenz des Hirnstamms ab – sehr sanftes Verarbeiten, besonders bei hoher Dissoziation und KPTBS.",
    parents: ["polyvagal", "neuro"], keyFigures: "Frank Corrigan" },
  { id: "egostate", name: "Ego-State-Therapie / Teilearbeit", year: 1970, founder: "J. Watkins; R. Schwarz (IFS)", group: "verfahren",
    summary: "Mit inneren 'Teilen' arbeiten, die eigene Gefühle und Erinnerungen tragen – Integration statt Ausschluss. Enge Verwandte: Internal Family Systems (IFS).",
    parents: ["dissoziationstheorie", "erkson"], keyFigures: "John & Helen Watkins, Richard Schwartz" },
  { id: "schematherapie", name: "Schematherapie", year: 1990, founder: "Jeffrey Young", group: "verfahren",
    summary: "Frühe, stabile Muster ('Schemas') wie Verlassenheit oder Minderwertigkeit werden aufgespürt und über begrenzende Therapie verändert – wirksam bei KPTBS und Borderline.",
    parents: ["kvt", "neopsychoanalyse"], keyFigures: "Jeffrey Young" },
  { id: "dbt", name: "Dialektisch-Behaviorale Therapie (DBT)", year: 1980, founder: "Marsha Linehan", group: "verfahren",
    summary: "Skills für Emotionsregulation, Frustrationstoleranz und Achtsamkeit – Standard bei Borderline; zentrales Stabilisierungswerkzeug in der Traumatherapie.",
    parents: ["kvt", "humanistisch"], keyFigures: "Marsha M. Linehan" },
  { id: "tre", name: "TRE® (neurogenes Zittern)", year: 2005, founder: "David Bercelli", group: "koerper",
    summary: "Übungen zur Selbstauslösung des natürlichen Zitterns: Der Körper entlädt Reststress über die motorischen Einheiten. Selbsthilfemethode mit Übungsleitern.",
    parents: ["bioenergetik", "ethologie"], keyFigures: "David Bercelli" },
  { id: "tsyoga", name: "Traumasensitives Yoga", year: 2002, founder: "David Emerson / J. van der Kolk", group: "koerper",
    summary: "Yoga ohne Anpassung und ohne Berührung durch Lehrkräfte: Bewegung als Rückeroberung des eigenen Körpers – Teil des Boston-Trauma-Center-Programms.",
    parents: ["hakomi", "humanistisch"], keyFigures: "David Emerson, Bessel van der Kolk" },
  { id: "krst", name: "KReST (Bildschirmtechnik)", year: 1995, founder: "Lutz Besser", group: "verfahren",
    summary: "Körper-, Ressourcen- und Systemorientierte Traumakonfrontation: Dosierte, distanzierte Betrachtung der Erinnerung wie auf einem Bildschirm.",
    parents: ["kvt", "pitt"], keyFigures: "Lutz Besser" },
];

// Kanten: child → parents (verwendet für Linien)
export const disciplineEdges = disciplines.flatMap((d) =>
  d.parents.map((p) => ({ from: p, to: d.id }))
);
