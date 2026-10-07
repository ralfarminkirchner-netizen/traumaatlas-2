// Prägnante SVG-Symbole je Baustein — klare Strichglyphen statt generischer Bilder.
// Alle Glyphen auf 24×24-Raster, stroke = currentColor: Die Farbe steuert der Aufrufer.
// BlockSymbol rendert ein eigenes <svg> (HTML oder verschachtelt in SVG einsetzbar),
// GlyphPath liefert die rohen Pfade für direkte Einbettung in ein bestehendes <svg>.

import type { ReactNode } from "react";
import { exercises } from "@/data/v1/exercises";

/** Symbol-Schlüssel für eine beliebige Element-Id (Baustein, Übung oder Verfahren). */
export function symFor(id: string): SymbolKey {
  if (id in GLYPHS) return id as SymbolKey;
  const ex = exercises.find((e) => e.id === id);
  if (ex) return `fx-${ex.effect}` as SymbolKey;
  return "method";
}

export type SymbolKey =
  | "schlaf-ritual" | "schlaf-bett"
  | "bewegung-gehen" | "bewegung-kraft"
  | "sozial-kontakt" | "sozial-notfallplan"
  | "achtsamkeit-atem" | "achtsamkeit-tagebuch"
  | "alltag-struktur" | "alltag-pausen"
  | "fx-hyper" | "fx-hypo" | "fx-both"
  | "method";

const GLYPHS: Record<SymbolKey, ReactNode> = {
  // Festes Abendritual — Mondsichel mit Funken
  "schlaf-ritual": (
    <>
      <path d="M19.5 13.2A8 8 0 1 1 10.8 4.5a6.4 6.4 0 0 0 8.7 8.7Z" />
      <path d="M17.4 3.6v2.6M16.1 4.9h2.6" />
    </>
  ),
  // Bett nur zum Schlafen — Bett mit Kopfteil und Kissen
  "schlaf-bett": (
    <>
      <path d="M3.5 18.5V7.5" />
      <path d="M3.5 13.5h17v5" />
      <path d="M3.5 16h17" />
      <circle cx="7" cy="11" r="1.5" />
    </>
  ),
  // Täglicher Spaziergang — Punktweg durchs Gelände
  "bewegung-gehen": (
    <>
      <path d="M4 19c4.5-1.2 2.8-5.6 6.4-7.2S16.8 10.6 20 5" strokeDasharray="0.3 3.8" strokeWidth="2.4" />
      <circle cx="4" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // Sanfte Kraft & Dehnung — Gestalt, die sich aufrichtet und reckt
  "bewegung-kraft": (
    <>
      <circle cx="12" cy="5.6" r="1.7" />
      <path d="M12 9.5V20" />
      <path d="M12 12 6 8.5" />
      <path d="M12 12l6-3.5" />
      <path d="M8.5 20h7" />
    </>
  ),
  // Ein fester sicherer Kontakt — zwei Kreise, die sich überschneiden
  "sozial-kontakt": (
    <>
      <circle cx="9.1" cy="12" r="5.4" />
      <circle cx="14.9" cy="12" r="5.4" />
    </>
  ),
  // Notfallplan mit Menschen — Bake, die Licht gibt
  "sozial-notfallplan": (
    <>
      <path d="M9.8 20 11 9.5h2L14.2 20" />
      <path d="M7.5 20h9" />
      <path d="M12 9.5V7" />
      <path d="M5.6 6.4 7.8 8.2" />
      <path d="M18.4 6.4 16.2 8.2" />
      <path d="M4 11.5h2.4" />
      <path d="M17.6 11.5H20" />
    </>
  ),
  // Kurze Atem-Anker — ruhige Atemwelle
  "achtsamkeit-atem": (
    <>
      <path d="M3 12c2-4.6 4-4.6 6 0s4 4.6 6 0 4-4.6 6 0" />
      <circle cx="12" cy="5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // 3-Zeilen-Abendjournal — aufgeschlagenes Buch
  "achtsamkeit-tagebuch": (
    <>
      <path d="M12 6.6C10.1 5.1 7.1 4.9 4.6 5.9v11.9c2.5-1 5.5-.8 7.4.7 1.9-1.5 4.9-1.7 7.4-.7V5.9C16.9 4.9 13.9 5.1 12 6.6Z" />
      <path d="M12 6.6v11.9" />
      <path d="M6.8 9.2h2.6M6.8 12h2.6M14.6 9.2h2.6" />
    </>
  ),
  // Fester Tagesrhythmus — Raster mit einem verankerten Feld
  "alltag-struktur": (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.7" />
      <rect x="13" y="4" width="7" height="7" rx="1.7" fill="currentColor" stroke="none" />
      <rect x="4" y="13" width="7" height="7" rx="1.7" />
      <rect x="13" y="13" width="7" height="7" rx="1.7" />
    </>
  ),
  // Regelmäßige Dehnungs-Pausen — Pause-Zeichen im Kreis
  "alltag-pausen": (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.9 8.8v6.4" />
      <path d="M14.1 8.8v6.4" />
    </>
  ),
  // Übungswirkung „Beruhigen" — Wellen, die sich legen
  "fx-hyper": (
    <>
      <path d="M4 8.4c2-3 4-3 6 0s4 3 6 0 3.2-2.2 4-1.8" />
      <path d="M5 13.2c2-1.9 4-1.9 6 0s4 1.9 6 0 2.6-1.3 3-1" />
      <path d="M6.5 18h11" />
    </>
  ),
  // Übungswirkung „Aktivieren" — Funke, der aufsteigt
  "fx-hypo": (
    <>
      <path d="M12 20.5V10" />
      <path d="M8.3 13 12 9.4 15.7 13" />
      <path d="M12 6.6V4.2" />
      <path d="M6.8 8.2 5.5 6.9" />
      <path d="M17.2 8.2l1.3-1.3" />
    </>
  ),
  // Übungswirkung „Ausgleichen" — Kreis mit ruhiger Mittelwelle
  "fx-both": (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M5.2 12c2.3-2.7 4.5-2.7 6.8 0s4.5 2.7 6.8 0" />
    </>
  ),
  // Verfahren — Kompassnadel im Kreis
  method: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.8 14.3 12 12 17.2 9.7 12Z" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Rohpfade einer Glyphe — für Einbettung in ein bestehendes <svg> (z. B. Netz-Knoten). */
export function GlyphPath({ sym }: { sym: SymbolKey }) {
  return <>{GLYPHS[sym]}</>;
}

/** Eigenständiges Symbol-SVG (HTML-Kontext). Farbe via className/style (currentColor). */
export function BlockSymbol({ sym, className, strokeWidth = 1.7 }: { sym: SymbolKey; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {GLYPHS[sym]}
    </svg>
  );
}
