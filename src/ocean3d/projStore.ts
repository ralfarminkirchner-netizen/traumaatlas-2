// Geteilter Zustand zwischen 3D-Szene (schreibt pro Frame) und DOM-Overlays (lesen per rAF).
// Kein React-State: direkte Mutation, DOM-Seite setzt Styles selbst (60 fps ohne Re-Render).

export interface LabelProj {
  sx: number; // Bildschirm px
  sy: number;
  visible: boolean;
  scale: number; // Nähe-Skalierung für Schriftgröße
}

export const projStore = {
  /** Insel-Id → projizierte Position */
  labels: new Map<string, LabelProj>(),
  /** Phänomen-Id → projizierte Position */
  phen: new Map<string, { sx: number; sy: number; visible: boolean }>(),
  /** stille Mechanik: 0 = normal, 1 = ganz still */
  calm: 0,
  /** Klick auf eine 3D-Kapitel-Formation → OceanStage-Segelfluss */
  onSail: null as ((id: string) => void) | null,
};

// ── Ringwellen-Brücke: OceanStage meldet Wasser-Kontakte ─────
type RippleFn = (wx: number, wy: number, strength: number) => void;
let rippleFn: RippleFn | null = null;
export function registerRipple3D(fn: RippleFn | null) {
  rippleFn = fn;
}
/** Weltkoordinaten (2D-Welt 5200×3200), Stärke ~0..2 */
export function splat3D(wx: number, wy: number, strength = 1) {
  rippleFn?.(wx, wy, strength);
}

// QA-/Debug-Spiegel: Projektionen am Window lesbar (Bojen-Klick-Test etc.)
if (typeof window !== "undefined") {
  (window as unknown as { __ta3proj?: typeof projStore }).__ta3proj = projStore;
}
