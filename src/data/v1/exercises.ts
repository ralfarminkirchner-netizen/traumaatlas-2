// Übungsbibliothek: praktische, illustrierte Anleitungen
// effect: hyper = beruhigt Übererregung · hypo = aktiviert bei Untererregung · both = gleicht aus / allgemein

export type ExerciseEffect = "hyper" | "hypo" | "both";

export interface Exercise {
  id: string;
  title: string;
  effect: ExerciseEffect;
  effectLabel: string;
  minutes: string;
  context: "SOS" | "Alltag" | "Abend" | "Begleitung";
  when: string;       // Wann einsetzen
  goal: string;       // Was es im Nervensystem bewirkt
  steps: string[];    // Schritt-für-Schritt
  note?: string;
  caution?: string;
}

export const exercises: Exercise[] = [
  {
    id: "sos-54321",
    title: "5-4-3-2-1-Erdung (Grounding)",
    effect: "hyper",
    effectLabel: "Beruhigt Übererregung",
    minutes: "2–5 Min.",
    context: "SOS",
    when: "Bei Flashback, Panik, starkem Herzrasen – wenn das Hier und Jetzt verloren geht.",
    goal: "Lenkt die Aufmerksamkeit auf die Sinne der Gegenwart und signalisiert dem Nervensystem: Jetzt bin ich sicher.",
    steps: [
      "Setzen oder stellen Sie sich stabil hin. Spüren Sie Ihre Füße auf dem Boden.",
      "Nennen Sie laut (oder innerlich) 5 Dinge, die Sie SEHEN (Farben, Formen, Licht).",
      "4 Dinge, die Sie HÖREN (Verkehr, Uhr, Atem, Stimmen).",
      "3 Dinge, die Sie SPÜREN (Kleidung an der Haut, Griff der Stuhlkante, Temperatur).",
      "2 Dinge, die Sie RIECHEN (oder zwei Gerüche, die Ihnen gefallen).",
      "1 Ding, das Sie SCHMECKEN – oder einen Schluck Wasser bewusst trinken.",
      "Atmen Sie danach drei Mal lang aus und nennen Sie: Ort, Datum, Ihr Alter.",
    ],
    note: "Bei Flashbacks zusätzlich hilfreich: laut umsehen und benennen ('Das war damals, das ist jetzt'), kaltes Wasser über Hände, aufstehen und gehen.",
  },
  {
    id: "sos-ausatmen",
    title: "Physiologischer Seufzer (Doppel-Einatmen, lang Ausatmen)",
    effect: "hyper",
    effectLabel: "Beruhigt Übererregung",
    minutes: "1–3 Min.",
    context: "SOS",
    when: "Schnelle Hilfe bei akuter Anspannung, Wut, Herzrasen – auch mitten im Gespräch unauffällig möglich.",
    goal: "Verlängertes Ausatmen aktiviert den Vagusnerv und drosselt den Sympathikus binnen Sekunden bis Minuten.",
    steps: [
      "Atmen Sie tief durch die Nase ein – und atmen Sie gleich noch einen kleinen zweiten Schluck Luft oben drauf.",
      "Lassen Sie die Luft lang und vollständig durch den Mund 'seufzend' ab (wie ein erleichterter Seufzer).",
      "Wiederholen Sie 3–5-mal. Zwischen den Runden normal weiteratmen.",
      "Spüren Sie nach jeder Runde: Was tut sich in Schultern, Brust, Bauch?",
    ],
    caution: "Wenn Schwindel auftritt: Übung pausieren, normal weiteratmen.",
  },
  {
    id: "sos-orientieren",
    title: "Orientierungsreflex wecken (aus SE)",
    effect: "both",
    effectLabel: "Gleicht aus",
    minutes: "1–2 Min.",
    context: "SOS",
    when: "Wenn der Blick starr wird, der Körper sich zusammenzieht oder der Raum unwirklich wirkt.",
    goal: "Der Orientierungsreflex ist die natürliche erste Reaktion auf Veränderung – er bringt das Nervensystem ins Hier und Jetzt zurück und unterbricht Erstarrung.",
    steps: [
      "Lassen Sie den Kopf locker. Bewegen Sie die Augen – nicht den Kopf – langsam von links nach rechts.",
      "Benennen Sie dabei Dinge im Raum, ohne sie lange anzusehen: 'Tür. Fenster. Pflanze. Lampe.'",
      "Wechseln Sie das Tempo: einige Male langsam, dann etwas schneller, immer locker.",
      "Hören Sie auf, sobald Sie merken: Sie nehmen den Raum wieder bewusst wahr.",
    ],
  },
  {
    id: "voo",
    title: "Der Voo-Klang (Vagus-Stimulation)",
    effect: "hyper",
    effectLabel: "Beruhigt Übererregung",
    minutes: "2–4 Min.",
    context: "Alltag",
    when: "Bei Unruhe, Anspannung im Brustraum, nach Konflikten – auch unterwegs.",
    goal: "Der tiefe 'Voo'-Ton über die Stimmbänder massiert den Vagusnerv und weitet das Toleranzfenster. Die Vibration führt die Aufmerksamkeit in den Bauchraum.",
    steps: [
      "Atmen Sie tief ein. Stellen Sie sich vor, Ihr Bauch sei ein Resonanzraum.",
      "Atmen Sie aus und lassen Sie einen tiefen, sonoren Ton ertönen: 'Vooo' (wie 'Wuuuh').",
      "Spüren Sie die Vibration in Lippen, Brustkorb, Bauch – genau dort, wo sie zieht oder kribbelt.",
      "Atmen Sie normal weiter. Wiederholen Sie 4–6-mal und beobachten Sie, was sich verändert.",
    ],
    note: "Alternativen mit gleicher Wirkung: Summen, Singen, Gähnen bewusst zulassen, warmes Wasser trinken.",
  },
  {
    id: "schuetteln",
    title: "Abschütteln (Tremor-Prinzip)",
    effect: "hyper",
    effectLabel: "Entlädt Stressenergie",
    minutes: "5–10 Min.",
    context: "Alltag",
    when: "Nach belastenden Terminen, Nachrichten, Konflikten – wenn 'Restenergie' im Körper klebt.",
    goal: "Säugetiere schütteln Gefahr buchstäblich ab. Bewegtes Zittern entlädt die Stresschemie (Adrenalin/Cortisol) über die Muskulatur.",
    steps: [
      "Stehen Sie mit leicht gebeugten Knien, Beine entspannt. Die Knie dürfen weich zittern – das ist erwünscht.",
      "Lassen Sie das Zittern aus den Beinen aufsteigen – Hände und Arme dürfen locker mitschwingen.",
      "Bleiben Sie 5–10 Minuten dabei, atmen Sie normal. Nicht steigern, zulassen.",
      "Zum Abschluss: langsam stehen bleiben, spüren, was sich verändert hat.",
    ],
    caution: "Wenn Erinnerungen oder starke Gefühle aufsteigen: abbrechen, erden, notfalls professionelle Begleitung suchen. Bei KPTBS zunächst mit Therapeut*in üben.",
  },
  {
    id: "sicherer-ort",
    title: "Innerer sicherer Ort (Imagination nach PITT)",
    effect: "both",
    effectLabel: "Gleicht aus",
    minutes: "10–15 Min.",
    context: "Begleitung",
    when: "Als tägliche Stabilisierungsübung und als Basis für spätere Traumabearbeitung.",
    goal: "Ein innerer Ort vollkommener Sicherheit wird aufgebaut und verankert – ein jederzeit abrufbarer Gegenpol zur Alarmierung.",
    steps: [
      "Lehnen Sie sich zurück, schließen Sie die Augen. Atmen Sie einige Male ruhig.",
      "Stellen Sie sich einen Ort vor, an dem Sie sich völlig sicher und geborgen fühlen (real oder erfunden).",
      "Machen Sie ihn greifbar: Was sehen Sie? Hören? Riechen? Wie fühlt sich der Boden an?",
      "Bauen Sie eine innere Geste des 'Zurückkehrens' ein (z. B. zwei Finger berühren) und üben Sie das Abrufen.",
      "Kommen Sie langsam zurück und öffnen Sie die Augen. Notieren Sie die Geste.",
    ],
    note: "Wichtig: Der Ort muss sich SICHER anfühlen. Wenn Bilder vom Trauma dazwischentreten, abbrechen und an einen Therapeuten/eine Therapeutin wenden – das ist kein Versagen.",
  },
  {
    id: "koerperscan",
    title: "Kurzer Körperscan (innere Landkarte)",
    effect: "both",
    effectLabel: "Selbstwahrnehmung stärken",
    minutes: "5–10 Min.",
    context: "Alltag",
    when: "Täglich, besonders wenn Sie sich selten spüren oder viel im Kopf sind.",
    goal: "Übt den 'inneren Beobachter': Empfindungen wahrnehmen, ohne sie bewerten zu müssen – Grundfertigkeit jeder Traumaheilung.",
    steps: [
      "Setzen Sie sich bequem hin oder legen Sie sich hin. Augen offen oder geschlossen – wie es sicherer ist.",
      "Gehen Sie mit der Aufmerksamkeit von den Füßen langsam hoch: Fuß → Bein → Bauch → Brust → Hände → Arme → Hals → Gesicht.",
      "Bei jeder Stelle nur fragen: 'Was ist hier?' – Druck, Wärme, Kribbeln, Nichts. Alles ist erlaubt.",
      "Wo es angenehm ist, dort kurz verweilen. Wo es unangenehm ist, kurz wahrnehmen und weitergehen – ohne es zu ändern.",
      "Zum Schluss den ganzen Körper als Gesamtempfinden spüren.",
    ],
  },
  {
    id: "pendeln",
    title: "Pendeln (aus Somatic Experiencing)",
    effect: "both",
    effectLabel: "Gleicht aus",
    minutes: "5–10 Min.",
    context: "Begleitung",
    when: "Wenn eine bestimmte Spannung, ein Schmerz oder ein Gefühl im Körper hängt und Sie es dosiert ansehen wollen.",
    goal: "Die Aufmerksamkeit pendelt zwischen Belastung und Ressource, damit das Nervensystem lernt: Ich kann mich dem Nähern UND dem Zurückziehen. So erweitert sich das Toleranzfenster.",
    steps: [
      "Spüren Sie die belastende Empfindung (z. B. Enge im Brustkorb) – kurz, nur einige Sekunden, wie ein 'Hinschauen'.",
      "Wechseln Sie bewusst zu einer neutralen oder angenehmen Empfindung (warme Hand, weicher Stuhl).",
      "Pendeln Sie 5–8-mal hin und her: Enge – Wärme – Enge – Wärme. Jedes Mal nur wenige Sekunden.",
      "Beobachten Sie: Verändert sich die Enge von allein? Was sagt der Körper?",
    ],
    caution: "Wenn die Belastung zunimmt: sofort zur Ressource wechseln und die Übung beenden.",
  },
  {
    id: "aktivieren",
    title: "Aktivierungs-SOS bei Erstarrung & Taubheit",
    effect: "hypo",
    effectLabel: "Bei Untererregung aktivieren",
    minutes: "2–5 Min.",
    context: "SOS",
    when: "Wenn Sie 'weg' sind, erstarrt, taub, die Welt durch Glas wirkt.",
    goal: "Dorsale Vagus-Shutdown wird sanft durchbewegt: Bewegung, Wärme, Stimme und Aktivierung bringen das System zurück in den Körper.",
    steps: [
      "Stehen Sie auf, wenn möglich. Fühlen Sie den Boden: Füße aufstampfen, langsames Auf-und-ab.",
      "Reiben Sie die Hände kräftig aneinander, bis sie warm sind; bedecken Sie damit Augen oder Nacken.",
      "Trinken Sie einen Schluck kaltes oder warmes Wasser und spüren Sie den Weg im Hals.",
      "Rufen Sie laut Ihren Namen, den Ort und das Datum. Oder telefonieren Sie kurz mit einer vertrauten Person.",
      "Recken und strecken Sie sich, gähnen Sie laut bewusst aus.",
    ],
    note: "Co-Regulation ist bei Shutdown oft stärker als jede Solo-Übung: eine vertraute Stimme, ein Mensch im Raum, ein Haustier.",
  },
  {
    id: "abend",
    title: "Herunterfahren am Abend (Schlafvorbereitung)",
    effect: "hyper",
    effectLabel: "Beruhigt Übererregung",
    minutes: "10 Min.",
    context: "Abend",
    when: "Bei Ein- und Durchschlafstörungen, grübelndem Nervensystem am Abend.",
    goal: "Ein Abendritual signalisiert dem Nervensystem wiederholt: Der Tag ist zu Ende, wir sind sicher.",
    steps: [
      "Fixe Uhrzeit, gedämpftes Licht. Bildschirme 30–60 Min. vorher weg oder dimmen.",
      "Warm duschen oder die Füße in warmes Wasser – Wärme lenkt den Blutfluss und beruhigt.",
      "3–5 langsame Ausatmungen (wie 'Physiologischer Seufzer'), danach 5 Min. Voo-Klang oder Summen.",
      "Körperscan ganz kurz: nur Füße, Bauch, Kiefer – Kiefer lösen, Zunge vom Gaumen lösen.",
      "Gedanken auf einen Zettel schreiben ('Für morgen: …') und beiseitelegen.",
    ],
  },
  {
    id: "selbstberuehrung",
    title: "Selbstberuhigende Berührung",
    effect: "hyper",
    effectLabel: "Beruhigt Übererregung",
    minutes: "2–5 Min.",
    context: "Alltag",
    when: "Wenn Nähe von anderen gerade zu viel ist, aber Beruhigung gebraucht wird.",
    goal: "Der Körper kann Sicherheit über Berührung erfahren – auch über die eigenen Hände. Sanfter Druck signalisiert dem Nervensystem Geborgenheit.",
    steps: [
      "Legen Sie eine Hand flach auf den Brustkorb oder den Bauch.",
      "Spüren Sie die Wärme und das Gewicht der Hand. Atmen Sie in die Hand hinein.",
      "Umschließen Sie mit beiden Händen die eigenen Oberarme und drücken Sie sanft – wie eine Umarmung.",
      "Klopfen Sie wechselseitig mit den Handflächen rhythmisch auf die Oberschenkel (links-rechts, wie ein langsamer Takt).",
      "Bleiben Sie, bis sich die Atmung von selbst verlangsamt.",
    ],
  },
  {
    id: "co-regulation",
    title: "Co-Regulation nutzen (mit anderen)",
    effect: "both",
    effectLabel: "Das stärkste Regulationssystem",
    minutes: "flexibel",
    context: "Begleitung",
    when: "Grundsätzlich – das menschliche Nervensystem reguliert sich vor allem IN sicheren Beziehungen.",
    goal: "Ein ruhiges, warmes Gegenüber reguliert unser Nervensystem über Stimme, Mimik und Rhythmus automatisch mit – stärker als jede Einzeltechnik.",
    steps: [
      "Nehmen Sie bewusst 1–3 Menschen in Ihr Leben auf, bei denen Sie sich sicher fühlen (Freund*in, Familie, Gruppe).",
      "Vereinbaren Sie ein 'Notfallwort' und eine konkrete Kontaktmöglichkeit für schwierige Momente.",
      "Nutzen Sie gemeinsame Regulierung: spazieren, gemeinsam kochen, Musik, Sport – Rhythmus + Beziehung.",
      "Lassen Sie zu, dass andere Sie trösten – auch wenn es fremd oder unangenehm anfühlt. In kleinen Dosen üben.",
    ],
    note: "Wenn Beziehungen gerade der schwierigste Teil sind: Das ist das eigentliche Trauma-Thema – genau daran arbeitet eine gute Traumatherapie.",
  },
];
