# PDA-Profil — Neuroprofile im Atlas (integriert)

Stand: **integriert** (2026-10-11) · `src/data/pda.ts` via `graph.ts` (buildGraph)
eingebunden · 15 Profil-Knoten, 66 Kanten → Atlas jetzt 139 Knoten / 395 Kanten.
Laufzeit-verifiziert: 0 Dangling-Edges, `neighborsOf("p:pda")` = 31 Nachbarn.

---

## 1. Einordnung & wissenschaftlicher Stand

PDA steht für **Pathological Demand Avoidance** — von vielen Betroffenen
inzwischen umbenannt in **Pervasive Drive for Autonomy**. Beschrieben wurde
das Muster in den 1980ern von Elizabeth Newson (UK) an autistischen Kindern.
Heute wird es als **Profil innerhalb von Autismus** verstanden, zunehmend
auch mit ADHS assoziiert; es ist **kein eigenständiger Diagnose-Code** in
DSM-5-TR oder ICD-11. Deshalb im Atlas als *Profil* geführt, nicht als
Diagnose — das trägt die offene wissenschaftliche Einordnung ehrlich:
Ob PDA ein eigenes Muster ist oder eine extreme Ausprägung von
Erregungsdysregulation bei hochsensibler Neurozeption, ist ungeklärt.

Kern des Profils: **Alltagsanforderungen — auch selbst auferlegte, auch
eigentlich gewollte — lösen eine Bedrohungsreaktion aus.** Nicht Trotz,
sondern Neurozeption: Das Nervensystem klassifiziert Kontrollverlust als
Gefahr und schaltet auf Kampf, Flucht, Erstarrung oder Fawning. Die
Community fasst es als **„Can't, not won't"**: ein neurologischer Block,
keine Entscheidung. Daraus folgt zentral: Belohnungs- und Drucksysteme
wirken nicht — sie verstärken die Bedrohung.

## 2. Datenmodell (integriert)

- Neuer NodeType `profile` — Meta: Label „Neuroprofile", Farbe `#a98fc7`,
  soft `rgba(169,143,199,0.16)`.
- Neuer EdgeType `profil` — Label „kommt vor bei / prägt".
- ID-Konvention: Präfix `p:`.
- Kosmos-Layout: TYPE_ORDER + SIZE_BY_TYPE (0.4) + EDGE_COLORS + Kurznamen
  ergänzt; GraphFallback: Farbe, Radius 6, dynamische Knoten-/Kantenzahl.

### Knoten (15)

| ID | Label | Fokus |
|----|-------|-------|
| `p:pda` | PDA-Profil | Kern: Anforderung = Bedrohung, Autonomie = Sicherheit |
| `p:pda-anforderung` | Anforderung als Bedrohung | Neurozeption → Alarm, PFC offline |
| `p:pda-autonomie` | Autonomie als Sicherheit | Wahlmöglichkeit → ventraler Vagus |
| `p:pda-intern` | Innere Anforderungen | Duschen, Essen, Schlaf, Nachrichten, Vorfreude |
| `p:pda-indirekt` | Indirekte & implizite Anforderungen | Rechnungen, Termine, Pläne — und Lob |
| `p:pda-antworten` | Die vielen F's | Kampf, Flucht, Freeze, Fawn, Fantasie, Vergessen, Fibbing, Flopping, Funster |
| `p:pda-strategien` | Sozialstrategien des Vermeidens | Ablenken, verhandeln, Ausreden, Charme, Rollenspiel |
| `p:pda-masking` | Maskierung & Internalisierung | Komplizen-Modus, unsichtbare Blockade |
| `p:pda-geschlecht` | Übersehen bei Mädchen & Frauen | Diagnostische Lücke, Fehleinstufung |
| `p:pda-erwachsene` | PDA bei Erwachsenen | Verwaltung, Hierarchie, Mikromanagement, Zyklus-Burnout |
| `p:pda-familie` | Familie & Schule | Schulverweigerung trotz Lernwunsch, Low-Demand |
| `p:pda-beziehung` | PDA in Beziehungen | „Müll rausbringen" → Panik, Jahre falscher Deutung |
| `p:pda-adhs` | Überlappung ADHS | PDA-Züge bei ADHS mindestens so häufig wie bei Autismus |
| `p:pda-audhd` | Überlappung AuDHD | Strukturbedürfnis × Interesse-Modus: Gas und Bremse |
| `p:pda-kptbs` | Überlappung Komplextrauma | Vermeidung als Überlebensstrategie, Fawning, Scham |

### Kanten (66, Auswahl — vollständige Liste in `src/data/pda.ts`)

- Kern: `cat:vermeidung`, 7 Symptome (erstarrung, panik, reizbar,
  konzentration, hypervigilanz, zurueckgezogen, scham), `m:polyvagal`
  (fundierung), `phase:stabilisierung`.
- Erregungslagen: anforderung → sympathikus + dorsal; autonomie →
  zielzustand ventral; indirekt/masking/antworten → sympathikus bzw. dorsal.
- Angebote (reguliert/behandlt, nie fordernd): narm, se, dbt,
  schematherapie; pendeln, sicherer-ort, sos-orientieren, co-regulation,
  sos-54321, sos-ausatmen, schuetteln, abend, koerperscan.
- Varianten → Kern: 12× `profil`; Überlappungs-Kanten zu Symptomen und
  Kategorien (siehe pda.ts).

## 3. KiNFORMER-Texte — drei Tiefenstufen

### Stufe 1 · Begegnung (Brückenkarte + Befund + Handlungen)

> **Befund**
>
> Manche Nervensysteme erleben jede Anforderung — auch eine Bitte, auch
> etwas Selbstgewolltes — als Bedrohung. Dann reagiert der Körper mit
> Alarm oder Blockade, bevor der Kopf überhaupt mitdenken kann. Das nennt
> man das PDA-Profil (Pervasive Drive for Autonomy). Es ist kein Trotz
> und keine Diagnose, sondern ein Muster: **Can't, not won't** — der Körper
> kann im Moment nicht, er will nicht nicht.
>
> **Was das bedeutet**
>
> - Anforderungen von außen UND von innen (E-Mails, Termine, aber auch
>   Duschen, Essen, Schlafengehen) können Alarm auslösen.
> - Druck, Belohnung und Drohung wirken wie zusätzliche Anforderung —
>   sie verschärfen das Muster.
> - Wo echte Wahlmöglichkeit und ein offener Ausstieg sind, entspannt sich
>   das System. Autonomie ist hier kein Wunsch, sondern Sicherheit.

**Handlungen** (Einladungen — nichts davon ist eine Aufgabe):

1. **Wahlmöglichkeit erweitern** — ein Ding, das heute ansteht, in zwei
   Arten anbieten („Früh oder spät?" statt „Jetzt").
2. **Anforderung unsichtbar machen** — die Bitte nur andeuten, den Raum
   lassen, dass es von selbst passiert.
3. **Pendeln üben** — kurz an die schwierige Sache, zurück zur Ressource,
   wieder hin. Immer mit Ausstieg.
4. **Scham benennen** — „Blockade ist Körperschutz, kein Charakterfehler."

### Stufe 2 · Tiefgang (was dahinter wirkt)

> **Der Mechanismus: Neurozeption vor Wille**
>
> Die Neurozeption prüft ununterbrochen, unbewusst und schneller als jeder
> Gedanke: sicher oder gefährlich? Beim PDA-Profil wird *Kontrollverlust*
> als Gefahr klassifiziert — eine Bitte, ein Zeitplan, ein Termin. Die
> Stresskaskade startet (siehe `wahrnehmung → orientierung → mobilisierung
> → erstarrung`): Die Amygdala übernimmt, der präfrontale Cortex — genau
> der Teil, der „einfach machen" könnte — geht offline. Das Ergebnis sieht
> von außen aus wie Verweigerung. Von innen ist es Panik oder Lähmung.
>
> **Anforderungen sind überall**
>
> Direkt: „Räum dein Zimmer auf." Indirekt: eine Rechnung, die bezahlt
> werden muss, ein nicht beantworteter Text. Innerlich: die Dusche, die
> man sich selbst auferlegt — sogar *Vorfreude* kann blockieren, weil sie
> zur Erwartung wird. Deshalb trifft man das Profil auch bei Menschen, die
> „gut funktionieren" und dann zuhause kollabieren: Die Anforderungen
> summieren sich, bis das System blockiert oder herunterfährt.
>
> **Die Abwehrstrategien (Sozialstrategien des Vermeidens)**
>
> Statt offen zu verweigern, nutzt das Profil soziale Mittel: ablenken,
> verhandeln, Ausreden („Meine Arme sind zu schwach!"), Geschichten,
> Humor, Vertrösten, Rollenspiel. Die berichteten Bedrohungsantworten
> reichen über Kampf und Flucht hinaus: Freeze (Erstarrung), Fawn
> (Anpassung/Übererfüllen), Fantasie (Flucht in innere Welten),
> Vergessen (Blank werden), Fibbing (Konfabulation unter Druck),
> Flopping (physisch „abschalten"), Funster (unkontrollierter Humor).
>
> **Warum Belohnung und Bestrafung scheitern**
>
> Beides ist aus Sicht des Nervensystems eine zusätzliche Anforderung mit
> Erwartung — also Alarmverstärker. Was wirkt: radikale Akzeptanz,
> eingebaute Wahlmöglichkeiten, Titration (dosierte Kleinstschritte mit
> Rückkehrrecht) und die Entschärfung der Erwartung selbst.
>
> **Erscheinungsformen: Maskierung, Geschlecht, Erwachsensein**
>
> Internalisierer ertragen Anforderungen unter hohem Innendruck —
> Jahrzehntelanges Mitgehen mit Qual, oft erst im Erwachsenenalter erkannt.
> Mädchen und Frauen werden durch sozialisierte Anpassung übersehen oder
> falsch eingestuft (Angststörung, Borderline, „hochsensibel"). Bei
> Erwachsenen wird das Muster Verwaltung: Formulare, Steuererklärung,
> Mikromanagement — glänzen bei selbstgewählten Projekten, Kollaps bei
> fremden Vorgaben, wiederkehrendes Burnout.
>
> **Beziehung ist der Schauplatz**
>
> Erwachsene beschreiben es so: Die Partnerin bittet, den Müll
> rauszubringen — und der Körper friert ein, obwohl man es *will*. Von
> außen sieht es kalt, trotzig oder passiv-aggressiv aus. Von innen: Panik,
> Scham, Erstarrung. Jahre falscher Deutung hinterlassen tiefe Scham und
> Beziehungstrauma — deshalb ist PDA fast immer auch ein Beziehungsthema.
>
> **Überlappungen**
>
> Mit ADHS (Anforderungsalarm trifft Interesse-Modus), AuDHD (Gas und
> Bremse gleichzeitig) und Komplextrauma (Vermeidung als gelernte
> Überlebensstrategie, Fawning, Scham über Blockaden) — die Grenzen sind
> fließend und werden erst erforscht.

### Stufe 3 · QuerLeser-Leseweg

Fortlaufende Lesestrecke, offline aus `atlasGraph` komponiert
(Kanten-Tour). Startknoten `p:pda`:

```text
p:pda
  → cat:vermeidung                    (das Feld, in dem es lebt)
  → zurueckgezogen / erstarrung       (die sichtbaren Symptome)
  → state:dorsal                      (die Notbremse dahinter)
  → stresskaskade: erstarrung         (wann das Nervensystem abschaltet)
  → p:pda-antworten                   (die vielen F's als Antwortspektrum)
  → p:pda-intern                      (warum die eigenen Forderungen am
                                       schwersten wiegen)
  → m:se                              (Titration & Pendeln als Gegenentwurf
                                       zum „Durchbeißen")
  → e:pendeln                         (die Übung, die Wahl eingebaut hat)
  → phase:stabilisierung              (warum Sicherheit vor Verarbeitung)
  → p:pda-autonomie                   (der Gegenpol: Sicherheit durch Wahlfreiheit)
  → state:ventral                     (wohin das führen darf)
  → p:pda-beziehung                   (wo das Muster am lautesten wird)
  → e:co-regulation                   (Sicherheit in Beziehung ohne Forderung)
```

## 4. Design-Prinzip „PDA-kompatibel" (für App + Briefs)

1. **Einladung statt Aufforderung** — keine Handlung, keine Übung, kein
   Text im Imperativ-Erwartungs-Ton. Angebote haben einen sichtbaren,
   jederzeit nutzbaren Ausstieg.
2. **Keine Druckmechanik** — keine Streaks, keine Push-Erinnerungen im
   Aufforderungston, keine Fortschrittsanzeigen, die implizit fordern.
   (Deckt sich mit der Regel „Würde vor Effekt".)
3. **Wahl einbauen, wo sie nicht nötig wäre** — zwei Wege statt einer
   Vorgabe. Pendeln ist das Muster: Annäherung mit Rückkehrrecht.
4. **Barriere ≠ Widerstand** — die magnetische Wegstoßung im Meer ist
   phänomenologisch genau die Demand-Flucht. In der Begegnungs-Copy als
   „Schutzreaktion" benennen, nie als „Widerstand gegen dich".
5. **Scham entschärfen** — jede Stelle, die Blockade beschreibt, benennt
   sie als Nervensystem-Schutz, nicht als Charaktereigenschaft.

## 5. Verifikation & offene Punkte

- [x] tsc: keine Fehler in den PDA-/Graph-Dateien (die 5 verbleibenden
      lokalen tsc-Fehler liegen in unveröffentlichten WIP-Änderungen in
      `src/ocean3d/` + `OceanStage.tsx` und sind vor dieser Arbeit
      entstanden)
- [x] Laufzeit-Probe: 139 Knoten / 395 Kanten / 0 Dangling-Edges;
      `neighborsOf("p:pda")` = 31 Nachbarn
- [ ] Kosmos-Screenshot (Profil-Knoten + Legende) — sobald der lokale
      ocean3d-WIP wieder grün ist (Vite-Boot hängt davon ab)
- [ ] Begegnungs-Copy: Barriere/Wegweisung als „Schutzreaktion"
      formulieren (Abschnitt 4, Punkt 4)
- [ ] Fachliche Gegenlesung der Stufe-2-Texte — Entwurf, keine
      therapeutische Freigabe
- [ ] Weitere Neuroprofile (z. B. AD(H)S-Profil, Hochsensibilität) —
      gleiche Struktur, eigenes Modul
