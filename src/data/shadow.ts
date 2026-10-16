// Schattenwelt-Lesart: dieselbe Karte, gelesen von der anderen Seite.
// Hier stehen nicht die Symptome, sondern ihre Schutzfunktionen.
// Stilregeln: Funktion + Würde. Nie Pathologie, nie Kitsch, nie
// Heldenromantik, nichts, das eine Diagnose impliziert.
// Abdeckung: alle 32 Symptome + 3 Zustände + 15 Neuroprofile vollständig;
// 6 Kategorien + 3 Phasen; Verfahren/Übungen auf Label-Ebene (Typ-Fallbacks
// in universe/transduction.ts).

export interface SchattenEintrag {
  /** Schutz-Name — ersetzt das Label in der Schattenwelt */
  label: string;
  /** Begegnungstext — ersetzt/ergänzt die Zusammenfassung */
  begegnung: string;
}

export const SCHATTEN: Record<string, SchattenEintrag> = {
  // ── Wiedererleben (Intrusionen) ─────────────────────────────────
  flashbacks: {
    label: "der Bote, der die Wahrheit wiederholt",
    begegnung: "Er trägt ein Stück Vergangenheit in die Gegenwart, weil es damals nicht zu Ende erzählt werden durfte. Er lässt nicht los, was noch gehört werden will.",
  },
  albttraeume: {
    label: "die Nachtwache, die übt",
    begegnung: "Im Schlaf wird verarbeitet, was am Tag keinen Platz hat. Die Albträume sind der Versuch der Seele, Unerträgliches in kleine, erträgliche Teile zu zerlegen.",
  },
  aufdringlich: {
    label: "das sture Gedächtnis dessen, was zählt",
    begegnung: "Was überlebenswichtig war, wird nicht freigegeben. Diese Erinnerungen drängen sich auf, weil sie einmal wichtiger waren als alles andere — wichtiger als Ruhe, wichtiger als Schlaf.",
  },
  trigger: {
    label: "der Frühwarnsensor",
    begegnung: "Körper und Gefühl reagieren auf Signale, die wie damals klingen, riechen, sich anfühlen. Der Sensor hat früher Gefahren erkannt, bevor sie sichtbar waren — darum ist er noch heute so schnell.",
  },
  gefuehlserinnerungen: {
    label: "der Körper, der sich erinnert",
    begegnung: "Wenn Worte fehlen, bleibt das Gefühl: plötzliche Leere, Ekel, Zwang. Der Körper bewahrt, was der Verstand nicht halten konnte — in seiner eigenen Sprache.",
  },

  // ── Anhaltende Erregung ─────────────────────────────────────────
  schreck: {
    label: "der Blitzableiter",
    begegnung: "Erschrocken zu sein war einmal die schnellste Art, wach zu werden, wenn Gefahr nahte. Der Blitzableiter steht noch immer auf dem Dach — auch wenn das Gewitter längst vorbei ist.",
  },
  schlaf: {
    label: "die Wache, die nachts Dienst tut",
    begegnung: "Schlaf öffnet die Tür zur Verletzlichkeit. Wer gelernt hat, dass Nacht nicht sicher ist, hält die Tür — bewusst oder unbewusst — lieber zu.",
  },
  reizbar: {
    label: "das Alarmfeuer",
    begegnung: "Die Wut, die so schnell entflammt, ist überschüssige Alarmenergie: ein System, das auf Volllast läuft und jeden Funken für eine Bedrohung hält.",
  },
  konzentration: {
    label: "der geteilte Blick",
    begegnung: "Ein Teil des Verstandes sucht die Gefahr, während ein anderer die Aufgabe erledigen soll. Konzentration braucht Beides-Loslassen-Können — das ist unter Dauerwache kaum möglich.",
  },
  hypervigilanz: {
    label: "der Wächter, der nie Feierabend macht",
    begegnung: "Sein Dienst hat dich beschützt. Er scannt noch immer Räume, Stimmen, Blicke und Ausgänge — längst nachdem die Gefahr vorbei ist. Er weiß nur nicht, dass der Krieg zu Ende ist.",
  },
  herzrasen: {
    label: "der Motor im Leerlauf",
    begegnung: "Herzrasen ohne Befund ist ein Motor, der auf Notstand läuft, obwohl niemand fährt. Der Körper tankt bereit — für eine Flucht, die es nicht mehr gibt.",
  },

  // ── Vermeidung & Rückzug ────────────────────────────────────────
  "vermeidung-orte": {
    label: "der Leibwächter, der die gefährlichen Orte kennt",
    begegnung: "Er hält dich fern von allem, was nach damals riecht. Seine Karte ist verlässlich — nur ist sie von gestern. Er meint es noch immer gut.",
  },
  gedankenverdrängung: {
    label: "der verschlossene Raum",
    begegnung: "Manche Türen hält das Gedächtnis zu, weil dahinter Dinge liegen, die ein Mensch nicht tragen konnte, während er sie erlebte. Der Raum bewacht, was noch nicht sicher genug ist, um geholt zu werden.",
  },
  gefuehlsabstumpfung: {
    label: "die Betäubung, die Schlimmeres verhindert hat",
    begegnung: "Gefühle abzudrehen war eine Weisheit des Nervensystems: Was man nicht fühlt, kann einen nicht überfluten. Die Taubheit hat dich durch Stunden getragen, in denen Fühlen unmöglich war.",
  },
  zurueckgezogen: {
    label: "das Rückzugslager",
    begegnung: "Wenig Kontakt, wenig Anforderung, wenig Risiko. Das Lager hat Schutz geboten, als die Welt außerhalb unsicher war. Es ist ein gut gebautes Lager — nur ein Zuhause ist es nicht.",
  },

  // ── Dissoziation & Erstarrung ───────────────────────────────────
  "neben-sich": {
    label: "der Hinausguckplatz",
    begegnung: "Wenn es zu viel wird, schaut ein Teil von dir von außen zu. Das ist keine Schwäche — es ist die eleganteste Flucht, die es gibt, wenn alle anderen Fluchtwege blockiert waren.",
  },
  erstarrung: {
    label: "die Notbremse",
    begegnung: "Wenn Kampf und Flucht unmöglich waren, hat die Erstarrung das Schlimmste abgefedert. Sie ist die älteste Weisheit des Nervensystems — und sie hat dich damals gerettet.",
  },
  luecken: {
    label: "die verschlossenen Kammern",
    begegnung: "Weiße Flecken in der Erinnerung sind kein Loch im Kopf — sie sind verschlossene Kammern. Dahinter liegt das, was du in dem Moment nicht wissen durftest, um durchzukommen.",
  },
  entrückt: {
    label: "die Glaswand",
    begegnung: "Die Welt durch Glas ist weit weg und kann nicht mehr so nah treffen. Die Distanz war einst lebensnotwendig. Sie lässt sich später wieder verrücken — Zentimeter für Zentimeter.",
  },
  erstarrt: {
    label: "die Fernverbindung zum Körper",
    begegnung: "Den Körper nur aus der Ferne zu spüren hält den Schmerz auf Abstand. Die Verbindung ist nicht kaputt — sie ist nur leise geschaltet, weil laut einmal zu viel war.",
  },

  // ── Gefühle & Selbstbild ────────────────────────────────────────
  gefuehlsueberflutung: {
    label: "das Hochwasser hinter dem Wehr",
    begegnung: "Das Wehr hat lange gehalten und alles zurückgedrängt. Wenn es wankt, kommt auf einmal, was Jahre gesammelt wurde. Das Hochwasser ist kein Versagen des Wehrs — es ist der Beweis, wie viel es getragen hat.",
  },
  gefuehlstaubheit: {
    label: "der Frost, der das Zarte bewahrte",
    begegnung: "Wo Freude weh tun konnte, hat der Frost sie eingeschlossen — zusammen mit dem Schmerz. Er hat das Zarte bewahrt, indem er alles schlafen legte. Auftauen geht nur behutsam.",
  },
  scham: {
    label: "das fremde Urteil, das du tragen musstest",
    begegnung: "Scham ist oft die Stimme derer, die dir Schlimmes angetan haben — übernommen, weil es leichter war, sich selbst für kaputt zu halten, als machtlos zu sein. Das Urteil war nie deins. Du hast es nur getragen.",
  },
  selbstschaden: {
    label: "der Notausgang",
    begegnung: "Wenn kein anderer Ausgang aus dem Druck offenstand, hat dieser Weg funktioniert — er hat überlebt, was sonst unerträglich gewesen wäre. Er ist ein Notausgang, kein Charakterzug.",
  },
  leere: {
    label: "der ausgebrannte Schutzraum",
    begegnung: "Die Leere ist, was übrig bleibt, wenn ein Nervensystem jahrelang alles abwehren musste: ein Schutzraum nach Dienstende. Er ist müde, nicht tot. Räume lassen sich wieder einrichten.",
  },

  // ── Beziehungen & Körper ────────────────────────────────────────
  misstrauen: {
    label: "der Türspion",
    begegnung: "Er prüft erst einmal, wer da ist, bevor die Tür aufgemacht wird. Das hat Verletzungen erspart. Nur lässt er manchmal auch die stehen, die es gut meinen — er kann ihre Absichten nicht lesen, er kann nur warnen.",
  },
  naehe: {
    label: "der Torwächter der Nähe",
    begegnung: "Nähe öffnet Türen — auch zu Verletzung. Ein Torwächter vor der Tür zu halten war einst klug. Er lässt nur noch niemanden mehr herein, nicht einmal die, die es ernst meinen.",
  },
  schmerzen: {
    label: "die andere Sprache des Körpers",
    begegnung: "Worte hatten früher keine Wirkung oder brachten Gefahr. Der Körper hat eine eigene Sprache gefunden, um Unsagbares zu sagen — als Schmerz, wo es kein Gehör gab.",
  },
  magen: {
    label: "die Stelle, die Unerträgliches verdaut",
    begegnung: "Was nicht zu schlucken war, wurde trotzdem geschluckt — der Magen hat mitverdaut, was die Seele nicht fassen konnte. Er ist der verwundeste Ort eines langen Dienstes.",
  },
  haut: {
    label: "die Grenze, die Alarm schlägt",
    begegnung: "Die Haut ist die äußerste Grenze des Körpers. Wo Grenzen früher missachtet wurden, alarmiert sie noch heute — bei Berührung, Nähe, manchmal schon beim Gedanken daran.",
  },
  panik: {
    label: "die Sirene, die einmal Leben rettete",
    begegnung: "Volle Alarmstufe für eine Gefahr, die nicht mehr da ist: Die Sirene hat einmal richtig geläutet und Leben gerettet. Seitdem prüft sie nicht mehr nach — sie läutet lieber einmal zu viel.",
  },

  // ── Nervensystem-Zustände ───────────────────────────────────────
  "state:ventral": {
    label: "der sichere Hafen",
    begegnung: "Hier heilt, lernt und verbindet sich das Nervensystem. Dieser Zustand ist kein Ziel, das man erzwingen muss — er ist ein Ort, zu dem man wiederkehren darf, so oft es gebraucht wird.",
  },
  "state:sympathikus": {
    label: "die Alarmanlage mit alten Schlüsseln",
    begegnung: "Sie schützt mit Kampf und Flucht — beiden Abläufen, die einmal richtig waren. Die Schlüssel passen noch zu Türen, die es nicht mehr gibt. Sie zu wechseln dauert, weil Sicherheit Erfahrung braucht, keinen Befehl.",
  },
  "state:dorsal": {
    label: "die Notbremse mit Erinnerung",
    begegnung: "Der dorsale Vagus hat die Notbremse gezogen, als nichts mehr ging. Er hat durch Abschalten geschützt — die älteste und mühsamste Form von Mut. Er darf lernen, dass Atmen wieder geht.",
  },

  // ── Symptomfelder (Kategorien) ──────────────────────────────────
  "cat:intrusion": {
    label: "was die Seele noch erzählt",
    begegnung: "Alles in diesem Feld ist unvollendete Rede — Erinnerungen, die noch auf ihr Ende warten.",
  },
  "cat:arousal": {
    label: "die immerwährende Wache",
    begegnung: "Ein Wachdienst, der nie abgelöst wurde. Jedes Zeichen in diesem Feld ist ein Posten, der noch steht.",
  },
  "cat:vermeidung": {
    label: "die Grenzsteine",
    begegnung: "Grenzen, die gezogen wurden, als es keine gab. Sie stehen noch — verlässlich, aber von gestern.",
  },
  "cat:dissoziation": {
    label: "die Auszeiten, die trugen",
    begegnung: "Weg sein, neben sich stehen, erstarren: kleine Fluchten, die getragen haben, als Flucht unmöglich war.",
  },
  "cat:affekt": {
    label: "die Echos dessen, was nicht gefühlt werden durfte",
    begegnung: "Gefühle sind nicht verschwunden — sie sind verstaut, gefroren oder überlaufend. Dieses Feld bewahrt, was auf seinen Zeitpunkt wartet.",
  },
  "cat:beziehung": {
    label: "die vorsichtig gewordenen Brücken",
    begegnung: "Beziehung war einst der gefährlichste Ort — diese Karte zeigt, was ein Nervensystem tut, um Brücken zu schützen, die einmal eingestürzt sind.",
  },

  // ── Phasen ──────────────────────────────────────────────────────
  "phase:stabilisierung": {
    label: "das Fundament, das zuerst kommt",
    begegnung: "Keine Vorstufe, kein Warten aufs Eigentliche: Sicherheit ist die Arbeit. Alles Weitere steht auf diesem Fundament — und es darf so lange dauern, wie es dauert.",
  },
  "phase:konfrontation": {
    label: "das behutsame Anfassen dessen, was wartet",
    begegnung: "Verarbeitung ist kein Sturmangriff, sondern ein Hineingehen in dosierten Anteilen — immer mit einer Hand am Rückzug. Was gewagt wird, geschieht in sicherer Begleitung.",
  },
  "phase:integration": {
    label: "das Wieder-Wohnen im eigenen Leben",
    begegnung: "Nicht Abschluss, sondern Einzug: Das Erlebte wird Teil der Biografie statt ihrer Mitte. Ein Leben, in dem wieder gewählt werden kann.",
  },

  // ── Neuroprofile (PDA-Cluster) ──────────────────────────────────
  "p:pda": {
    label: "der Wächter der Selbstbestimmung",
    begegnung: "Ein Nervensystem, das Kontrollverlust als Gefahr kennt und Freiheit als Sicherheit. Was wie Verweigerung aussieht, ist meistens Schutz — can't, not won't.",
  },
  "p:pda-anforderung": {
    label: "der Frühwarner vor Fremdsteuerung",
    begegnung: "Jede Forderung wird unbewusst auf Kontrollverlust geprüft — schneller als jeder Gedanke. Der Warner hat nur einen Schalter: Alarm.",
  },
  "p:pda-autonomie": {
    label: "der Kompass nach innen",
    begegnung: "Wo echte Wahl ist, sinkt der Alarm. Dieser Kompass zeigt nicht nach Norden, sondern nach Selbstwirksamkeit — und er ist verlässlich.",
  },
  "p:pda-intern": {
    label: "der strenge Innenhüter",
    begegnung: "Auch die eigenen Forderungen werden wie äußere behandelt — Duschen, Essen, Antworten. Der Hüter macht keine Ausnahmen, weil er Überforderung von überall erwartet.",
  },
  "p:pda-indirekt": {
    label: "der Scanner unsichtbarer Fäden",
    begegnung: "Rechnungen, Termine, offene Nachrichten — und Lob, das als nächste Erwartung ankommt. Der Scanner liest die Fäden, die andere nicht sehen.",
  },
  "p:pda-antworten": {
    label: "das Arsenal der vielen Auswege",
    begegnung: "Kampf, Flucht, Erstarrung, Anpassen, Witze, Ausreden, Wegträumen: ein ganzes Arsenal, das einmal funktioniert hat — und das heute noch zückt wird, bevor es überhaupt nötig wäre.",
  },
  "p:pda-strategien": {
    label: "der Diplomat der Auswege",
    begegnung: "Offenes Nein wäre ein Risiko gewesen — also wurde verhandelt, abgelenkt, vertröstet. Ein Diplomat, der jeden Tisch verlässt, bevor Forderungen auf ihn geschoben werden.",
  },
  "p:pda-masking": {
    label: "die unsichtbare Doppelwache",
    begegnung: "Mitgehen mit Qual: Die Blockade bleibt innen, die Maske außen. Die Doppelwache kostet doppelt — und wird oft erst nach Jahren gesehen.",
  },
  "p:pda-geschlecht": {
    label: "der ungesehene Dienst",
    begegnung: "Mädchen und Frauen halten Masken länger und fallen seltener auf. Ihr Dienst wurde als Sensibilität, Stimmung oder andere Diagnosen gelesen — selten als das, was er war.",
  },
  "p:pda-erwachsene": {
    label: "der älteste Dienst ohne Anerkennung",
    begegnung: "Formulare, Hierarchien, Mikromanagement: Der Erwachsenen-Alltag ist voller Forderungen. Viele meistern ihn jahrelang mit Glanz und Kollaps — ohne je erkannt worden zu sein.",
  },
  "p:pda-familie": {
    label: "das Zuhause als Baustelle der Sicherheit",
    begegnung: "Familien merken oft als Erste, dass Druck scheitert und Wahlfreiheit trägt. Was wie Trotz wirkt, ist meist Alarm — und Alarm lässt sich nicht durchsetzen, nur entschärfen.",
  },
  "p:pda-beziehung": {
    label: "der Wächter vor der Tür zur Nähe",
    begegnung: "Auch geliebte Menschen werden zu Anforderungen, sobald sie bitten oder erwarten. Der Wächter steht dann vor der Tür zur Nähe — nicht aus Desinteresse, sondern aus Schutz.",
  },
  "p:pda-adhs": {
    label: "die doppelte Wache",
    begegnung: "ADHS kennt den Interesse-Modus; PDA den Anforderungs-Alarm. Zusammen: Aufgaben ohne innere Zündung sind doppelt unerreichbar, weil zwei Systeme gleichzeitig Nein sagen.",
  },
  "p:pda-audhd": {
    label: "das Steuerhaus mit zwei Kapitänen",
    begegnung: "Ein Teil will Struktur, ein Teil Abwechslung; einer bremst, einer gibt Gas. Das Steuerhaus ist laut — und trotzdem fährt das Schiff seit Jahren.",
  },
  "p:pda-kptbs": {
    label: "die Festung, die einmal Heimat war",
    begegnung: "Wo Trauma wiederholte war, sind Kontrolle und Vermeidung keine Eigenheiten, sondern Architektur: Mauern, die ein Zuhause waren, als nichts anderes blieb.",
  },

  // ── Verfahren (Label-Ebene) ─────────────────────────────────────
  "m:emdr": { label: "der Fluss, der Erinnerungen an ihren Platz trägt", begegnung: "" },
  "m:tfcbt": { label: "das Wiederholen, bis die Angst müde wird", begegnung: "" },
  "m:net": { label: "die Biografie, die in Reihe kommt", begegnung: "" },
  "m:se": { label: "die Körperarbeit der kleinen Schritte", begegnung: "" },
  "m:sp": { label: "der Körper als Landkarte der Sicherheit", begegnung: "" },
  "m:narm": { label: "die Beziehung, die heilt", begegnung: "" },
  "m:pitt": { label: "der geschützte Spielraum", begegnung: "" },
  "m:irrt": { label: "das Bild, das neu gerahmt wird", begegnung: "" },
  "m:brainspotting": { label: "der Blick, der trägt", begegnung: "" },
  "m:dbr": { label: "der Anfang, bevor alles begann", begegnung: "" },
  "m:egostate": { label: "der Rat der inneren Räte", begegnung: "" },
  "m:schematherapie": { label: "die alten Muster, die neue Wege lernen", begegnung: "" },
  "m:dbt": { label: "das Handwerkszeug für Sturmzeiten", begegnung: "" },
  "m:tre": { label: "das Zittern, das entlädt", begegnung: "" },
  "m:tsyoga": { label: "die Bewegung, die zurückkehrt", begegnung: "" },
  "m:krst": { label: "die Ressourcen, die Konfrontation tragen", begegnung: "" },
  "m:polyvagal": { label: "die Karte des Nervensystems", begegnung: "" },

  // ── Übungen (Label-Ebene) ───────────────────────────────────────
  "e:sos-54321": { label: "der Anker in fünf Schritten", begegnung: "" },
  "e:sos-ausatmen": { label: "das Ventil der langen Ausatmung", begegnung: "" },
  "e:sos-orientieren": { label: "der Blick, der die Gegenwart findet", begegnung: "" },
  "e:voo": { label: "der Klang, der beruhigt", begegnung: "" },
  "e:schuetteln": { label: "das Nachbeben, das entschärft", begegnung: "" },
  "e:sicherer-ort": { label: "der Ort, der immer da ist", begegnung: "" },
  "e:koerperscan": { label: "die Rückkehr in den Körper", begegnung: "" },
  "e:pendeln": { label: "der Weg, der immer nach Hause führt", begegnung: "" },
  "e:aktivieren": { label: "die Rückholung der Energie", begegnung: "" },
  "e:abend": { label: "der gebaute Übergang in den Schlaf", begegnung: "" },
  "e:selbstberuehrung": { label: "die Hand, die hält", begegnung: "" },
  "e:co-regulation": { label: "die Wärme eines anderen Nervensystems", begegnung: "" },
};
