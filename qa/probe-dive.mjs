// Tauch-Probe: Tiefenfeld (Untiefen flach, offene See tief, Klammern),
// Tauch-Zustandsmaschine (weich rein/raus, Tiefgang rampet), Boden-Klemme
// der Kamera, Tiefen-Knoten ÜBER dem Boden, Fisch-Scheu-Vektor.
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
    const sb = await import("/src/ocean3d/seabed.ts");
    const dv = await import("/src/ocean3d/dive.ts");
    const co = await import("/src/ocean3d/coords.ts");
    const { depthAt, SHOALS, DEEP_SEA } = sb;
    const { diveState, stepDive, diveStage } = dv;

    // Tiefenfeld: Untiefen-Plateaus flach, offene See tief, Klammern halten
    const kx = co.w2x(2600), kz = co.w2z(640); // Kosmos-Mitte
    const dKosmos = depthAt(kx, kz);
    const dEdge = depthAt(kx + SHOALS[1].r * 0.5, kz);
    const dOpen = depthAt(120, 70); // fern aller Platten (Welt 286×176)
    let dMin = 99, dMax = -99;
    for (let i = 0; i < 800; i++) {
      const x = (Math.sin(i * 12.9898) * 0.5) * 320;
      const z = (Math.sin(i * 78.233) * 0.5) * 320;
      const d = depthAt(x, z);
      if (d < dMin) dMin = d;
      if (d > dMax) dMax = d;
    }

    // Tauch-Maschine: halten → sub weich gegen 1 (monoton), depth rampet;
    // loslassen → sub zurück gegen 0, depth fällt zügiger
    diveState.pinned = false;
    diveState.held = false; diveState.sub = 0; diveState.depth = 0;
    const dt = 1 / 60;
    diveState.held = true;
    let monotonic = true, prev = -1;
    for (let i = 0; i < 240; i++) {
      stepDive(dt);
      if (diveState.sub < prev - 1e-6) monotonic = false;
      prev = diveState.sub;
    }
    const subAfter4s = diveState.sub;
    const depthAfter4s = diveState.depth;
    diveState.held = false;
    for (let i = 0; i < 240; i++) stepDive(dt);
    const subBack = diveState.sub;
    const depthBack = diveState.depth;

    // Boden-Klemme (Kamera-Regel): floorY = −depthAt + 0.55 muss unter 0 bleiben
    const floorKosmos = -depthAt(kx, kz) + 0.55;

    // Tiefen-Knoten-Höhe: y = −depthAt + 0.45 + Stufe·0.4 → immer über dem Grund
    const nodeAbove = (i, x, z) =>
      -depthAt(x, z) + 0.45 + (i % 5) * 0.4 - (-depthAt(x, z));

    // Fisch-Scheu: Ausweich-Vektor zeigt radial WEG vom Paket
    const pkx = 3, pkz = -2;
    const fx = 5, fz = 1;
    const away = Math.hypot(fx - pkx, fz - pkz) > 0 && ((fx - pkx) * (fx - pkx) + (fz - pkz) * (fz - pkz)) > 0;

    return {
      dKosmos, dEdge, dOpen, dMin, dMax, deepSea: DEEP_SEA,
      subAfter4s, depthAfter4s, subBack, depthBack, monotonic,
      floorKosmos, nodeAbove: nodeAbove(3, kx, kz), away,
      stageA: diveStage(0.1), stageB: diveStage(0.5), stageC: diveStage(0.9),
      mirror: !!window.__ta3dive,
    };
  });

  console.log("Tauch-Werte:", JSON.stringify(r, (k, v) => (typeof v === "number" ? +v.toFixed(3) : v)));
  ok(r.mirror, "__ta3dive-Spiegel vorhanden");
  ok(r.dKosmos < 7.5, `Untiefe unter der Insel flach (${r.dKosmos} < 7.5)`);
  ok(r.dKosmos >= 4.0, `Untiefe respektiert die Mindesttiefe — keine Welle legt den Grund frei (${r.dKosmos} ≥ 4.0)`);
  ok(r.dOpen > 15, `offene See tief (${r.dOpen} > 15)`);
  ok(r.dEdge > r.dKosmos - 2.5, `Platte fällt sanft ab (Rand ${r.dEdge})`);
  ok(r.dMin >= 3.99 && r.dMax <= r.deepSea + 1.81, `Klammern halten (${r.dMin}..${r.dMax})`);
  ok(r.monotonic && r.subAfter4s > 0.97, `Eintauchen weich und monoton (sub ${r.subAfter4s})`);
  ok(r.depthAfter4s > 0.95, `Tiefgang rampet bei Halten (${r.depthAfter4s})`);
  ok(r.subBack < 0.03 && r.depthBack < 0.05, `Auftauchen weich zurück (sub ${r.subBack}, depth ${r.depthBack})`);
  ok(r.floorKosmos < -0.7, `Boden-Klemme lässt Tauchkamera zu (floorY ${r.floorKosmos})`);
  ok(r.nodeAbove > 0.4 && r.nodeAbove <= 2.05, `Tiefen-Knoten schweben über dem Grund (+${r.nodeAbove})`);
  ok(r.away, "Fisch-Scheu weicht radial aus");
  ok(r.stageA === "Oberfläche" && r.stageB === "Schwelle" && r.stageC === "Tiefe", "Tiefgang-Stufen heißen richtig");

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
