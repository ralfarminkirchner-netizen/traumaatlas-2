// Aktuelle Welt — UI-Zustand (Schicht-1-Topologie bleibt unberührt).
// useSyncExternalStore + localStorage, Muster world.ts. PDA: Auswahl wird
// gespeichert, aber nie vorausgesetzt; Ausstieg jederzeit.

import { useSyncExternalStore } from "react";
import type { WeltId } from "./transduction";

const KEY = "ta6-welt-v1";

let current: WeltId = "meer";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    (window as unknown as { __ta6welt?: typeof dayStateMirror }).__ta6welt = dayStateMirror;
  }
}

/** QA-/Debug-Spiegel: Welt am Window lesen/stellbar (Probes). */
export const dayStateMirror: { welt: WeltId } = { welt: "meer" };

function read(): WeltId {
  if (typeof window === "undefined") return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "meer" || raw === "schatten" || raw === "orbital") return raw;
  } catch { /* ok */ }
  return "meer";
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  current = read();
  dayStateMirror.welt = current;
}

export function setWelt(welt: WeltId) {
  ensureInit();
  if (welt === current) return;
  current = welt;
  dayStateMirror.welt = welt;
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, welt);
  } catch { /* Speicher voll — ignorieren */ }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getWelt(): WeltId {
  ensureInit();
  return current;
}

export function useWelt(): WeltId {
  ensureInit();
  return useSyncExternalStore(subscribe, getWelt, () => "meer" as WeltId);
}
