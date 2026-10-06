// Zentraler UI-Store für TRAUMAATLAS 2 — Das Beziehungsuniversum.
// Ohne externe State-Lib, useSyncExternalStore. Eine Quelle der Wahrheit.

import { useSyncExternalStore } from "react";

export type ViewId =
  | "start"
  | "kosmos"
  | "koerper"
  | "polyvagal"
  | "kaskade"
  | "toleranz"
  | "navigator"
  | "lexikon"
  | "stammbaum"
  | "baukasten"
  | "wechsel"
  | "wegweiser";

export interface AtlasState {
  view: ViewId;
  /** Erregungswert -1..1 (negativ = Hypo, 0 = Fenster, positiv = Hyper) */
  arousal: number;
  /** aktuelle Stresskaskaden-Station 0..5, -1 = inaktiv */
  cascadeStep: number;
  cascadePlaying: boolean;
  /** ausgewählte Symptom-ids im Navigator */
  selectedSymptoms: string[];
  /** persönliches Programm (Baukasten): ids von Bausteinen/Übungen/Methoden */
  program: string[];
  /** gehoverte Region (Tooltip, SVG-Körper) */
  hoverRegion: string | null;
  /** fokussierte Region */
  focusRegion: string | null;
  /** Regionen, die im Navigator aufleuchten */
  highlightRegions: string[];
}

const initial: AtlasState = {
  view: "start",
  arousal: 0,
  cascadeStep: -1,
  cascadePlaying: false,
  selectedSymptoms: [],
  program: [],
  hoverRegion: null,
  focusRegion: null,
  highlightRegions: [],
};

type Listener = () => void;

let state: AtlasState = initial;
const listeners = new Set<Listener>();

export function getState(): AtlasState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(partial: Partial<AtlasState>): void {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn());
}

export function useAtlasState(): AtlasState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Programm umschalten (Idempotent) */
export function toggleProgramItem(id: string): void {
  const program = state.program.includes(id)
    ? state.program.filter((p) => p !== id)
    : [...state.program, id];
  setState({ program });
}
