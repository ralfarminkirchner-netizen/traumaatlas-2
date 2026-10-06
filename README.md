# TRAUMAATLAS 2 — Das Beziehungsuniversum

Kompletter visueller und konzeptioneller Neubau des TRAUMAATLAS:
Ein begehbarer Beziehungskosmos über Traumafolgen, das Nervensystem und Wege der Heilung.

## Kern

- **Der große Graph** (Herzstück): 124 Knoten / 329 typisierte Kanten als WebGL-Force-Konstellation
  (three.js / @react-three/fiber, eigene Spring-Physik). Hover-Linse, Orbit-Detailkarten mit
  Mini-Subgraph, drei Modi (Konstellation / Stammbaum / Thema), Chronologie- und Pfad-Animation.
- **10 visuelle Kapitel**: Start (Partikelnebel + Seidenkörper-Shader), Stresskaskade,
  Polyvagal (morphende Zonen-Shader + Radar), Toleranzfenster (verformbares 3D-Wellenband),
  Symptom-Navigator (Live-Sankey + Körperregionen-Glow), Übungs-Lexikon, Stammbaum
  (Scroll-Kamerafahrt durch 2.500 Jahre), Programm-Baukasten (Drag & Drop + Live-Verbindungslinien),
  Wechselwirkungen (Synergie-Netz + blinde Flecken), Wegweiser.

## Technik

React 19 + TypeScript (strict) + Vite 7 + Tailwind + shadcn/ui · three.js via @react-three/fiber
+ drei · framer-motion · eigene GLSL-Shader (FBM-Noise, Fresnel, Frost-Kristall).

Graceful degradation: kein WebGL2 oder `prefers-reduced-motion` → vollständig lesbare
statische SVG-/2D-Zustände. Akut-Leiste und Disclaimer global.

## Daten

Unverändert aus Version 1 (`src/data/*`): 36 Disziplinen, 16 Verfahren, 32 Symptome (6 Kategorien),
12 Übungen, Polyvagal-/Toleranzfenster-/Stresskaskade, 10 Bausteine, 8 Synergie-Regeln,
Blinde-Flecken-Logik, Wegweiser-Ressourcen.

## Kommandos

```bash
npm run dev      # Entwicklungsserver
npm run build    # Produktionsbuild → dist/
node qa-atlas2.mjs  # Playwright-Smoke über alle Bereiche
```

Hinweis: Der Atlas dient der Orientierung und ersetzt keine Psychotherapie.
