// Insel-Identitäten: jede der 10 Inseln bekommt eine unverwechselbare
// Silhouette (Shape-Typ), passend zu ihrem Kapitel. Eine einzige CPU-
// Höhenfunktion speist Geometrie, Vertexfarben, Mikrodetails und
// Licht-Anker — deterministisch geseedet pro Insel.

import type { IslandId } from "../ocean/world";

// ── Deterministisches Value-Noise (CPU) ──────────────────────────────────────

export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hash2(ix: number, iz: number, seed: number): number {
  let h = ix * 374761393 + iz * 668265263 + seed * 2246822519;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** Ridge-FBM: scharfe Kämme */
export function ridgeFbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    const n = vnoise(x * freq, z * freq, seed + o * 131);
    const ridge = Math.pow(1 - Math.abs(2 * n - 1), 2);
    sum += ridge * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum; // ~0..1.1
}

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ── Shape-Typen & Spezifikationen ────────────────────────────────────────────

export type ShapeType =
  | "dome"      // generischer Kuppel-Fels (Fallback / alter Look)
  | "dune"      // sanfte, langgestreckte Düne
  | "twins"     // Zwillingsgipfel mit verbindendem Kamm
  | "terraces"  // Terrassen, die zu einer Seite abfallen
  | "stack3"    // drei gestapelte Plateaus
  | "atoll"     // niedriger Ring mit ruhiger Lagune
  | "gate"      // Massiv mit tiefem Tor-Einschnitt
  | "spire"     // hohe Felsnadel mit kleineren Zeugen
  | "mesa"      // eckiges, gestuftes Block-Plateau
  | "split"     // zwei Landkörper mit schmalem Kanal
  | "cliff";    // sanfter Rücken, steile Kliffkante

export interface ShapeSpec {
  shape: ShapeType;
  /** Gipfelhöhe = Radius × hMul */
  hMul: number;
  /** Richtung asymmetrischer Merkmale (rad, lokaler XZ-Rahmen) */
  rot: number;
  /** Küstenrauheit (Skala ~0.5–1.3) */
  rough: number;
  /** Fels-Strata-Stärke 0..1 (0 = keine Bänder) */
  strata: number;
  /** Votivlicht-Anker: lokale XZ-Fraktion des Radius (Höhe kommt aus der Heightmap) */
  light: [number, number, number];
}

/**
 * Die Identitäts-Tabelle. Jede Insel eine eigene Silhouette:
 * kosmos = Zwillingsgipfel (verbundene Knoten), kaskade = fallende Terrassen,
 * polyvagal = drei Ebenen, toleranz = ruhige Lagune (das Fenster),
 * navigator = sanfte Heimat-Düne, lexikon = Tor-Massiv (die stille Tür),
 * stammbaum = Ahnen-Nadeln, baukasten = Block-Plateau, wechsel = Kanal-Insel,
 * wegweiser = Kliff mit Orientierungskante.
 */
export const ISLAND_SPECS: Record<IslandId, ShapeSpec> = {
  kosmos:    { shape: "twins",    hMul: 0.62, rot: -0.60, rough: 1.00, strata: 0.8, light: [0.00, 0.00, 0] },
  kaskade:   { shape: "terraces", hMul: 0.50, rot: 0.42,  rough: 0.85, strata: 1.0, light: [-0.32, -0.14, 0] },
  polyvagal: { shape: "stack3",   hMul: 0.55, rot: 0.0,   rough: 0.80, strata: 0.9, light: [0.00, 0.00, 0] },
  toleranz:  { shape: "atoll",    hMul: 0.26, rot: -0.35, rough: 0.70, strata: 0.0, light: [0.89, -0.33, 0] },
  navigator: { shape: "dune",     hMul: 0.34, rot: 0.30,  rough: 0.60, strata: 0.0, light: [0.00, 0.00, 0] },
  lexikon:   { shape: "gate",     hMul: 0.48, rot: -2.87, rough: 0.90, strata: 0.7, light: [-0.24, -0.07, 0] },
  stammbaum: { shape: "spire",    hMul: 1.00, rot: 0.90,  rough: 0.95, strata: 0.9, light: [0.26, 0.20, 0] },
  baukasten: { shape: "mesa",     hMul: 0.44, rot: 0.35,  rough: 0.60, strata: 0.8, light: [0.00, 0.00, 0] },
  wechsel:   { shape: "split",    hMul: 0.46, rot: 0.60,  rough: 1.00, strata: 0.7, light: [-0.30, -0.20, 0] },
  wegweiser: { shape: "cliff",    hMul: 0.60, rot: 2.69,  rough: 0.85, strata: 0.9, light: [-0.09, 0.04, 0] },
};

/** Gipfelhöhe einer Insel (für Label-Anker, Lichter, Kamera). */
export function specPeakY(spec: ShapeSpec, radius: number): number {
  return radius * spec.hMul + 0.12;
}

/** Lokale XZ-Position des Votivlicht-Ankers (Welteinheiten). */
export function specLightXZ(spec: ShapeSpec, radius: number): [number, number] {
  return [spec.light[0] * radius, spec.light[1] * radius];
}

// ── Höhenfunktion ────────────────────────────────────────────────────────────

/**
 * Höhe der Insel an lokaler Position (x, z) in Welteinheiten.
 * radius = Inselradius (isl.r * S); die Funktion deckt Patch ±radius×1.4 ab,
 * inklusive Unterwasser-Shelf. Rückgabe: y (Wasserlinie = 0).
 */
export function islandHeight(spec: ShapeSpec, x: number, z: number, seed: number, radius: number): number {
  const R = radius * 1.4;
  const u = x / R;
  const v = z / R;
  const r = Math.hypot(u, v);
  const ang = Math.atan2(v, u);
  const peakH = radius * spec.hMul;

  // Küstenlinie: Basis-Oktave + Mikrovariation (zweite, feinere Oktave)
  const n1 = vnoise(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, seed);
  const n2 = vnoise(Math.cos(ang) * 5.9 + 9.3, Math.sin(ang) * 5.9 + 9.3, seed + 31);
  const coast = 0.80 + (n1 - 0.5) * 0.26 * spec.rough + (n2 - 0.5) * 0.11 * spec.rough;
  const rc = r / coast;

  const dirX = Math.cos(spec.rot);
  const dirZ = Math.sin(spec.rot);
  const a = u * dirX + v * dirZ;   // entlang der Form-Achse
  const b = -u * dirZ + v * dirX;  // quer dazu

  const shelf = (q: number) => -0.18 - (q - 1) * 2.2;
  const skirt = 0.10 * Math.max(0, 1 - rc);

  switch (spec.shape) {
    case "dome": {
      if (rc >= 1) return shelf(rc);
      const ridge = ridgeFbm(x * 0.55 + 11, z * 0.55 + 11, seed);
      const profile = Math.pow(Math.max(0, 1 - rc), 0.62);
      return profile * (0.42 + 0.58 * Math.min(1, ridge)) * peakH + 0.12 * (1 - rc);
    }

    case "dune": {
      // langgestreckte, weiche Kuppe entlang der Achse
      const rd = Math.hypot(a / 1.55, b * 1.02) / coast;
      if (rd >= 1) return shelf(rd);
      const n = vnoise(a * 3.1 + 7, b * 3.1 + 7, seed + 7);
      const fine = ridgeFbm(x * 0.42 + 3, z * 0.42 + 3, seed, 3);
      const base = Math.pow(Math.max(0, 1 - rd), 1.08);
      return base * (0.74 + 0.26 * n) * peakH + base * base * 0.10 * fine * peakH + 0.10 * (1 - rd);
    }

    case "twins": {
      // zwei Kuppen auf der Achse, durch einen Kamm verbunden
      const d1 = Math.hypot(a + 0.34, b / 0.80) / (0.68 * coast);
      const d2 = Math.hypot(a - 0.36, b / 0.74) / (0.62 * coast);
      const ridge = ridgeFbm(x * 0.62 + 11, z * 0.62 + 11, seed);
      const h1 = Math.pow(Math.max(0, 1 - d1), 0.70) * (0.50 + 0.50 * Math.min(1, ridge * 1.15));
      const h2 = Math.pow(Math.max(0, 1 - d2), 0.76) * (0.50 + 0.50 * Math.min(1, ridge)) * 0.74;
      let h = Math.max(h1, h2) + 0.34 * Math.min(h1, h2); // weiches Maximum → Kamm
      h *= sstep(1.10, 0.90, rc);
      if (rc >= 1 && h <= 0.02) return shelf(rc);
      return h * peakH + skirt;
    }

    case "terraces": {
      if (rc >= 1) return shelf(rc);
      // fällt nach +a hin ab (Richtung rot)
      const profile = Math.pow(Math.max(0, 1 - rc), 0.66);
      const slope = 0.30 + 0.70 * sstep(-0.95, 0.50, a);
      const raw = profile * slope;
      const q = 4.5;
      const f = raw * q;
      const i = Math.floor(f);
      const frac = f - i;
      const terr = (i + sstep(0.58, 0.92, frac)) / q; // flache Tritte, kurze Steilkanten
      const grain = ridgeFbm(x * 0.4 + 5, z * 0.4 + 5, seed, 2);
      return terr * (0.62 + 0.38 * grain) * peakH + skirt;
    }

    case "stack3": {
      if (rc >= 1) return shelf(rc);
      const ridge = ridgeFbm(x * 0.5 + 5, z * 0.5 + 5, seed, 3);
      const l1 = 0.38 * sstep(1.02, 0.90, rc);
      const l2 = 0.31 * sstep(0.68, 0.56, rc);
      const l3 = 0.31 * sstep(0.40, 0.30, rc);
      return (l1 + l2 + l3) * (0.94 + 0.06 * ridge) * peakH + skirt;
    }

    case "atoll": {
      const rcR = 0.68;
      const w = 0.20;
      const d = Math.abs(rc - rcR);
      const land = sstep(w, w * 0.42, d);
      const ridge = ridgeFbm(x * 0.7 + 8, z * 0.7 + 8, seed, 3);
      // Votiv-Anhöhe auf dem Ring (Richtung rot)
      const ga = Math.atan2(Math.sin(ang - spec.rot), Math.cos(ang - spec.rot));
      const bump = Math.exp(-(ga * ga) / 0.42) * sstep(w * 1.25, w * 0.35, d) * 1.1;
      const hLand = land * (0.40 + 0.50 * ridge + bump) * peakH;
      // Wasserflächen: Lagune innen, seichter Saum außen, Shelf hinter der Küste
      const water = rc >= 1 ? shelf(rc) : rc < rcR ? -0.34 - Math.max(0, rcR - w - rc) * 0.9 : -0.16 - Math.max(0, rc - rcR - w) * 1.8;
      return land > 0.004 ? Math.max(hLand, water) : water;
    }

    case "gate": {
      if (rc >= 1) return shelf(rc);
      const profile = Math.pow(Math.max(0, 1 - rc), 0.70);
      const ridge = ridgeFbm(x * 0.55 + 11, z * 0.55 + 11, seed);
      const massif = profile * (0.50 + 0.50 * Math.min(1, ridge)) * peakH;
      // Tor: von der Küste (+a) bis fast ins Zentrum eingeschnitten
      const gateW = 0.15 * (1 + 0.45 * sstep(0.1, 0.95, a));
      const cross = Math.abs(b);
      const mask = sstep(gateW, gateW * 0.40, cross) * sstep(-0.16, 0.06, a) * sstep(1.12, 0.86, a);
      return massif * (1 - 0.97 * mask) + mask * 0.045 * peakH + skirt;
    }

    case "spire": {
      const ridge = ridgeFbm(x * 0.9 + 4, z * 0.9 + 4, seed, 4);
      const rr = r / (0.50 * coast);
      const main = Math.pow(Math.max(0, 1 - rr), 1.75) * (0.74 + 0.26 * ridge) * peakH;
      // zwei kleinere Zeugen-Nadeln
      const s1x = Math.cos(spec.rot + 2.1) * 0.50 * R;
      const s1z = Math.sin(spec.rot + 2.1) * 0.50 * R;
      const s2x = Math.cos(spec.rot - 2.4) * 0.56 * R;
      const s2z = Math.sin(spec.rot - 2.4) * 0.56 * R;
      const d1 = Math.hypot(x - s1x, z - s1z) / (0.15 * R);
      const d2 = Math.hypot(x - s2x, z - s2z) / (0.12 * R);
      const sat1 = Math.pow(Math.max(0, 1 - d1), 2.1) * 0.36 * peakH;
      const sat2 = Math.pow(Math.max(0, 1 - d2), 2.1) * 0.24 * peakH;
      let h = Math.max(main, sat1, sat2);
      h *= sstep(1.06, 0.88, rc);
      if (rc >= 1 && h <= 0.02) return shelf(rc);
      return h + skirt;
    }

    case "mesa": {
      // rotierte Chebyshev-Metrik → eckige Silhouette
      const edge = vnoise(a * 6 + 1, b * 6 + 1, seed + 3) - 0.5;
      const rcB = Math.max(Math.abs(a), Math.abs(b) * 1.12) / (0.70 + 0.05 * edge * spec.rough);
      if (rcB >= 1.3) return shelf(Math.max(rc, rcB * 0.85));
      const apron = 0.16 * sstep(1.28, 1.06, rcB);
      const body = 0.42 * sstep(1.02, 0.90, rcB);
      const top = 0.42 * sstep(0.66, 0.54, rcB);
      const grain = ridgeFbm(x * 0.6 + 2, z * 0.6 + 2, seed, 2);
      return (apron + body + top) * peakH + 0.015 * grain * peakH + skirt * sstep(1.3, 1.05, rcB);
    }

    case "split": {
      const d1 = Math.hypot(a + 0.36, b) / (0.50 * coast);
      const d2 = Math.hypot(a - 0.38, b) / (0.46 * coast);
      const ridge = ridgeFbm(x * 0.58 + 9, z * 0.58 + 9, seed);
      const h1 = Math.pow(Math.max(0, 1 - d1), 0.68) * (0.50 + 0.50 * Math.min(1, ridge));
      const h2 = Math.pow(Math.max(0, 1 - d2), 0.72) * (0.50 + 0.50 * Math.min(1, ridge)) * 0.82;
      let h = Math.max(h1, h2);
      // Kanal zwischen den Körpern — schneidet unter die Wasserlinie
      const carve = Math.exp(-((a / 0.085) * (a / 0.085)));
      h = h * (1 - 0.98 * carve) - carve * 0.12;
      h *= sstep(1.10, 0.92, rc);
      if (rc >= 1 && h <= 0.02) return shelf(rc);
      return h * peakH + skirt;
    }

    case "cliff": {
      if (rc >= 1) return shelf(rc);
      const profile = Math.pow(Math.max(0, 1 - rc), 0.55);
      const ridge = ridgeFbm(x * 0.5 + 6, z * 0.5 + 6, seed, 3);
      const dome = profile * (0.55 + 0.45 * ridge);
      // sanfter Anstieg von -a, steile Abbruchkante jenseits a≈0.35
      const cut = sstep(0.48, 0.30, a);
      const raw = dome * cut;
      return 0.92 * Math.tanh(raw / 0.92) * peakH + 0.10 * (1 - rc) * sstep(0.55, 0.36, a);
    }
  }
}
