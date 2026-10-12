# Raumformen des vorhandenen Phänomenatlas-Netzes

Einstieg: Im bestehenden Kosmos „Netz formen“ wählen. Die vorherige Kosmoskarte bleibt erreichbar.

`GraphBodiesView` liest unverändert den referenzierten Atlasbestand (`atlasGraph`) oder den bestehenden persönlichen Ocean-Store. Es wird kein neuer Wissensgraph und kein Ersatzdatensatz erzeugt. Die Quelle wird ausdrücklich gewählt. Eine leere persönliche Konstellation bleibt leer.

`atlas-geometry.mjs` legt Positionen neben die Original-IDs. Atlasordnung, Kugelkörper, gefaltete Wand und Raumknoten enthalten dieselben Originalknoten und dieselben Kanten. Verformung und Knotenziehen schreiben weder neue Beziehungen noch fachliche Zustände. Kreuzungen erzeugen keine Kanten. Es werden keine fremden Meshknoten, Dreiecksflächen oder unabhängigen Kugel-/Wandmodelle als angeblicher Atlasgraph verwendet.

`atlas-space.mjs` zeichnet diese ursprünglichen Gegenstände in einer drehbaren räumlichen Canvas-Projektion. Die Detailfläche zeigt Originaltext und die tatsächlichen ein- und ausgehenden Beziehungen. Knoten der Referenzquelle werden an die bestehende NodeCard weitergereicht. Phänomen-Instanzen wählen mit `selectPhenomenon` das tatsächliche Meerobjekt; ihre `ph-*`-IDs werden nicht als Referenzknoten verwendet.

Die Aktualisierung des persönlichen Meeres wird auf fünf Momentaufnahmen pro Sekunde begrenzt; dabei bleiben Positionen, Vorschläge, gespeicherte Zuordnungen und signierte Arme mit Wachstum, Andockzustand und Grund erhalten. Ein gespeichertes `confirmed` bedeutet hier nur, dass die Quelle diese Zuordnung speichert: Es wird nicht behauptet, eine Person habe jeden dieser Einträge bewusst bestätigt.

Dies ist der notwendige räumliche Grundnachweis für PHÄNOMENAUTIK. Ein vollständiges Spiel mit Weltphysik, Barrieren, Rückübersetzung von Rätselhandlungen und verschachtelten Atlasräumen ist damit noch nicht implementiert.

Validierung am 12.10.2026: Der Originalbestand bei `77d7e56af874a01a8dfc058ac88ab72fa36ddd3f` wurde aus graph.ts und allen tatsächlichen Imports ausgeführt: 139 Knoten, 395 Kanten, keine ungültigen Endpunkte. Elf Geometrie-/Originalbindungsprüfungen bestanden einschließlich Richtungstreue und vollständiger Ocean-Metadaten. Die vier Netzformen wurden aus derselben Positions-/Kantenabbildung als SVG gerendert und visuell geprüft. Wrapper-Hooks, vorhandenes Auswahlrouting, 5-Hz-Sampling und Cleanup wurden mit kontrollierten Original-Store-/Rendereraufrufen geprüft.

Ein vollständiger React-/TSX-Build und ein Browser-Bedienlauf konnten in der Ausführungsumgebung nicht ausgeführt werden. Diese Integration wird deshalb als Draft übergeben; main wird nicht verändert.
