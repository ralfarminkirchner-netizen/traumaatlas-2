// Tageszeit-Probe: Zyklus-Logik aus daynight.ts — Himmelslicht-Bahn (eine
// Quelle, Sonne↔Mond), Paletten-Übergänge, Sterne/Sonnenscheibe-Phasen,
// Scrubben/Vorrücken, Wickel-Stetigkeit. Läuft im Browser (vite-Import).
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
server.on("error", () => { /* warmer Server dient weiter */ });
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

  const r = await page.evaluate(async () => {
    const dn = await import("/src/ocean3d/daynight.ts");
    const { dayState, stepDay, scrubDay, sampleDay, celestialDirAt, sunElevation, DAY_LENGTH_S } = dn;
    const V = await import("/node_modules/three/build/three.module.js");
    const v = new V.Vector3();

    // Bahn über 12 Phasen: normiert, aktiver Körper immer über dem Horizont
    let minLen = 2, maxLen = 0, minY = 2, yNoon = 0, yMidnight = 0, xDawn = 0, xDusk = 0;
    for (let i = 0; i < 12; i++) {
      const p = i / 12;
      celestialDirAt(p, v);
      const len = v.length();
      minLen = Math.min(minLen, len); maxLen = Math.max(maxLen, len);
      minY = Math.min(minY, v.y);
      if (p === 0.5) yNoon = v.y;
      if (p === 0) yMidnight = v.y;
    }
    celestialDirAt(0.25, v); xDawn = v.x;
    celestialDirAt(0.75, v); xDusk = v.x;

    // Paletten: Tag vs. Nacht unterscheidbar, Sterne/Scheibe phasenrichtig
    const night = sampleDay(0.0);
    const day = sampleDay(0.5);
    const dawn = sampleDay(0.27);
    const shallowDay = day.shallow.getHexString();
    const shallowNight = night.shallow.getHexString();
    const amberDawn = "#" + dawn.amber.getHexString();

    // Wickel-Stetigkeit: 0.995 vs 0.005 darf nicht springen
    const a = sampleDay(0.995);
    const b = sampleDay(0.005);
    const dCol = (c1, c2) => Math.hypot(c1.r - c2.r, c1.g - c2.g, c1.b - c2.b);
    const wrapJump = dCol(a.zenith, b.zenith) + Math.abs(a.fogDensity - b.fogDensity);

    // Vorrücken + Scrubben
    dayState.paused = false; dayState.resumeAt = 0;
    dayState.phase = 0.3;
    stepDay(1.0);
    const advanced = dayState.phase - 0.3;
    scrubDay(0.61);
    const afterScrub = dayState.phase;
    const pausedNow = dayState.paused;
    stepDay(1.0);
    const heldPaused = dayState.phase === afterScrub;
    dayState.paused = false; dayState.resumeAt = 0; dayState.phase = 0.82;

    return {
      minLen, maxLen, minY, yNoon, yMidnight, xDawn, xDusk,
      shallowDay, shallowNight, amberDawn,
      starsNight: night.stars, starsDay: day.stars,
      sunDay: day.sunDisc, sunNight: night.sunDisc,
      fogDay: day.fogDensity, fogNight: night.fogDensity,
      boostDay: day.lightBoost, boostNight: night.lightBoost,
      wrapJump, advanced, advanceExpect: 1 / DAY_LENGTH_S,
      afterScrub, pausedNow, heldPaused,
      elevationNoon: sunElevation(0.5), elevationNight: sunElevation(0.0),
      mirror: !!window.__ta3day,
    };
  });

  console.log("Tag/Nacht:", JSON.stringify(r, (k, v) => (typeof v === "number" ? +v.toFixed(5) : v)));
  ok(r.mirror, "__ta3day-Spiegel vorhanden");
  ok(r.minLen > 0.98 && r.maxLen < 1.02, `Himmelsrichtung normiert (${r.minLen.toFixed(3)}..${r.maxLen.toFixed(3)})`);
  ok(r.minY >= -0.001, `aktive Quelle nie UNTER dem Horizont (min y ${r.minY.toFixed(3)}; 0 = Aufgang/Untergang)`);
  ok(r.yNoon > 0.75, `Sonne mittags hoch (y ${r.yNoon.toFixed(2)})`);
  ok(r.yMidnight > 0.4, `Mond um Mitternacht hoch (y ${r.yMidnight.toFixed(2)})`);
  ok(r.xDawn > 0.5 && r.xDusk < -0.5, `Sonne wandert Ost → West (${r.xDawn.toFixed(2)} → ${r.xDusk.toFixed(2)})`);
  ok(r.shallowDay !== r.shallowNight, `Wasserfarbe phasenabhängig (${r.shallowNight} → ${r.shallowDay})`);
  ok(r.starsNight === 1 && r.starsDay === 0, `Sterne nur nachts (${r.starsNight}/${r.starsDay})`);
  ok(r.sunDay === 1 && r.sunNight === 0, `Sonnenscheibe nur tagsüber (${r.sunDay}/${r.sunNight})`);
  ok(r.fogDay < r.fogNight, `Nebel nachts dichter (${r.fogNight} → ${r.fogDay})`);
  ok(r.boostDay > r.boostNight, `Phänomen-Lichter bei Tag verstärkt (${r.boostNight} → ${r.boostDay})`);
  ok(r.elevationNoon > 0.99 && r.elevationNight < -0.9, `Elevation: Mittag +1, Mitternacht −1`);
  ok(r.wrapJump < 0.05, `Wickel-Stetigkeit 0.995→0.005 (Sprung ${r.wrapJump.toFixed(4)})`);
  ok(Math.abs(r.advanced - r.advanceExpect) < r.advanceExpect * 0.01, `Zyklus rückt vor (+${r.advanced.toFixed(5)}/s, Soll ${r.advanceExpect.toFixed(5)})`);
  ok(Math.abs(r.afterScrub - 0.61) < 1e-9 && r.pausedNow && r.heldPaused, "Scrubben setzt Phase und hält an");

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
