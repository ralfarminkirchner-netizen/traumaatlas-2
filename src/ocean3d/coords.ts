// Koordinaten-Brücke: 2D-Welt (5200×3200, Ursprung links oben) → 3D-Ebene (y-up).
// S = 0.02: Welt 104×64 Einheiten, Zentrum (2600,1600) → (0,0).

import { WORLD } from "../ocean/world";

export const S = 0.02;

export const w2x = (wx: number): number => (wx - WORLD.w / 2) * S;
export const w2z = (wy: number): number => (wy - WORLD.h / 2) * S;
export const x2w = (x: number): number => x / S + WORLD.w / 2;
export const z2w = (z: number): number => z / S + WORLD.h / 2;
