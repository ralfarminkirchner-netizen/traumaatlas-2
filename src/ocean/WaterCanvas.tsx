// Verwaltet die Wasser-Fläche: WebGL2-Fluid oder 2D-Fallback.
// Exportiert eine schlanke API für Kielwasser, Leuchten und ruhiges Wasser.

import { useEffect, useRef } from "react";
import { FluidSim, canRunFluid, type WaterView } from "./fluid";
import { Flow2D } from "./flow2d";
import { ISLANDS, getOceanState, stageOf } from "./world";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Engine = FluidSim | Flow2D | null;

let engine: Engine = null;
let fluidMode = false;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function waterSplat(x: number, y: number, dx: number, dy: number, color: [number, number, number], radius: number, amount = 0.35) {
  if (!engine) return;
  if (fluidMode && engine instanceof FluidSim) {
    engine.splat({ x, y, dx, dy, color, radius, amount });
  } else if (engine instanceof Flow2D) {
    engine.splat();
  }
}

export function setWaterCalm(calm: boolean) {
  if (engine instanceof FluidSim) engine.calm = calm;
}

export function isFluidActive() {
  return fluidMode && engine instanceof FluidSim;
}

export function WaterCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let viewRaf = 0;

    const useFluid = !reduced && canRunFluid();
    fluidMode = useFluid;

    if (useFluid) {
      try {
        engine = new FluidSim(canvas);
        engine.start();
        // Erste Lebensspur, damit das Meer nie tot startet
        for (let i = 0; i < 6; i++) {
          engine.splat({
            x: 0.2 + Math.random() * 0.6,
            y: 0.25 + Math.random() * 0.5,
            dx: (Math.random() - 0.5) * 900,
            dy: (Math.random() - 0.5) * 900,
            color: [0.4, 0.34, 0.22],
            radius: 0.003,
            amount: 0.1,
          });
        }

        // Welt-Blick pro Frame in die Oberfläche speisen (Kamera, Inseln, Glow)
        const view: WaterView = {
          camX: 2600, camY: 1600, zoom: 0.62,
          vw: canvas.width, vh: canvas.height,
          islands: new Float32Array(ISLANDS.length * 4),
          islandCols: new Float32Array(ISLANDS.length * 3),
        };
        ISLANDS.forEach((isl, i) => {
          const [r, g, b] = hexToRgb(isl.ground[2]);
          view.islandCols[i * 3] = r;
          view.islandCols[i * 3 + 1] = g;
          view.islandCols[i * 3 + 2] = b;
        });
        (engine as FluidSim).view = view;
        const updateView = () => {
          const s = getOceanState();
          const cam = s.cam;
          const cssW = canvas.clientWidth || 1;
          const cssH = canvas.clientHeight || 1;
          const dpr = canvas.width / cssW;
          view.camX = cam.x;
          view.camY = cam.y;
          view.zoom = cam.zoom;
          view.vw = canvas.width;
          view.vh = canvas.height;
          const stage = stageOf(s.progress);
          ISLANDS.forEach((isl, i) => {
            const sx = (isl.x - cam.x) * cam.zoom + cssW / 2;
            const sy = (isl.y - cam.y) * cam.zoom + cssH / 2;
            view.islands[i * 4] = sx * dpr;
            view.islands[i * 4 + 1] = canvas.height - sy * dpr; // GL y-up
            view.islands[i * 4 + 2] = isl.r * cam.zoom * dpr;
            const visited = s.progress.visited.includes(isl.id);
            view.islands[i * 4 + 3] = 0.45 + stage * 0.18 + (visited ? 0.22 : 0);
          });
          viewRaf = requestAnimationFrame(updateView);
        };
        viewRaf = requestAnimationFrame(updateView);
      } catch (err) {
        console.warn("Fluid-Init fehlgeschlagen, 2D-Fallback:", err);
        engine = null;
        fluidMode = false;
      }
    }
    if (!engine) {
      engine = new Flow2D(canvas, reduced);
      engine.start();
    }

    const onResize = () => {
      if (engine instanceof Flow2D) engine.repaint();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(viewRaf);
      engine?.stop();
      if (engine instanceof FluidSim) engine.dispose();
      engine = null;
      fluidMode = false;
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
