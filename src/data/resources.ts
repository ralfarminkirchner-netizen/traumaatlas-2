// Wegweiser: Verzeichnisse, Fachgesellschaften, Ambulanzen, Hotlines (Deutschland)

export interface Resource {
  name: string;
  url: string;
  what: string;
  type: string;
  note?: string;
}

export interface ResourceGroup {
  id: string;
  title: string;
  subtitle: string;
  items: Resource[];
}

export const resourceGroups: ResourceGroup[] = [
  {
    id: "suche",
    title: "Therapeut:innensuchen (offiziell & spezialisiert)",
    subtitle: "Wo Sie gelistete Trauma-Therapeut:innen und Psychotherapeuten finden",
    items: [
      { name: "Arzt- & Psychotherapeutensuche der KBV / 116117", url: "https://arztsuche.116117.de", type: "Offiziell",
        what: "Das offizielle Verzeichnis aller zugelassenen Ärzt:innen und Psychotherapeut:innen in Deutschland. Filter nach Fachgebiet, Verfahren (Verhaltenstherapie, Tiefenpsychologie, Analytische, Systemische) und Ort.",
        note: "Alle gelisteten Personen haben Approbation und Kassenzulassung." },
      { name: "DeGPT – Therapeut:innensuche Psychotraumatologie", url: "https://www.degpt.de/hilfe-fuer-betroffene/therapeut-innen-in-ihrer-naehe-finden/", type: "Spezialisiert",
        what: "Deutschsprachige Gesellschaft für Psychotraumatologie: Sucht speziell nach ausgebildeten Psychotraumatherapeut:innen in Deutschland, Österreich und der Schweiz.",
        note: "Der zentrale Fachverband für Traumatherapie (auch Fortbildungen)." },
      { name: "EMDRIA Deutschland – Therapeut:innensuche", url: "https://www.emdria.de/therapeut-innen", type: "Spezialisiert",
        what: "Fachverband der EMDR-Anwender:innen. Liste aller in Deutschland zertifizierten EMDR-Therapeut:innen mit Ausbildungsstand (Standard/Zertifiziert/Consultant).",
        note: "Garantiert echte EMDR-Ausbildung, nicht nur 'mit EMDR gearbeitet'." },
      { name: "Traumanetz Seelische Gesundheit Sachsen", url: "https://traumanetz-sachsen.de/therapeutensuche/", type: "Regional",
        what: "Sachsenweite Therapeut:innen-Datenbank mit Traumaschwerpunkt, inkl. Kliniken und Beratungsstellen – als Vorbild für weitere Bundesländer.",
        note: "Ein Landes-Projekt genau in der Art, die Sie im Kopf haben." },
      { name: "Ostdeutsche Psychotherapeutenkammer (OPK)", url: "https://opk-info.de/patienten/kassenaerztliche-vereinigungen/psychotraumatherapeuten/", type: "Spezialisiert",
        what: "Kassenärztlich zugelassene Psychotraumatherapeut:innen in Berlin, Brandenburg, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen." },
      { name: "therapie.de", url: "https://www.therapie.de", type: "Privat & Kasse",
        what: "Größtes deutschsprachiges Therapie-Portal: Praxen mit Schwerpunkten (Trauma, EMDR etc.), oft mit Wartezeit-Angaben und Online-Termin." },
      { name: "Psych-Info (BDP)", url: "https://www.psych-info.de", type: "Offiziell",
        what: "Suchmaschine des Berufsverbands Deutscher Psycholog:innen: filtern nach Beschwerdebildern und Verfahren." },
      { name: "Weiße Liste (Bertelsmann Stiftung)", url: "https://www.weisse-liste.de", type: "Offiziell",
        what: "Kosten- und werbefreie Arzt- und Therapeutensuche der Patientenverbände." },
    ],
  },
  {
    id: "weg",
    title: "Der Weg zum Therapieplatz",
    subtitle: "So funktioniert der Zugang in Deutschland – Schritt für Schritt",
    items: [
      { name: "1 · Erstgespräch (Sprechstunde)", url: "https://www.kbv.de/html/terminservicestelle.php", type: "Ablauf",
        what: "Jeder Therapeut muss Sprechstunden anbieten. Kürzester Weg: Terminservicestelle über 116117 (rund um die Uhr) – ein Erstgespräch innerhalb von 4 Wochen." },
      { name: "2 · Behandlungsempfehlung", url: "https://www.bptk.de", type: "Ablauf",
        what: "Nach dem Erstgespräch bekommen Sie eine schriftliche Empfehlung (welches Verfahren, wie lange). Damit suchen Sie weiter." },
      { name: "3 · Probatorische Sitzungen", url: "https://www.bptk.de", type: "Ablauf",
        what: "Vor der Therapie gibt es bis zu 5 Sitzungen zum Kennenlernen – davon zu merken: Wenn 'die Chemie' nicht stimmt, dürfen Sie weitersuchen." },
      { name: "4 · Antrag & Therapie", url: "https://www.bptk.de", type: "Ablauf",
        what: "Den Antrag stellen Sie gemeinsam mit der Therapeutin/dem Therapeuten bei der Krankenkasse. Nach Bewilligung beginnt die Therapie." },
      { name: "5 · Kostenerstattungsverfahren", url: "https://www.bptk.de", type: "Ablauf",
        what: "Finden Sie keinen Kassenplatz, müssen Krankenkassen in berechtigten Fällen eine Privatpraxis übernehmen (§13 Abs. 3 SGB V). UPD berät kostenlos: 01805 111 31." },
    ],
  },
  {
    id: "fach",
    title: "Fachgesellschaften & Ausbildungsverzeichnisse",
    subtitle: "Wer darf was – und wo werden Verfahren gelehrt",
    items: [
      { name: "DeGPT – Deutschsprachige Gesellschaft für Psychotraumatologie", url: "https://www.degpt.de", type: "Fachgesellschaft",
        what: "Größter deutschsprachiger Fachverband: Leitlinien, Ausbildungsstandards in Psychotraumatologie, Tagungen, Therapeutensuche." },
      { name: "EMDRIA Deutschland", url: "https://www.emdria.de", type: "Fachgesellschaft",
        what: "Zertifiziert EMDR-Ausbildungen in Deutschland und führt das Anwender:innenverzeichnis." },
      { name: "Somatic Experiencing Deutschland", url: "https://www.se-training.de", type: "Ausbildung",
        what: "Dreistufige SE-Ausbildung (Beginner/Intermediate/Advanced) für Psychotherapeut:innen, Ärzt:innen und Körpertherapeut:innen." },
      { name: "DGPT", url: "https://www.dgpt.de", type: "Fachgesellschaft",
        what: "Deutsche Gesellschaft für Psychoanalyse, Psychotherapie, Psychosomatik und Tiefenpsychologie – Verband der tiefenpsychologisch Analytisch arbeitenden." },
      { name: "DGV – Deutsche Gesellschaft für Verhaltenstherapie", url: "https://www.dgvt.de", type: "Fachgesellschaft",
        what: "Fachgesellschaft der Verhaltenstherapeuten:innen; auch Ausbildung in DBT, Schematherapie etc." },
      { name: "Kassenzulassung & Approbation", url: "https://www.bptk.de", type: "Wichtig",
        what: "Nur approbierte Psychotherapeut:innen (psychologisch oder ärztlich) und Kinder- und Jugendlichenpsychotherapeut:innen dürfen 'Psychotherapie' anbieten. Heilpraktiker:innen für Psychotherapie haben eine kleinere, nicht gleichwertige Erlaubnis." },
    ],
  },
  {
    id: "krisen",
    title: "Krisenhilfe & Selbsthilfe",
    subtitle: "Sofort da, wenn es brennt – und Orte des Austauschs",
    items: [
      { name: "Telefonseelsorge", url: "https://www.telefonseelsorge.de", type: "Hotline",
        what: "0800 111 0 111 oder 0800 111 0 222 – kostenfrei, rund um die Uhr, anonym. Auch Chat und Mail.", note: "Nicht nur 'letzte Rettung' – ganz normaler erster Anlauf." },
      { name: "Hilfetelefon Gewalt gegen Frauen", url: "https://www.hilfetelefon.de", type: "Hotline",
        what: "116 016 – Beratung für Betroffene häuslicher und sexualisierter Gewalt, mehrsprachig, kostenfrei." },
      { name: "Weißer Ring", url: "https://www.weisser-ring.de", type: "Opferhilfe",
        what: "Unterstützung für Opfer von Gewalt- und Kriminalitätsdelikten – auch psychosoziale Prozessbegleitung." },
      { name: "BAfF – Beratungszentren für Geflüchtete", url: "https://www.baff-zentren.org", type: "Beratung",
        what: "Traumasensible Beratungsstellen für geflüchtete Menschen in ganz Deutschland." },
      { name: "Unabhängige Patientenberatung (UPD)", url: "https://www.patientenberatung.de", type: "Beratung",
        what: "Kostenlose, neutrale Beratung zu allen Fragen rund um Therapieplatz, Kosten und Rechte: 01805 111 31." },
      { name: "Selbsthilfegruppen (Nationale Kontaktstelle)", url: "https://www.nasb.de", type: "Selbsthilfe",
        what: "Datenbank aller Selbsthilfegruppen in Deutschland – Stichworte: 'Trauma', 'PTBS', 'Komplextrauma', 'Borderline'." },
      { name: "Angehörige: AGUS e. V.", url: "https://www.agus-online.de", type: "Angehörige",
        what: "Arbeitsgemeinschaft um das seelisch erkrankte und suchtkranke Kind/Angehörige – Austausch und Beratung für Angehörige." },
      { name: "Notfall", url: "tel:112", type: "Akut",
        what: "Bei akuter Selbst- oder Fremdgefährdung: 112 oder die nächste Notaufnahme. Psychiatrische Institutsambulanzen (PIA) übernehmen auch Notfälle." },
    ],
  },
  {
    id: "kliniken",
    title: "Spezialisierte Ambulanzen & Kliniken",
    subtitle: "Stationär und teilstationär bei schwerer PTBS und KPTBS",
    items: [
      { name: "Traumaambulanzen & Spezialambulanzen", url: "https://www.degpt.de/hilfe-fuer-betroffene/", type: "Ambulant",
        what: "An Unikliniken und Krankenhäusern: Ambulanzen mit Traumaschwerpunkt (EMDR, NET, DBT, traumafokussierte KVT). Liste über DeGPT und die jeweiligen Klinikwebsites.", note: "Oft kürzere Wartezeiten als niedergelassene Praxen." },
      { name: "Weisser Ring – Ambulanzen und Therapieangebote", url: "https://www.weisser-ring.de/hilfe/information/trauma/", type: "Ambulant",
        what: "Übersicht spezialisierter Ambulanzen für Gewaltopfer in Deutschland." },
      { name: "Spezialkliniken (stationär)", url: "https://www.degpt.de", type: "Stationär",
        what: "Bei KPTBS, schwerer Dissoziation oder mehrfachen Fehlversuchen: spezialisierte Kliniken mit phasenorientierten Trauma-Programmen (z. B. forensisch-traumatologische Angebote, Kliniken nach Reddemann, Zentren für KPTBS).", note: "Vorab Kostenübernahme mit der Krankenkasse klären." },
      { name: "Fachkliniksuche DGPPN", url: "https://www.dgppn.de", type: "Stationär",
        what: "Deutsche Gesellschaft für Psychiatrie: Informationen zu psychiatrischen und psychosomatischen Kliniken mit Traumaschwerpunkten." },
    ],
  },
];
