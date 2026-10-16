// QA-/Debug-Spiegel: Universe am Window (Probes). Eager via main.tsx import —
// lädt Basis-Einbettung einmalig beim App-Start (deterministisch, ~ms).

import { atlasGraph } from "@/data/graph";
import { BASIS, basisPruefung } from "./baseEmbedding";
import { METRIKEN, projiziere, projizierePunkt, atmungsPhase } from "./metrics";
import { transduziere, TRANSDUKTION_PFLICHT } from "./transduction";
import { getWelt, setWelt } from "./useWorld";
import { WELTEN } from "./worlds";

if (typeof window !== "undefined") {
  (window as unknown as {
    __ta6universe?: unknown;
  }).__ta6universe = {
    BASIS,
    basisPruefung,
    METRIKEN,
    projiziere,
    projizierePunkt,
    atmungsPhase,
    transduziere,
    TRANSDUKTION_PFLICHT,
    nodes: atlasGraph.nodes,
    WELTEN,
    getWelt,
    setWelt,
  };
}
