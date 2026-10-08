// Geteilte Halo-Textur (radialer Glow-Gradient), einmalig erzeugt.
// Wird von Bojen, Kapitel-Formationen und Armen genutzt — erscheint
// als additive Sprites auch in der Wasser-Reflexion.

import * as THREE from "three";

let haloTex: THREE.CanvasTexture | null = null;
export function getHaloTexture(): THREE.CanvasTexture {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255, 226, 176, 0.85)");
  g.addColorStop(0.25, "rgba(240, 190, 120, 0.34)");
  g.addColorStop(0.6, "rgba(200, 140, 70, 0.10)");
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

/** Vertikaler Lichtsäulen-Gradient (oben transparent → Mitte hell → unten weich). */
let shaftTex: THREE.CanvasTexture | null = null;
export function getShaftTexture(): THREE.CanvasTexture {
  if (shaftTex) return shaftTex;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255, 230, 190, 0)");
  g.addColorStop(0.55, "rgba(255, 224, 175, 0.35)");
  g.addColorStop(0.85, "rgba(255, 210, 150, 0.55)");
  g.addColorStop(1, "rgba(255, 200, 140, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  // horizontale Kanten weich
  const gx = ctx.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, "rgba(0,0,0,1)");
  gx.addColorStop(0.5, "rgba(0,0,0,0)");
  gx.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = gx;
  ctx.fillRect(0, 0, 64, 256);
  shaftTex = new THREE.CanvasTexture(c);
  return shaftTex;
}
