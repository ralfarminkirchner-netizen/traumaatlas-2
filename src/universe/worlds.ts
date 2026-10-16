// Welt-Registry: jede Welt = { Metrik-Profil, Transduktion, Haut, Status }.
// „orbital" ist bewusst Profil-Eintrag ohne Renderer (Weltensystem-Brief).

import { METRIKEN, type MetrikProfil } from "./metrics";
import { HAT_TRANSDUKTION, type WeltId } from "./transduction";

export interface WeltDef {
  id: WeltId;
  label: string;
  kicker: string;
  /** Einladungs-Text des Weltwechsels (PDA: anbieten, nie verlangen) */
  einladung: string;
  rueckweg: string;
  metrik: MetrikProfil;
  hatTransduktion: boolean;
  status: "aktiv" | "profil";
}

export const WELTEN: Record<WeltId, WeltDef> = {
  meer: {
    id: "meer",
    label: "Tageswelt",
    kicker: "die Karte der Phänomene",
    einladung: "Dieselbe Karte hat eine zweite Lesart — die Schattenwelt?",
    rueckweg: "",
    metrik: METRIKEN.meer,
    hatTransduktion: HAT_TRANSDUKTION.meer,
    status: "aktiv",
  },
  schatten: {
    id: "schatten",
    label: "Schattenwelt",
    kicker: "die Karte der Schutzfunktionen",
    einladung: "Zurück in die Tageswelt?",
    rueckweg: "Die Tageswelt bleibt genau dort, wo du sie verlassen hast.",
    metrik: METRIKEN.schatten,
    hatTransduktion: HAT_TRANSDUKTION.schatten,
    status: "aktiv",
  },
  orbital: {
    id: "orbital",
    label: "Orbital",
    kicker: "dieselbe Karte, auseinandergezerrt",
    einladung: "",
    rueckweg: "",
    metrik: METRIKEN.orbital,
    hatTransduktion: HAT_TRANSDUKTION.orbital,
    status: "profil",
  },
};

export const WELT_REIHENFOLGE: WeltId[] = ["meer", "schatten"];
