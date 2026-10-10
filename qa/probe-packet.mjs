// Wellenpaket-Probe: CPU-Sampler (waves.ts wavePacket) vs. GLSL-Spiegel der
// Shader-Formel (packetHeight aus PACKET_GLSL), dazu Energie-Physik E ∝ v²,
// Zerfallsrate, Jacobi-Brechschwelle und Ringwellen-Abgabe (shedTotal).
// Läuft im Browser (vite-Modul-Import), Muster wie probe-body.mjs.
// Port: 8471 (Default), per TA3_QA_PORT überschreibbar, falls belegt.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createWriteStream } from "node:fs";

const PORT = Number(process.env.TA3_QA_PORT || 8471);
const BASE = `http://localhost:${PORT}/`;
const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log); server.stderr.pipe(log);
// Port schon von einem warmen Server bedient (TA3_QA_PORT-Muster)? Dann
// nicht abstürzen — waitForServer findet den laufenden Server selbst.
server.on("error", () => { /* EADDRINUSE o.ä.: warmer Server dient weiter */ });
const kill = () => { try { server.kill("SIGTERM"); } catch { /* ok */ } };
process.on("exit", kill);
process.on("SIGINT", () => { kill(); process.exit(130); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(t0 = Date.now()) {
  while (Date.now() - t0 < 300000) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* */ }
    await sleep(800);
  }
  throw new Error("Dev-Server nicht erreichbar");
}

const errors = [];
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}`); if (!cond) failures++; };

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
  await sleep(2500);

  const parity = await page.evaluate(async () => {
    const mod = await import("/src/ocean3d/waves.ts");
    const { packetState, packetOmega, wavePacket, PACKET_PROFILE } = mod;

    // GLSL-Spiegel: exakt die Mathematik aus PACKET_GLSL (packetHeight)
    function glslPacket(x, z, t, pk) {
      const A = pk.amp * pk.active;
      if (A <= 1e-5) return { h: 0, gx: 0, gz: 0, j: 1, env: 0, disp: 0 };
      const dx = x - pk.x, dz = z - pk.z;
      const ux = pk.dirX, uz = pk.dirZ;
      const px = -uz, pz = ux;
      const u = ux * dx + uz * dz;
      const v = px * dx + pz * dz;
      const su = Math.max(pk.sigmaU, 0.3), sv = Math.max(pk.sigmaV, 0.3);
      const eu = (-2 * u) / (su * su), ev = (-2 * v) / (sv * sv);
      const env = Math.exp(-(u * u) / (su * su) - (v * v) / (sv * sv));
      const k = (2 * Math.PI) / pk.len;
      const w = packetOmega(pk.len);
      const phi = k * u - w * t;
      const s = Math.sin(phi), c = Math.cos(phi);
      const h = A * env * s;
      const denvx = env * (eu * ux + ev * px);
      const denvz = env * (eu * uz + ev * pz);
      const gx = A * (denvx * s + env * c * k * ux);
      const gz = A * (denvz * s + env * c * k * uz);
      const disp = PACKET_PROFILE.Q * A * env * c;
      const j = 1 + PACKET_PROFILE.Q * A * env * (eu * c - k * s);
      return { h, gx, gz, j, env, disp };
    }

    // Starrer Paketzustand (schräg gestellt, damit u und v beide wirken)
    packetState.x = 4.0; packetState.z = -3.0;
    packetState.dirX = 0.6; packetState.dirZ = -0.8;
    packetState.amp = 1.1; packetState.active = 1;
    packetState.len = 7.0; packetState.sigmaU = 6.4; packetState.sigmaV = 9.2;

    let maxH = 0, maxG = 0, maxJ = 0, maxD = 0;
    for (const t of [0, 1.37, 4.9]) {
      for (let i = -28; i <= 28; i++) {
        for (let jj = -28; jj <= 28; jj++) {
          const x = packetState.x + i * 0.7;
          const z = packetState.z + jj * 0.7;
          const g = glslPacket(x, z, t, packetState);
          const c = wavePacket(x, z, t);
          maxH = Math.max(maxH, Math.abs(c.h - g.h));
          maxG = Math.max(maxG, Math.hypot(c.gx - g.gx, c.gz - g.gz));
          maxJ = Math.max(maxJ, Math.abs(c.j - g.j));
          maxD = Math.max(maxD, Math.abs(c.disp - g.disp));
        }
      }
    }

    // Fernfeld: Hüllkurve muss abklingen, Jacobi → 1
    const far = wavePacket(packetState.x + 60, packetState.z + 60, 2.0);

    // Periodizität: t + 2π/ω muss exakt dieselbe Welle liefern
    const T = (2 * Math.PI) / packetOmega(packetState.len);
    const pa = wavePacket(packetState.x + 2.2, packetState.z - 1.4, 3.3);
    const pb = wavePacket(packetState.x + 2.2, packetState.z - 1.4, 3.3 + T);
    const period = Math.abs(pa.h - pb.h) + Math.abs(pa.j - pb.j);

    // amp = 0 → Paket vollständig aus
    packetState.amp = 0;
    const off = wavePacket(packetState.x, packetState.z, 1.0);
    packetState.amp = 1.1;

    // Brech-Schwelle: hohe vs. niedrige Amplitude — minimales j im Paket
    function minJ(amp) {
      packetState.amp = amp;
      let m = 1;
      for (let i = -20; i <= 20; i++) {
        for (let jj = -20; jj <= 20; jj++) {
          const smp = wavePacket(packetState.x + i * 0.35, packetState.z + jj * 0.35, 0.9);
          if (smp.j < m) m = smp.j;
        }
      }
      return m;
    }
    const jFast = minJ(1.3);  // harter Schlag → muss brechen
    const jSlow = minJ(0.2);  // gleiten → darf nicht brechen
    packetState.amp = 0;

    // ── Paket 2: eigener Zustand, gleiche Mathematik — Parität wie Paket 1 ──
    const { packet2State, wavePacket2 } = mod;
    packet2State.x = -5.0; packet2State.z = 2.0;
    packet2State.dirX = -0.8; packet2State.dirZ = -0.6;
    packet2State.amp = 0.9; packet2State.active = 1;
    packet2State.len = 7.0; packet2State.sigmaU = 6.4; packet2State.sigmaV = 9.2;
    let maxH2 = 0, maxG2 = 0, maxJ2 = 0;
    for (const t of [0, 2.1]) {
      for (let i = -24; i <= 24; i++) {
        for (let jj = -24; jj <= 24; jj++) {
          const x = packet2State.x + i * 0.7;
          const z = packet2State.z + jj * 0.7;
          const g = glslPacket(x, z, t, packet2State);
          const c = wavePacket2(x, z, t);
          maxH2 = Math.max(maxH2, Math.abs(c.h - g.h));
          maxG2 = Math.max(maxG2, Math.hypot(c.gx - g.gx, c.gz - g.gz));
          maxJ2 = Math.max(maxJ2, Math.abs(c.j - g.j));
        }
      }
    }

    // Superposition: beide Pakete leben gleichzeitig — im Kreuzungsbereich
    // überdecken sich beide Hüllkurven (die Shader-Höhe ist die Summe)
    packetState.x = -1.2; packetState.z = 0.4;
    packetState.dirX = 0.6; packetState.dirZ = -0.8;
    packetState.amp = 0.9; packetState.active = 1;
    const midX = (packetState.x + packet2State.x) / 2;
    const midZ = (packetState.z + packet2State.z) / 2;
    const s1 = wavePacket(midX, midZ, 1.7);
    const s2 = wavePacket2(midX, midZ, 1.7);
    // Paket 2 aus → kein Beitrag
    packet2State.amp = 0;
    const off2 = wavePacket2(midX, midZ, 1.7);
    packetState.amp = 0; packetState.active = 0; packet2State.active = 0;

    return {
      maxH, maxG, maxJ, maxD,
      farEnv: far.env, farJ: far.j, farH: far.h,
      period,
      offH: off.h, offJ: off.j,
      jFast, jSlow,
      breakJ: PACKET_PROFILE.BREAK_J,
      mirror: !!window.__ta3pack,
      maxH2, maxG2, maxJ2,
      crossE1: s1.env, crossE2: s2.env,
      off2H: off2.h,
      mirror2: !!window.__ta3pack2,
    };
  });

  console.log("Parität:", JSON.stringify(parity, (k, v) => (typeof v === "number" ? +v.toFixed(8) : v)));
  ok(parity.mirror, "__ta3pack-Spiegel vorhanden");
  ok(parity.maxH < 1e-9, `Höhe CPU ≡ Shader (max ${parity.maxH.toExponential(2)})`);
  ok(parity.maxG < 1e-9, `Gradient CPU ≡ Shader (max ${parity.maxG.toExponential(2)})`);
  ok(parity.maxJ < 1e-9, `Jacobi CPU ≡ Shader (max ${parity.maxJ.toExponential(2)})`);
  ok(parity.maxD < 1e-9, `Verdrängung CPU ≡ Shader (max ${parity.maxD.toExponential(2)})`);
  ok(parity.farEnv < 1e-3 && Math.abs(parity.farJ - 1) < 1e-3 && Math.abs(parity.farH) < 1e-3,
    `Fernfeld klingt ab (env ${parity.farEnv.toExponential(2)}, j ${parity.farJ.toFixed(4)})`);
  ok(parity.period < 1e-9, `Zeit-Periodizität 2π/ω (Abweichung ${parity.period.toExponential(2)})`);
  ok(parity.offH === 0 && parity.offJ === 1, "amp=0 schaltet das Paket ab");
  ok(parity.jFast < parity.breakJ, `harter Schlag bricht (j_min ${parity.jFast.toFixed(3)} < ${parity.breakJ})`);
  ok(parity.jSlow > parity.breakJ + 0.3, `Gleiten bricht nicht (j_min ${parity.jSlow.toFixed(3)}, weit über ${parity.breakJ})`);
  ok(parity.mirror2, "__ta3pack2-Spiegel vorhanden");
  ok(parity.maxH2 < 1e-9 && parity.maxG2 < 1e-9 && parity.maxJ2 < 1e-9,
    `Paket 2 CPU ≡ Shader (h ${parity.maxH2.toExponential(2)}, g ${parity.maxG2.toExponential(2)}, j ${parity.maxJ2.toExponential(2)})`);
  ok(parity.crossE1 > 0.05 && parity.crossE2 > 0.05,
    `Superposition: beide Hüllkurven im Kreuz (env ${parity.crossE1.toFixed(2)} / ${parity.crossE2.toFixed(2)})`);
  ok(parity.off2H === 0, "Paket 2 aus → kein Beitrag");

  const energy = await page.evaluate(async () => {
    const waves = await import("/src/ocean3d/waves.ts");
    const swim = await import("/src/ocean3d/swimmer.ts");
    const { packetState, PACKET_PROFILE } = waves;
    const { swimmer, stepPacket } = swim;

    packetState.pinned = false;
    swimmer.smActive = 1;
    swimmer.heading = 0.7;

    // bei konstanter Fahrt einschwingen (FILL-Zeitkonstante 1/6 s → 3 s reichlich)
    function settle(speed, seconds = 3) {
      packetState.energy = 0;
      const dt = 1 / 60;
      let t = 100;
      for (let i = 0; i < seconds * 60; i++) { t += dt; stepPacket(dt, t, speed, false); }
      return { energy: packetState.energy, amp: packetState.amp };
    }

    const e10 = settle(10);
    const e20 = settle(20);
    const e40 = settle(50); // jenseits des Geschwindigkeits-Deckels → Amplituden-Deckel

    // Zerfall: von v=30 auf 0 abbremsen, Halbwertszeit ln2/DECAY
    settle(30);
    const e0 = packetState.energy;
    const shedBefore = packetState.shedTotal;
    const dt = 1 / 60;
    let t = 500;
    for (let i = 0; i < 60; i++) { t += dt; stepPacket(dt, t, 0, false); } // 1 s bremsen
    const e1 = packetState.energy;
    const shedAfter = packetState.shedTotal;
    const decayMeasured = Math.log(e0 / e1); // für 1 s → Rate
    packetState.pinned = true; // App danach nicht stören
    packetState.energy = 0; packetState.amp = 0;

    return {
      e10, e20, e40,
      ratioE: e20.energy / e10.energy,
      ratioA: e20.amp / e10.amp,
      capHit: e40.amp <= PACKET_PROFILE.MAX_AMP + 1e-9 && e40.amp >= PACKET_PROFILE.MAX_AMP - 1e-6,
      decayMeasured,
      decayExpect: PACKET_PROFILE.DECAY,
      shed: shedAfter - shedBefore,
      gain: PACKET_PROFILE.GAIN,
    };
  });

  console.log("Energie:", JSON.stringify(energy, (k, v) => (typeof v === "number" ? +v.toFixed(6) : v)));
  ok(Math.abs(energy.ratioE - 4) < 0.05, `Energie ∝ v² (E(20)/E(10) = ${energy.ratioE.toFixed(3)}, erwarte 4)`);
  ok(Math.abs(energy.ratioA - 2) < 0.03, `Amplitude ∝ √(2E) (A(20)/A(10) = ${energy.ratioA.toFixed(3)}, erwarte 2)`);
  ok(Math.abs(energy.e10.amp - 10 * energy.gain) < 0.01, `A = GAIN·v kalibriert (A(10) = ${energy.e10.amp.toFixed(3)})`);
  ok(energy.capHit, `Würde-Deckel greift (A(50) = ${energy.e40.amp.toFixed(3)} ≤ MAX_AMP)`);
  ok(Math.abs(energy.decayMeasured - energy.decayExpect) < 0.08,
    `Zerfallsrate (gemessen ${energy.decayMeasured.toFixed(3)}/s, Soll ${energy.decayExpect}/s)`);
  ok(energy.shed > 50, `Abbremsen gibt Energie an Ringe ab (shed ${energy.shed.toFixed(1)})`);

  await browser.close();
} catch (e) {
  console.error("PROBE-ABBRUCH:", e);
  failures++;
} finally {
  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 12).join("\n")}` : "0 Konsolenfehler");
  if (errors.length) failures++;
  kill();
  process.exit(failures ? 1 : 0);
}
