// DOM-Labels über der 3D-Szene: Insel-Namensschilder, die per projStore
// mitprojiziert werden. Positionen werden per rAF direkt ins DOM geschrieben
// (60 fps ohne React-Re-Render). Buttons bleiben echte Buttons (ARIA/Tastatur).

import { useEffect, useRef } from "react";
import { ISLANDS, islandById, getOceanState, stageOf, type IslandId } from "../ocean/world";
import { projStore } from "./projStore";

export function IslandLabels3D({ onSail }: { onSail: (id: IslandId) => void }) {
  const refs = useRef(new Map<IslandId, HTMLButtonElement>());
  const doorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = getOceanState();
      const stage = stageOf(s.progress);
      for (const isl of ISLANDS) {
        const el = refs.current.get(isl.id);
        if (!el) continue;
        const p = projStore.labels.get(isl.id);
        const visited = s.progress.visited.includes(isl.id);
        const show = p?.visible && (s.overview || s.cam.zoom < 0.52 || visited) && !s.view;
        if (!p || !show) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          continue;
        }
        el.style.opacity = s.overview ? "1" : "0.92";
        el.style.pointerEvents = "auto";
        el.style.transform = `translate(-50%, -100%) translate(${p.sx.toFixed(1)}px, ${p.sy.toFixed(1)}px) scale(${p.scale.toFixed(3)})`;
        void stage;
      }
      // stille Tür am Lexikon (ruhige Zeigerhand)
      const door = doorRef.current;
      if (door) {
        const lex = islandById.get("lexikon")!;
        const p = projStore.labels.get("lexikon");
        const on = s.lexikonDoorGlowing && !s.view && p?.visible;
        door.style.opacity = on ? "1" : "0";
        if (p) door.style.transform = `translate(-50%, -50%) translate(${p.sx.toFixed(1)}px, ${(p.sy - 54).toFixed(1)}px)`;
        void lex;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden={false}>
      {ISLANDS.map((isl) => (
        <button
          key={isl.id}
          ref={(el) => {
            if (el) refs.current.set(isl.id, el);
            else refs.current.delete(isl.id);
          }}
          type="button"
          onClick={(e) => { e.stopPropagation(); onSail(isl.id); }}
          aria-label={`${isl.kicker}: ${isl.title} ansegeln`}
          className="group absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-xl border-0 bg-transparent px-3 py-1.5 text-center opacity-0 transition-opacity duration-500"
          style={{ willChange: "transform" }}
        >
          <span
            aria-hidden="true"
            className="block text-[10px] uppercase tracking-[0.28em] transition-colors"
            style={{ color: isl.ground[2], textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}
          >
            {isl.kicker}
          </span>
          <span
            aria-hidden="true"
            className="block font-display text-[19px] leading-tight text-[#ede4d4] transition-all group-hover:text-white"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
          >
            {isl.title}
          </span>
          <span
            aria-hidden="true"
            className="mx-auto mt-1 block h-px w-0 transition-all duration-500 group-hover:w-full"
            style={{ background: isl.ground[2] }}
          />
        </button>
      ))}
      {/* stille Tür am Lexikon — glimmt bei langsamer, ruhiger Zeigerbewegung */}
      <span
        ref={doorRef}
        aria-hidden="true"
        className="absolute left-0 top-0 h-5 w-3 rounded-t-full opacity-0 transition-opacity duration-700"
        style={{ background: "#ffe9c4", boxShadow: "0 0 26px 8px rgba(255,233,196,0.55)" }}
      />
    </div>
  );
}
