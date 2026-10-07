import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useWebGL2 } from "@/hooks/use-webgl";

interface GateProps {
  /** Statischer Ersatz, wenn kein WebGL2 oder reduced-motion aktiv. */
  fallback: ReactNode;
  children: ReactNode;
  /** Weiches Nebel-Backdrop in der Canvas (drei Fog). */
  fog?: boolean;
  camera?: { position: [number, number, number]; fov?: number };
  dpr?: [number, number];
  className?: string;
  /** Schattenwurf aktivieren (Lichtkugel wirft Schatten aufs Relief). */
  shadows?: boolean;
  /** Auch bei reduced-motion die Canvas zeigen (eingefroren) — Standard: nein. */
  renderDespiteReducedMotion?: boolean;
}

/**
 * WebGL-Gate: rendert die r3f-Canvas nur, wenn WebGL2 verfügbar ist und
 * der Nutzer keine reduzierte Bewegung wünscht. Sonst statischer Fallback.
 */
export function WebGLGate({
  fallback,
  children,
  fog = true,
  camera = { position: [0, 0, 6], fov: 45 },
  dpr = [1, 1.75],
  className,
  shadows = false,
  renderDespiteReducedMotion = false,
}: GateProps) {
  const gl = useWebGL2();
  const reduced = useReducedMotion();

  if (!gl || (reduced && !renderDespiteReducedMotion)) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <Canvas
        dpr={dpr}
        camera={{ position: camera.position, fov: camera.fov ?? 45 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        frameloop={reduced ? "demand" : "always"}
        shadows={shadows}
      >
        {fog && <fog attach="fog" args={["#0e0b08", 8, 22]} />}
        {children}
      </Canvas>
    </div>
  );
}
