// Fog of War in 3D: Dunkelheit, die sich mit Fortschritt lichtet.
// Gleiche Semantik wie die 2D-Fassung (besuchte Inseln, eigene Phänomene
// und der Navigator-Startbereich sind frei), aber als Multiply-Canvas über
// der WebGL-Szene: Löcher folgen der projStore-Projektion (rAF, 60 fps).

import { useEffect, useRef } from "react";
import { islandById, getOceanState, stageOf } from "../ocean/world";
import { S } from "./coords";
import { projStore } from "./projStore";

const RES = 0.5; // halbe Auflösung reicht (weiche Verläufe)

export function FogOfWar3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const canvas = ref.current;
      if (!canvas) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(2, Math.floor(vw * RES));
      const h = Math.max(2, Math.floor(vh * RES));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d")!;
      const s = getOceanState();
      const stage = stageOf(s.progress);

      ctx.clearRect(0, 0, w, h);
      // Nebelschicht — etwas transparenter als 2D, damit die 3D-Tiefe lesbar bleibt
      ctx.fillStyle = "rgba(4, 10, 13, 0.62)";
      ctx.fillRect(0, 0, w, h);

      const hole = (sx: number, sy: number, rPx: number) => {
        const x = sx * RES;
        const y = sy * RES;
        const r = rPx * RES;
        if (r < 4) return;
        const g = ctx.createRadialGradient(x, y, r * 0.22, x, y, r);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
      };

      // besuchte Inseln sind dauerhaft gelichtet
      for (const id of s.progress.visited) {
        const isl = islandById.get(id);
        const pr = projStore.labels.get(id);
        if (isl && pr?.visible) hole(pr.sx, pr.sy, isl.r * S * 3.2 * pr.pxScale);
      }
      // eigene Phänomene leuchten ihre Umgebung frei (wächst mit der Stufe)
      const glowR = (340 + stage * 130) * S;
      for (const [, pr] of projStore.phen) {
        if (pr.visible) hole(pr.sx, pr.sy, glowR * pr.pxScale);
      }
      // Startbereich um den Navigator ist immer frei
      const nav = islandById.get("navigator")!;
      const navPr = projStore.labels.get("navigator");
      if (navPr?.visible) hole(navPr.sx, navPr.sy, nav.r * S * 4 * navPr.pxScale);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
      style={{ mixBlendMode: "multiply" }}
      aria-hidden="true"
    />
  );
}
