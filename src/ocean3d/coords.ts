// Koordinaten-Brücke: 2D-Welt (5200×3200, Ursprung links oben) → 3D-Ebene (y-up).
// S = 0.055: Welt 286×176 Einheiten, Zentrum (2600,1600) → (0,0).
// VIEL weitläufiger (vorher 0.02): die Inseln stehen weit auseinander, das
// Meer trägt die Strecke — die Welle bleibt dieselbe, die Welt wächst.

import { WORLD } from "../ocean/world";

export const S = 0.055;

export const w2x = (wx: number): number => (wx - WORLD.w / 2) * S;
export const w2z = (wy: number): number => (wy - WORLD.h / 2) * S;
export const x2w = (x: number): number => x / S + WORLD.w / 2;
export const z2w = (z: number): number => z / S + WORLD.h / 2;
