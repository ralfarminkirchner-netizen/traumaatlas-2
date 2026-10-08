// KiNFORMER × TRAUMAATLAS: das Meer der Phänomene als Werkstück lesen.
// Phänomene werden Teile mit stabiler ID, Arme werden benannte, gewichtete
// Beziehungen. Der Befund (inspect, Frage „relations") ist eine numerische
// Beobachtung des Netzes — keine Wahrheits- oder Qualitätsaussage
// (Grenzen stehen im vendorisierten Modul).

import { WORLD, getOceanState } from "../ocean/world";
// workshop-math.js ist vendorisiertes UMD (setzt globalThis.KinformerMath) —
// nicht umschreiben, nur über die globale Schnittstelle nutzen.
import "./workshop-math.js";

interface KinformerInspectResult {
  readable: string[];
  metrics: KinformerMetrics;
}
interface KinformerMathApi {
  inspect(workpiece: unknown, options?: { question?: string; width?: number; height?: number }): KinformerInspectResult;
}
const { inspect } = (globalThis as unknown as { KinformerMath: KinformerMathApi }).KinformerMath;

interface KinformerMetrics {
  partCount: number;
  relationCount: number;
  clusterCount: number;
  orderedRelations: number;
  cyclicResidual: number;
}

export interface SeaBefund {
  ok: boolean;
  lines: string[];
  metrics: KinformerMetrics | null;
  /** Anzahl abstoßender Beziehungen (Schattenarbeit) unter den gezählten */
  repelling: number;
}

/** Ozean-Zustand → KiNFORMER-Werkstück (Teile = Phänomene, Beziehungen = Arme). */
function seaWorkpiece() {
  const s = getOceanState();
  const parts = s.phenomena.map((p) => ({
    id: p.id,
    kind: "phenomenon",
    origin: p.user ? "human" : "model",
    content: { text: p.label },
    appearance: {
      x: p.x,
      y: p.y,
      width: Math.max(40, p.label.length * 11),
      height: 30,
    },
  }));
  const relations = s.arms
    .filter((a) => a.growth > 0.02)
    .map((a) => ({
      id: `${a.a}—${a.b}`,
      from: a.a,
      to: a.b,
      reason: a.reason,
      // das Spektrum verlangt nichtnegative Gewichte: die STÄRKE der Bindung
      // zählt; Anziehung/Abstoßung wird im Befund getrennt ausgewiesen
      weight: Math.abs(a.strength) * a.growth,
    }));
  return {
    id: "meer-der-phaenomene",
    revision: s.phenomena.length + relations.length,
    parts,
    relations,
  };
}

/** Lesbarer Befund des Phänomen-Netzes (Frage: Beziehungsstruktur). */
export function seaBefund(): SeaBefund {
  const s = getOceanState();
  if (s.phenomena.length === 0) return { ok: false, lines: [], metrics: null, repelling: 0 };
  const repelling = s.arms.filter((a) => a.growth > 0.02 && a.strength < 0).length;
  try {
    const r = inspect(seaWorkpiece(), {
      question: "relations",
      width: WORLD.w,
      height: WORLD.h,
    }) as { readable: string[]; metrics: KinformerMetrics };
    return { ok: true, lines: r.readable, metrics: r.metrics, repelling };
  } catch {
    return { ok: false, lines: [], metrics: null, repelling: 0 };
  }
}
