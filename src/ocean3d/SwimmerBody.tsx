// Der Schwimmer ist jetzt die WELLE: kein Körper-Mesh mehr — das Selbst
// zeigt sich als Wellenpaket mit Glanz-Band im Wasser (Teil 5: „Die Welle").
// Diese Komponente bleibt der headless Simulations-Treiber: Direktsteuerung,
// Feld-Atem, Wake-Emission, Begegnung-Wachstum. Das Druckfeld (BODY_GLSL)
// bleibt als Mulde unter dem Wellenpaket bestehen (waves.ts bodyState).

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useOcean, getOceanState } from "../ocean/world";
import { waveHeight } from "./waves";
import { swimmer, stepSwimmer, acceptPhenomenon, WakeEmitter } from "./swimmer";
import { projStore, splat3D } from "./projStore";
import { w2x, w2z, x2w, z2w } from "./coords";

export function Swimmer() {
  const wake = useRef(new WakeEmitter());
  const fieldT = useRef(0);
  const { selected } = useOcean();

  // Begegnung = Annehmen: ein Phänomen öffnen lässt die Welle wachsen
  useEffect(() => {
    if (selected) acceptPhenomenon(selected);
  }, [selected]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05) || 0.016;
    const t = clock.elapsedTime;

    const { speed, field } = stepSwimmer(dt, t);
    wake.current.step(dt, speed);

    // Feld-Atem: Sog = einströmende Ringe zwischen Welle und Phänomen,
    // Barriere = Gischt-Wall am Widerstand (Felder atmen mit den Wellen)
    fieldT.current += dt;
    if (field.kind && field.nearId) {
      const p = getOceanState().phenomena.find((q) => q.id === field.nearId);
      if (p) {
        const px = w2x(p.x);
        const pz = w2z(p.y);
        const breath = 0.6 + 0.4 * Math.sin(t * 1.1 + waveHeight(px, pz, t, projStore.calm) * 4);
        if (field.kind === "sog" && fieldT.current > 0.85) {
          fieldT.current = 0;
          const mx = swimmer.x + (px - swimmer.x) * 0.4;
          const mz = swimmer.z + (pz - swimmer.z) * 0.4;
          splat3D(x2w(mx), z2w(mz), 0.3 * breath);
        } else if (field.kind === "barriere" && fieldT.current > 0.5) {
          fieldT.current = 0;
          const mx = swimmer.x + (px - swimmer.x) * 0.55;
          const mz = swimmer.z + (pz - swimmer.z) * 0.55;
          splat3D(x2w(mx), z2w(mz), 0.65 * breath);
        }
      }
    }
  });

  // Kein Mesh, keine Kugel, kein Spielzeug — die Welle selbst ist sichtbar.
  return null;
}
