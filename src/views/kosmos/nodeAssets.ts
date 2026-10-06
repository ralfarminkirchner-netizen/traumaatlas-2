// Porträt-Medaillons für Knoten mit Schlüsselpersönlichkeit.
// Die Medaillons werden zur Build-Zeit aus den generierten Porträts
// kreisförmig ausgeschnitten (siehe Skript in qa/… bzw. Asset-Pipeline).
import pfFreud from "@/assets/gen/med-pf-freud.png";
import pfJung from "@/assets/gen/med-pf-jung.png";
import pfAdler from "@/assets/gen/med-pf-adler.png";
import pfWundt from "@/assets/gen/med-pf-wundt.png";
import pfReich from "@/assets/gen/med-pf-reich.png";
import pfBowlby from "@/assets/gen/med-pf-bowlby.png";
import pfLevine from "@/assets/gen/med-pf-levine.png";
import pfShapiro from "@/assets/gen/med-pf-shapiro.png";
import pfPorges from "@/assets/gen/med-pf-porges.png";
import pfHerman from "@/assets/gen/med-pf-herman.png";
import pfLinehan from "@/assets/gen/med-pf-linehan.png";
import pfVanderkolk from "@/assets/gen/med-pf-vanderkolk.png";

/** nodeId → Porträt-Medaillon (URL) */
export const PORTRAITS: Record<string, string> = {
  psychoanalyse: pfFreud,
  jung: pfJung,
  adler: pfAdler,
  wundt: pfWundt,
  reich: pfReich,
  bindung: pfBowlby,
  herman: pfHerman,
  polyvagal: pfPorges,
  "m:polyvagal": pfPorges,
  "m:emdr": pfShapiro,
  "m:se": pfLevine,
  "m:dbt": pfLinehan,
  "m:tsyoga": pfVanderkolk,
};

export const PORTRAIT_NODE_IDS = new Set(Object.keys(PORTRAITS));
