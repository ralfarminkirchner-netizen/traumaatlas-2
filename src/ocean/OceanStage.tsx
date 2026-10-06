// Die Meer-Stage: Wasser, Inselwelt, Phänomene, Arme, Nebel, Navigation.
// Volle Bühne — die Karte IST die Navigation.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ISLANDS, WORLD, islandById, useOcean,
  stepCamera, stepPhysics, setCamTarget, toggleOverview, sailTo, arrive, openView,
  addPhenomenon, removePhenomenon, confirmBridge, selectPhenomenon,
  calmPulse, setLexikonDoorGlowing, stageOf, STAGES,
  type IslandId, MIN_ZOOM, MAX_ZOOM,
} from "./world";
import { waterSplat, setWaterCalm, isFluidActive } from "./WaterCanvas";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// ── Welt-Schicht-Transform ───────────────────────────────────────────────────

function worldTransform(cam: { x: number; y: number; zoom: number }, vw: number, vh: number): string {
  return `translate(${vw / 2 - cam.x * cam.zoom}px, ${vh / 2 - cam.y * cam.zoom}px) scale(${cam.zoom})`;
}

// ── Nebel (Fog of War) ───────────────────────────────────────────────────────

const FOG_RES = 0.5; // halbe Auflösung

function FogLayer() {
  const { progress, phenomena } = useOcean();
  const ref = useRef<HTMLCanvasElement>(null);
  const stage = stageOf(progress);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const w = Math.floor(WORLD.w * FOG_RES);
    const h = Math.floor(WORLD.h * FOG_RES);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);

    // Nebelschicht
    ctx.fillStyle = "rgba(4, 10, 13, 0.72)";
    ctx.fillRect(0, 0, w, h);

    const hole = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x * FOG_RES, y * FOG_RES, r * FOG_RES * 0.25, x * FOG_RES, y * FOG_RES, r * FOG_RES);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = g;
      ctx.fillRect((x - r) * FOG_RES, (y - r) * FOG_RES, r * 2 * FOG_RES, r * 2 * FOG_RES);
      ctx.globalCompositeOperation = "source-over";
    };

    // Erkenntnis lichtet den Nebel dauerhaft:
    // besuchte Inseln, eigene Phänomene, bestätigte Brücken.
    for (const id of progress.visited) {
      const isl = islandById.get(id);
      if (isl) hole(isl.x, isl.y, isl.r * 3.2);
    }
    const glowR = 340 + stage * 130; // wachsendes Licht je Stufe
    for (const p of phenomena) {
      hole(p.x, p.y, glowR);
    }
    // Startbereich um den Navigator ist immer frei
    const nav = islandById.get("navigator")!;
    hole(nav.x, nav.y, nav.r * 4);
  }, [progress, phenomena, stage]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: WORLD.w, height: WORLD.h, mixBlendMode: "multiply" }}
      aria-hidden="true"
    />
  );
}

// ── Insel ────────────────────────────────────────────────────────────────────

function Island({ id, onSail }: { id: IslandId; onSail: (id: IslandId) => void }) {
  const isl = islandById.get(id)!;
  const { cam, progress, overview, view, lexikonDoorGlowing } = useOcean();
  const visited = progress.visited.includes(id);
  const stage = stageOf(progress);
  const showLabel = overview || cam.zoom < 0.5 || visited;
  const zoomK = Math.min(1, Math.max(0.45, 0.9 / cam.zoom));
  const doorGlow = id === "lexikon" && lexikonDoorGlowing && !view;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSail(id); }}
      aria-label={`${isl.kicker}: ${isl.title} ansegeln`}
      className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-0 bg-transparent p-0"
      style={{ left: isl.x, top: isl.y, width: isl.r * 2, height: isl.r * 2 }}
    >
      {/* Boden-Signatur: gestufte Lichtkörper */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full transition-all duration-700 group-hover:brightness-[1.35]"
        style={{
          background: `radial-gradient(circle at 42% 36%, ${isl.ground[1]}55 0%, ${isl.ground[0]}88 45%, transparent 72%)`,
          boxShadow: `0 0 ${90 + stage * 30}px ${visited ? isl.ground[2] + "44" : "transparent"}, inset 0 0 60px ${isl.ground[0]}`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          inset: isl.r * 0.28,
          background: `radial-gradient(circle at 45% 38%, ${isl.ground[1]} 0%, ${isl.ground[0]} 70%)`,
          boxShadow: `inset 0 -14px 34px rgba(0,0,0,0.55), 0 0 26px ${isl.ground[2]}33`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          inset: isl.r * 0.44,
          background: `radial-gradient(circle at 42% 34%, ${isl.ground[2]}66 0%, ${isl.ground[1]} 58%, ${isl.ground[0]} 100%)`,
          opacity: visited ? 1 : 0.55,
          transition: "opacity 1s",
        }}
      />
      {/* Kranz für besuchte Inseln */}
      {visited && (
        <span
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ inset: isl.r * 0.24, border: `1.5px solid ${isl.ground[2]}55`, boxShadow: `0 0 18px ${isl.ground[2]}44` }}
        />
      )}
      {/* stille Tür am Lexikon */}
      {doorGlow && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-t-full"
          style={{ background: "#ffe9c4", boxShadow: "0 0 26px 8px rgba(255,233,196,0.55)", animation: "ta3-door 3.2s ease-in-out infinite" }}
        />
      )}
      {/* Glyphe + Index */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display"
        style={{ fontSize: isl.r * 0.5 * zoomK, color: isl.ground[2], opacity: 0.9, textShadow: `0 0 22px ${isl.ground[2]}88` }}
      >
        {isl.glyph}
      </span>
      {/* Namensschild */}
      {showLabel && (
        <span
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center transition-opacity duration-500"
          style={{ top: isl.r * 1.06, opacity: overview ? 1 : 0.85 }}
        >
          <span className="block text-[10px] uppercase tracking-[0.28em]" style={{ color: isl.ground[2], fontSize: 13 / cam.zoom }}>
            {isl.kicker}
          </span>
          <span className="block font-display" style={{ color: "#ede4d4", fontSize: 19 / cam.zoom, textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}>
            {isl.title}
          </span>
        </span>
      )}
    </button>
  );
}

// ── Phänomene + Arme ─────────────────────────────────────────────────────────

function PhenomenaLayer() {
  const { phenomena, arms, selected, cam } = useOcean();
  const t = performance.now() / 1000;

  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      style={{ width: WORLD.w, height: WORLD.h }}
      aria-hidden="true"
    >
      <defs>
        <filter id="ta3-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="18" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arme — Verbindungen, die wachsen und festhaken */}
      {arms.map((arm) => {
        const a = phenomena.find((p) => p.id === arm.a);
        const b = phenomena.find((p) => p.id === arm.b);
        if (!a || !b || arm.growth <= 0.02) return null;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const sway = Math.sin(t * 0.7 + a.bornAt) * len * 0.08;
        const cx = mx - (dy / len) * sway;
        const cy = my + (dx / len) * sway;
        const dash = arm.latched ? undefined : "10 14";
        return (
          <g key={`${arm.a}-${arm.b}`}>
            <path
              d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
              fill="none"
              stroke={arm.latched ? "#e8c9a0" : "#9fd8cf"}
              strokeWidth={arm.latched ? 5 : 3}
              strokeDasharray={dash}
              strokeLinecap="round"
              opacity={arm.growth * (arm.latched ? 0.8 : 0.5)}
              filter="url(#ta3-glow)"
            />
          </g>
        );
      })}

      {/* Leuchtende Körper */}
      {phenomena.map((p, i) => {
        const isSel = selected === p.id;
        const r = isSel ? 46 : 34;
        const pulse = 1 + Math.sin(t * 1.6 + i * 1.3) * 0.06;
        return (
          <g
            key={p.id}
            transform={`translate(${p.x}, ${p.y})`}
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); selectPhenomenon(isSel ? null : p.id); }}
          >
            <circle r={r * 1.9 * pulse} fill={p.color} opacity={0.10} filter="url(#ta3-glow)" />
            <circle r={r * pulse} fill={p.color} opacity={0.30} filter="url(#ta3-glow)" />
            <circle r={r * 0.55 * pulse} fill={p.color} opacity={0.85} />
            {isSel && <circle r={r * 1.35} fill="none" stroke="#ede4d4" strokeWidth={2.5} strokeDasharray="4 8" opacity={0.9} />}
            {cam.zoom > 0.3 && (
              <text
                y={-r - 18}
                textAnchor="middle"
                fill="#ede4d4"
                fontSize={34}
                style={{ fontFamily: "Fraunces, serif", textShadow: "0 2px 12px rgba(0,0,0,0.9)", pointerEvents: "none" }}
              >
                {p.label.length > 26 ? p.label.slice(0, 24) + "…" : p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Detail-Popover eines Phänomens ───────────────────────────────────────────

function PhenomenonCard() {
  const { phenomena, selected, cam } = useOcean();
  const p = phenomena.find((x) => x.id === selected);
  if (!p) return null;

  return (
    <div
      className="absolute z-20 w-[330px] max-w-[86vw] rounded-2xl border border-white/10 bg-[#0d0a07]/92 p-5 shadow-2xl backdrop-blur-md"
      style={{
        left: p.x * cam.zoom + (typeof window !== "undefined" ? window.innerWidth / 2 - cam.x * cam.zoom : 0),
        top: p.y * cam.zoom + (typeof window !== "undefined" ? window.innerHeight / 2 - cam.y * cam.zoom : 0),
        transform: "translate(-50%, -110%)",
      }}
      role="dialog"
      aria-label={`Phänomen: ${p.label}`}
    >
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{p.user ? "Dein Phänomen" : "Atlas-Phänomen"}</p>
      <h3 className="mt-1 font-display text-xl text-[#e8c9a0]">„{p.label}"</h3>

      {p.links.length > 0 && (
        <ul className="mt-3 space-y-2">
          {p.links.map((l) => {
            const key = `${l.targetType}:${l.targetId}`;
            const isConfirmed = p.confirmed.includes(key);
            return (
              <li key={key} className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] leading-snug text-[#ede4d4]/90">{l.label}</span>
                  {!isConfirmed ? (
                    <button
                      type="button"
                      onClick={() => confirmBridge(p.id, l.targetType, l.targetId)}
                      className="shrink-0 rounded-md border border-dashed border-[#9fd8cf]/50 px-2 py-1 text-[10px] uppercase tracking-wider text-[#9fd8cf] hover:bg-[#9fd8cf]/10"
                      title={l.reason}
                    >
                      Brücke öffnen
                    </button>
                  ) : (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-[#e8c9a0]">verbunden</span>
                  )}
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#e2b35c]" style={{ width: `${Math.round(l.strength * 100)}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-white/35">{l.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
      {p.links.length === 0 && (
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">
          Dieses Phänomen hat noch keine Brücke zum Atlas. Es schwebt frei im Wasser — das ist okay.
          Manche Dinge brauchen erst Zeit, bis sich Verbindungen zeigen.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => { removePhenomenon(p.id); }}
          className="text-[11px] uppercase tracking-wider text-white/40 hover:text-white/70"
        >
          Auflösen
        </button>
        <button
          type="button"
          onClick={() => selectPhenomenon(null)}
          className="rounded-md bg-white/[0.07] px-3 py-1.5 text-[11px] uppercase tracking-wider text-white/80 hover:bg-white/[0.12]"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

// ── Eingabe ──────────────────────────────────────────────────────────────────

function PhenomenonInput() {
  const [value, setValue] = useState("");
  const { view } = useOcean();

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = value.trim();
    if (!v) return;
    const ph = addPhenomenon(v);
    setValue("");
    // Leuchten im Wasser
    waterSplat(0.5, 0.5, 0, 0, [0.9, 0.68, 0.38], 0.012, 0.5);
    requestAnimationFrame(() => waterSplat(0.5, 0.5, 120, -60, [0.55, 0.45, 0.3], 0.006, 0.3));
    void ph;
  };

  if (view) return null;
  return (
    <form
      onSubmit={submit}
      className="pointer-events-auto absolute bottom-7 left-1/2 z-30 w-[min(560px,92vw)] -translate-x-1/2"
      aria-label="Phänomen eingeben"
    >
      <label htmlFor="ta3-phen-input" className="mb-2 block text-center text-[11px] uppercase tracking-[0.32em] text-[#e8c9a0]/70">
        Was beschäftigt dich gerade?
      </label>
      <div className="flex items-center gap-2 rounded-full border border-[#e2b35c]/25 bg-[#0d0a07]/85 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-md focus-within:border-[#e2b35c]/60">
        <input
          id="ta3-phen-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ein Glaubenssatz, ein Gefühl, ein Zustand …"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[15px] text-[#ede4d4] placeholder:text-white/30 focus:outline-none"
          maxLength={120}
          autoComplete="off"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#e2b35c]/90 px-5 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[#171006] transition hover:bg-[#e8c9a0]"
        >
          Ins Meer geben
        </button>
      </div>
    </form>
  );
}

// ── Kompass / Übersicht / Zoom ───────────────────────────────────────────────

function Hud({ onSail }: { onSail: (id: IslandId) => void }) {
  const { overview, progress, view, cam } = useOcean();
  const stage = stageOf(progress);

  if (view) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex items-start justify-between px-4 sm:top-4 sm:px-6">
      <div className="pointer-events-auto">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#e8c9a0]/60">TRAUMAATLAS 3</p>
        <p className="font-display text-lg text-[#ede4d4]/90">Das Meer der Phänomene</p>
        {/* stilles Wachstum — Lesart: Licht, kein Punktestand */}
        <div className="mt-2 flex items-center gap-2" role="status" aria-label={`Stufe: ${STAGES[stage]}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8c9a0] opacity-40" style={{ animationDuration: "3.5s" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#e8c9a0]" style={{ opacity: 0.5 + stage * 0.17 }} />
          </span>
          <span className="text-[11px] tracking-[0.2em] text-white/45">{STAGES[stage]}</span>
        </div>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="ta3-chapter-jump" className="sr-only">Kapitel direkt ansteuern</label>
          <select
            id="ta3-chapter-jump"
            value=""
            onChange={(e) => { if (e.target.value) onSail(e.target.value as IslandId); }}
            className="rounded-md border border-white/10 bg-[#0d0a07]/85 px-2 py-1.5 text-[12px] text-white/80 backdrop-blur"
          >
            <option value="">Kapitel wählen …</option>
            {ISLANDS.map((i) => (
              <option key={i.id} value={i.id}>{i.index} — {i.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleOverview}
            aria-pressed={overview}
            className="rounded-md border border-[#e2b35c]/30 bg-[#0d0a07]/85 px-3 py-1.5 text-[12px] uppercase tracking-wider text-[#e8c9a0] backdrop-blur hover:border-[#e2b35c]/60"
          >
            {overview ? "Näher" : "Karte"}
          </button>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Zoom">
          <button
            type="button"
            aria-label="Hinauszoomen"
            onClick={() => setCamTarget({ zoom: Math.max(MIN_ZOOM, cam.zoom - 0.12) })}
            className="h-7 w-7 rounded-md border border-white/10 bg-[#0d0a07]/85 text-white/70 backdrop-blur hover:text-white"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Hineinzoomen"
            onClick={() => setCamTarget({ zoom: Math.min(MAX_ZOOM, cam.zoom + 0.12) })}
            className="h-7 w-7 rounded-md border border-white/10 bg-[#0d0a07]/85 text-white/70 backdrop-blur hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stage ────────────────────────────────────────────────────────────────────

export function OceanStage({ onSail }: { onSail: (id: IslandId) => void }) {
  const ocean = useOcean();
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({
    down: false, moved: false, sx: 0, sy: 0, lx: 0, ly: 0, px: 0, py: 0, pt: 0,
    speedEMA: 0, stillSince: 0,
  });
  const pendingIsland = useRef<IslandId | null>(null);
  const ambient = useRef({ t: 0, next: 0 });

  // Haupt-Loop: Kamera, Physik, Kielwasser, stille Mechanik
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      stepPhysics(dt);
      const settled = stepCamera(dt);

      // Ankunft → Kapitel öffnen
      if (pendingIsland.current && settled) {
        const id = pendingIsland.current;
        pendingIsland.current = null;
        arrive();
        openView(id);
      }

      // Segel-Kielwasser: sanfte Spur hinter der Kamera
      if (ocean.sailing && isFluidActive()) {
        waterSplat(0.5, 0.55, (Math.random() - 0.5) * 200, 140, [0.35, 0.32, 0.24], 0.004, 0.12);
      }

      // Leben im Wasser: langsame Ambient-Wirbel
      ambient.current.t += dt;
      if (!reduced && ambient.current.t > ambient.current.next && isFluidActive()) {
        ambient.current.next = ambient.current.t + 2.2 + Math.random() * 2.5;
        const ang = Math.random() * Math.PI * 2;
        waterSplat(
          0.15 + Math.random() * 0.7,
          0.15 + Math.random() * 0.7,
          Math.cos(ang) * 260,
          Math.sin(ang) * 260,
          Math.random() > 0.75 ? [0.5, 0.4, 0.24] : [0.13, 0.26, 0.28],
          0.0028,
          0.055,
        );
      }

      // Stille Mechanik: Innehalten beruhigt das Wasser; ruhige Hand öffnet die Lexikon-Tür
      const p = pointer.current;
      const idle = now - p.stillSince > 2600;
      setWaterCalm(idle && !ocean.view);
      if (idle && !ocean.view) {
        // einmalig pro Phase zählen (wird im Store gegen Wiederholung gedämpft)
        if (ocean.phenomena.length > 0 && Math.random() < 0.002) calmPulse();
      }
      const lex = islandById.get("lexikon")!;
      const slow = p.speedEMA < 0.12 && p.speedEMA > 0.001;
      const nearLex = Math.hypot(p.px - lex.x, p.py - lex.y) < lex.r * 2.4;
      setLexikonDoorGlowing(slow && nearLex);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ocean.sailing, ocean.view, ocean.phenomena.length, reduced]);

  // Zeiger → Strömung + Pan + Zoom
  const handlers = useMemo(() => {
    const toWorld = (cx: number, cy: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      const vw = rect?.width ?? window.innerWidth;
      const vh = rect?.height ?? window.innerHeight;
      return {
        wx: ocean.cam.x + (cx - vw / 2) / ocean.cam.zoom,
        wy: ocean.cam.y + (cy - vh / 2) / ocean.cam.zoom,
      };
    };
    const toUv = (cx: number, cy: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return { u: 0.5, v: 0.5 };
      return { u: (cx - rect.left) / rect.width, v: 1 - (cy - rect.top) / rect.height };
    };

    return {
      onPointerDown: (e: React.PointerEvent) => {
        // Klick ins Wasser schließt die Phänomen-Karte
        const t = e.target as HTMLElement;
        if (!t.closest('[role="dialog"]') && ocean.selected) selectPhenomenon(null);
        const p = pointer.current;
        p.down = true; p.moved = false;
        p.sx = p.lx = e.clientX; p.sy = p.ly = e.clientY;
        t.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const p = pointer.current;
        const dx = e.clientX - p.lx;
        const dy = e.clientY - p.ly;
        const now = performance.now();
        const dtms = Math.max(now - p.pt, 8);
        const inst = Math.hypot(dx, dy) / dtms;
        p.speedEMA = p.speedEMA * 0.9 + inst * 0.1;
        p.pt = now;
        const { u, v } = toUv(e.clientX, e.clientY);
        const { wx, wy } = toWorld(e.clientX, e.clientY);
        p.px = wx; p.py = wy;

        if (p.down) {
          if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.moved = true;
          if (p.moved && !ocean.view) {
            const c = ocean.cam;
            setCamTarget({ x: c.x - dx / c.zoom, y: c.y - dy / c.zoom });
          }
        }
        if (inst > 0.02) p.stillSince = now;

        // Wasser aufbrechen
        const vw = stageRef.current?.getBoundingClientRect();
        if (vw && !ocean.view) {
          waterSplat(u, v, dx * 2.4, -dy * 2.4, [0.42, 0.35, 0.25], Math.min(0.008, 0.003 + inst * 0.014), Math.min(0.28, 0.06 + inst * 0.35));
        }
        p.lx = e.clientX; p.ly = e.clientY;
      },
      onPointerUp: () => {
        pointer.current.down = false;
      },
      onWheel: (e: React.WheelEvent) => {
        if (ocean.view) return;
        const c = ocean.cam;
        const factor = Math.exp(-e.deltaY * 0.0012);
        const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
        const rect = stageRef.current?.getBoundingClientRect();
        const vw = rect?.width ?? window.innerWidth;
        const vh = rect?.height ?? window.innerHeight;
        const wx = c.x + (e.clientX - vw / 2) / c.zoom;
        const wy = c.y + (e.clientY - vh / 2) / c.zoom;
        setCamTarget({
          zoom: nz,
          x: wx - (e.clientX - vw / 2) / nz,
          y: wy - (e.clientY - vh / 2) / nz,
        });
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocean.cam, ocean.view]);

  const sail = (id: IslandId) => {
    selectPhenomenon(null);
    pendingIsland.current = id;
    sailTo(id);
    onSail(id);
  };

  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [vh, setVh] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  useEffect(() => {
    const onR = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 touch-none overflow-hidden select-none"
      style={{ cursor: ocean.view ? "default" : "grab" }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onWheel={handlers.onWheel}
      role="application"
      aria-label="Das Meer der Phänomene — Inseln ansegeln, Phänomene eingeben, Wasser berühren"
    >
      {/* Wasser */}
      <div className="absolute inset-0">
        <WaterSurface />
      </div>

      {/* Welt-Schicht */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: WORLD.w,
          height: WORLD.h,
          transform: worldTransform(ocean.cam, vw, vh),
        }}
      >
        {/* sanfte Boden-Lichtungen unter den Inseln */}
        {ISLANDS.map((isl) => (
          <div
            key={isl.id}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: isl.x,
              top: isl.y,
              width: isl.r * 5,
              height: isl.r * 5,
              background: `radial-gradient(circle, ${isl.ground[2]}14 0%, transparent 62%)`,
            }}
          />
        ))}
        <PhenomenaLayer />
        <FogLayer />
        {ISLANDS.map((isl) => (
          <Island key={isl.id} id={isl.id} onSail={sail} />
        ))}
      </div>

      <PhenomenonCard />
      <PhenomenonInput />
      <Hud onSail={sail} />
    </div>
  );
}

// Kleine Indirektion, damit WaterCanvas lazy bleibt
import { WaterCanvas } from "./WaterCanvas";
function WaterSurface() {
  return <WaterCanvas />;
}
