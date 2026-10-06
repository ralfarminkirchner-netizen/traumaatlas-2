// Verwaltet die Wasser-Fläche: WebGL2-Fluid oder 2D-Fallback.
// Exportiert eine schlanke API für Kielwasser, Leuchten und ruhiges Wasser.

import { useEffect, useRef } from "react";
import { FluidSim, canRunFluid } from "./fluid";
import { Flow2D } from "./flow2d";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Engine = FluidSim | Flow2D | null;

let engine: Engine = null;
let fluidMode = false;

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
