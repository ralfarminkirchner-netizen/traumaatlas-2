// Der Tauchgang: Leertaste halten / Cmd+Wheel / langer Druck (Touch) hält
// den Atem an — die Kamera sinkt unter die Oberfläche. sub = weiches
// Ein-/Austauchen (kein Ruck), depth = Tiefgang (länger halten = tiefer).
// Auftauchen jederzeit durch Loslassen, weich.

export const diveState = {
  /** Eingabe-Flag: Atem angehalten (Tauchen gewünscht) */
  held: false,
  /** geglättetes Eintauchen 0..1 (weich, kein Ruck) */
  sub: 0,
  /** Tiefgang 0..1 — rampet, solange gehalten (tiefere Wissensschichten) */
  depth: 0,
  /** QA: starrer Zustand (shot.mjs) */
  pinned: false,
};

/** pro Frame (aus dem headless Schwimmer-Treiber) */
export function stepDive(dt: number) {
  const d = diveState;
  if (d.pinned) return;
  // Eintauchen zügig, Auftauchen ruhiger — beides weich gedämpft
  const target = d.held ? 1 : 0;
  const rate = d.held ? 2.4 : 1.6;
  d.sub += (target - d.sub) * (1 - Math.exp(-rate * dt));
  if (Math.abs(d.sub - target) < 0.002) d.sub = target;
  // Tiefgang: länger halten = tiefer (2.6 s bis ganz), Rückholen zügiger
  if (d.held) d.depth = Math.min(1, d.depth + dt / 2.6);
  else d.depth = Math.max(0, d.depth - dt / 1.2);
}

/** Tiefgang-Stufe als Wort (HUD) */
export function diveStage(depth: number): string {
  if (depth < 0.33) return "Oberfläche";
  if (depth < 0.75) return "Schwelle";
  return "Tiefe";
}

// QA-/Debug-Spiegel
if (typeof window !== "undefined") {
  (window as unknown as { __ta3dive?: typeof diveState }).__ta3dive = diveState;
}
