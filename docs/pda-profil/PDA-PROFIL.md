# PDA-Profil — Knotenblock für den Neuroatlas (Übernahme-Entwurf)

Status: **Entwurf zur Übernahme** · Datum: 2026-10-11
Betrifft: `src/data/graph.ts` (neuer NodeType + EdgeType + Merge-Schritt),
KiNFORMER-Befund-Tiefe, QuerLeser-Leseweg, App-Copy.

---

## 1. Einordnung & wissenschaftlicher Stand

PDA steht für **Pathological Demand Avoidance** — von vielen Betroffenen
inzwischen umbenannt in **Pervasive Drive for Autonomy**. Beschrieben wurde
das Muster in den 1980ern von Elizabeth Newson (UK) an autistischen Kindern.
Heute wird es als **Profil innerhalb von Autismus** verstanden, zunehmend
auch mit ADHS assoziiert; es ist **kein eigenständiger Diagnose-Code** in
DSM-5-TR oder ICD-11. Deshalb im Atlas als *Profil* führen, nicht als
Diagnose — das trägt die offene wissenschaftliche Einordnung ehrlich:
Ob PDA ein eigenes Muster ist oder eine extreme Ausprägung von
Erregungsdysregulation bei hochsensibler Neurozeption, ist ungeklärt.

Kern des Profils: **Alltagsanforderungen — auch selbst auferlegte, auch
eigentlich gewollte — lösen eine Bedrohungsreaktion aus.** Nicht Trotz,
sondern Neurozeption: Das Nervensystem klassifiziert Kontrollverlust als
Gefahr und schaltet auf Kampf, Flucht, Erstarrung oder Fawning. Die
Community fasst es als **„Can't, not won't"**: ein neurologischer Block,
keine Entscheidung. Daraus folgt zentral: Belohnungs- und Drucksysteme
wirken nicht und verstärken die Bedrohung.

## 2. Datenmodell-Vorschlag

### 2.1 Erweiterungen in `src/data/graph.ts`

Neuer NodeType (in `NodeType` und `nodeTypeMeta`):

```ts
| "profile"
```

```ts
profile: {
  label: "Neuroprofile",
  color: "#a98fc7",
  soft: "rgba(169,143,199,0.16)",
  blurb: "Muster des Nervensystems, die über einzelne Diagnosen hinweg beschrieben werden",
},
```

Neuer EdgeType (in `EdgeType` und `edgeTypeLabels`) — nötig, weil kein
bestehender Typ Profil↔Phänomen abbildet:

```ts
| "profil"
```

```ts
profil: "kommt vor bei / prägt",
```

ID-Konvention (passend zum Bestand): Profil-Knoten bekommen Präfix `p:`.

### 2.2 Knoten

| ID | Label | Sub | Erregung | Summary |
|----|-------|-----|----------|---------|
| `p:pda` | PDA-Profil | Pervasive Drive for Autonomy | both | Anforderungen — auch innere, auch gewollte — wirken als Bedrohung; Autonomie ist Sicherheit. Kein Diagnose-Code, ein Muster. |
| `p:pda-anforderung` | Anforderung als Bedrohung | Kernmechanismus | both | Neurozeption prüft jede Forderung unbewusst auf Kontrollverlust — das Nervensystem antwortet mit Alarm statt mit Willen. |
| `p:pda-autonomie` | Autonomie als Sicherheit | Gegenpol | — | Wo Wahlmöglichkeit, Tempovorrecht und Ausstieg offen sind, sinkt der Alarm. Sicherheit entsteht durch Selbstwirksamkeit. |

### 2.3 Kanten

```text
p:pda                  —profil→     cat:vermeidung        (Hauptfeld: Vermeidung & Rückzug)
p:pda                  —profil→     erstarrung            (Blockade / Freeze bei Forderung)
p:pda                  —profil→     panik                 (akuter Alarm bei Überforderung)
p:pda                  —profil→     reizbar               (Kampf-Modus als Abwehr)
p:pda                  —profil→     konzentration         (Demand-Load frisst Arbeitsgedächtnis)
p:pda                  —profil→     hypervigilanz         (Dauer-Scan nach Forderungen)
p:pda                  —profil→     zurueckgezogen        (Rückzug als Selbstschutz)
p:pda                  —profil→     scham                 (Folgescham über „Blockaden“)
p:pda                  —fundierung→ m:polyvagal           (Neurozeption als Erklärungsmodell)
p:pda                  —phase→      phase:stabilisierung  (braucht zuerst Sicherheit, nie Überwindung)
p:pda-anforderung      —erregung→   state:sympathikus     (Alarm-Modus bei Forderung)
p:pda-anforderung      —erregung→   state:dorsal          (Blockade / Shutdown bei Forderung)
p:pda-autonomie        —zielzustand→ state:ventral        (Wahlfreiheit → Sicherheitszustand)
e:pendeln              —reguliert→  p:pda                 (Pendeln = eingebaute Wahl zwischen Anstrengung und Ressource)
e:sicherer-ort         —reguliert→  p:pda                 (selbstgewählter Rückzugsort, tempo-offen)
e:orientieren          —reguliert→  p:pda                 (Orientierung statt Anforderung)
e:co-regulation        —reguliert→  p:pda                 (Sicherheit in Beziehung ohne Forderung)
m:narm                 —behandlt→   p:pda                 (beziehungsorientiert, ohne Überforderung)
m:se                   —behandlt→   p:pda                 (Titration: dosiert statt durch Überwinden)
m:dbt                  —behandlt→   p:pda                 (Skills als Angebot, nicht als Zielvorgabe)
```

Begründung der kuratierten Symptom-Überlappungen: Diese sieben Symptome
sind die im Profil am häufigsten berichteten Ausprägungen — Anforderungen
zeigen sich bei unterschiedlichen Menschen als Erstarrung, Panik, Reizbarkeit,
Konzentrationsbruch oder Rückzug; die Scham darüber ist fast universell
(„Warum schaffen andere das Einfachste?").

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

Komponiert aus den bestehenden Datenfeldern (hint/arousal/tags,
when/goal/minutes/context, what/how/founder/year/phases) plus
Graph-Nachbarschaft via `neighborsOf`.

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
> Flopping (physisch „abschalten").
>
> **Warum Belohnung und Bestrafung scheitern**
>
> Beides ist aus Sicht des Nervensystems eine zusätzliche Anforderung mit
> Erwartung — also Alarmverstärker. Was wirkt: radikale Akzeptanz,
> eingebaute Wahlmöglichkeiten, Titration (dosierte Kleinstschritte mit
> Rückkehrrecht) und die Entschärfung der Erwartung selbst.
>
> **Beziehung ist der Schauplatz**
>
> Erwachsene beschreiben es so: Die Partnerin bittet, den Müll
> rauszubringen — und der Körper friert ein, obwohl man es *will*. Von
> außen sieht es kalt, trotzig oder passiv-aggressiv aus. Von innen: Panik,
> Scham, Erstarrung. Jahre falscher Deutung (Trotz, Desinteresse,
> „böswillig") hinterlassen tiefe Scham und Beziehungstrauma — deshalb ist
> PDA fast immer auch ein Beziehungsthema.

### Stufe 3 · QuerLeser-Leseweg

Fortlaufende Lesestrecke, offline aus `atlasGraph` komponiert
(Kanten-Tour). Vorschlag für den Startknoten `p:pda`:

```text
p:pda
  → cat:vermeidung                    (das Feld, in dem es lebt)
  → zurueckgezogen / erstarrung       (die sichtbaren Symptome)
  → state:dorsal                      (die Notbremse dahinter)
  → stresskaskade: erstarrung         (wann das Nervensystem abschaltet)
  → m:se                              (Titration & Pendeln als Gegenentwurf
                                       zum „Durchbeißen")
  → e:pendeln                         (die Übung, die Wahl eingebaut hat)
  → phase:stabilisierung              (warum Sicherheit vor Verarbeitung)
  → p:pda-autonomie                   (der Gegenpol: Sicherheit durch Wahlfreiheit)
  → state:ventral                     (wohin das führen darf)
```

## 4. Design-Prinzip „PDA-kompatibel" (für App + Briefs)

1. **Einladung statt Aufforderung** — keine Handlung, keine Übung, kein
   Text im Imperativ-Erwartungs-Ton. Angebote haben einen sichtbaren,
   jederzeit nutzbaren Ausstieg.
2. **Keine Druckmechanik** — keine Streaks, keine Push-Erinnerungen im
   Aufforderungston, keine Fortschrittsanzeigen, die implizit fordern.
   (Deckt sich mit der bestehenden Regel „Würde vor Effekt".)
3. **Wahl einbauen, wo sie nicht nötig wäre** — zwei Wege statt einer
   Vorgabe. Pendeln ist das Muster: Annäherung mit Rückkehrrecht.
4. **Barriere ≠ Widerstand** — die magnetische Wegstoßung im Meer ist
   phänomenologisch genau die Demand-Flucht. In der Begegnungs-Copy als
   „Schutzreaktion" benennen, nie als „Widerstand gegen dich".
5. **Scham entschärfen** — jede Stelle, die Blockade beschreibt, benennt
   sie als Nervensystem-Schutz, nicht als Charaktereigenschaft.

## 5. Übernahme-Checkliste

- [ ] `NodeType` + `EdgeType` erweitern, `nodeTypeMeta`/`edgeTypeLabels`
      ergänzen (Abschnitt 2.1)
- [ ] `pda.ts` (nebenliegend) importieren; Knoten in `buildGraph()`
      mergen oder als eigenen Block anhängen (`...pdaNodes`), Kanten
      analog (`pushEdge`-Schleife über `pdaEdges`)
- [ ] Farbe `#a98fc7` in `nodeTypeMeta` — auf Tageszeiten-Lesbarkeit
      prüfen (Dawn/Dusk) via `qa/shot.mjs`-Szenario
- [ ] KiNFORMER-Texte (Abschnitt 3) in `seaBefund`-Datenpfad einbauen
- [ ] QuerLeser-Tour (Abschnitt 3, Stufe 3) als Leseweg-Definition
      erfassen (interne Ansicht, offline komponiert)
- [ ] Begegnungs-Copy: Barriere/Wegweisung als „Schutzreaktion"
      formulieren (Abschnitt 4, Punkt 4)
- [ ] `probe-rm`/Graph-Probe erweitern: `neighborsOf("p:pda")` liefert
      erwartete Nachbarn (Sanity-Check nach Merge)
- [ ] Fachliche Gegenlesung der Stufe-2-Texte (Abschnitt 3) — Entwurf,
      keine therapeutische Freigabe
