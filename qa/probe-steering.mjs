// Lenkungs-Probe: Klick aufs offene Wasser segelt gezielt; Drag schwenkt;
// Bojen-/Formations-Klicks lösen kein Wasser-Segeln aus.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createWriteStream } from "node:fs";

const PORT = 8471;
const BASE = `http://localhost:${PORT}/`;
const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log); server.stderr.pipe(log);
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
  await sleep(3000);

  const before = await page.evaluate(() => ({ x: window.__ta3swim.x, z: window.__ta3swim.z }));

  // 1) Klick auf offenes Wasser (unten links) → Körper schwimmt dorthin
  //    (Zeiger-Führung: der Zeiger ruht am Klickpunkt und führt den Körper)
  const distTo = async () => page.evaluate(async () => {
    const mod = await import("/src/ocean3d/projStore.ts");
    const co = await import("/src/ocean3d/coords.ts");
    const w = mod.screenToWater(300, 700);
    if (!w) return Infinity;
    const sw = window.__ta3swim;
    return Math.hypot(co.w2x(w.wx) - sw.x, co.w2z(w.wy) - sw.z);
  });
  const d0 = await distTo();
  await page.mouse.click(300, 700);
  await sleep(2200);
  const d1 = await distTo();
  ok(d1 < d0 - 1, `Wasser-Klick: Körper schwimmt zum Klickpunkt (${d0.toFixed(1)} → ${d1.toFixed(1)})`);

  // Zeiger an anderer Stelle führt sofort weiter (Zeiger schlägt Klick-Ziel)
  const distToPt = async (cx, cy) => page.evaluate(async ({ cx, cy }) => {
    const mod = await import("/src/ocean3d/projStore.ts");
    const co = await import("/src/ocean3d/coords.ts");
    const w = mod.screenToWater(cx, cy);
    if (!w) return Infinity;
    const sw = window.__ta3swim;
    return Math.hypot(co.w2x(w.wx) - sw.x, co.w2z(w.wy) - sw.z);
  }, { cx, cy });
  await page.mouse.move(1000, 300, { steps: 3 });
  const dNew0 = await distToPt(1000, 300);
  await sleep(2600);
  const dNew1 = await distToPt(1000, 300);
  ok(dNew1 < dNew0 - 1.5, `Zeiger-Führung führt weiter (${dNew0.toFixed(1)} → ${dNew1.toFixed(1)})`);

  // 2) Drag in 3D = schnelles Schwimmen mit dem Zeiger (kein Welt-Pan mehr —
  //    die Kamera folgt dem Körper, nicht dem Drag)
  const preDrag = await page.evaluate(() => ({ x: window.__ta3swim.x, z: window.__ta3swim.z }));
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) await page.mouse.move(720 - i * 14, 450 - i * 6, { steps: 1 });
  await page.mouse.up();
  await sleep(1500);
  const postDrag = await page.evaluate(() => ({ x: window.__ta3swim.x, z: window.__ta3swim.z }));
  const swum = Math.hypot(postDrag.x - preDrag.x, postDrag.z - preDrag.z);
  ok(swum > 1.5, `Drag führt den Körper (Δ ${swum.toFixed(2)} 3D-Einheiten)`);

  // 3) Formations-Klick segelt zur Formation (DOM-Klick auf das projizierte Label;
  //    die Szene steht in 3D wegen des Kamera-Schwebens nie „stabil" — daher direkter DOM-Klick)
  await sleep(2000);
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="Orientierung: Symptom-Navigator ansegeln"]');
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await sleep(400);
  // Ankunft kann bei kurzer Distanz sofort durch sein: sailing ODER geöffnetes Kapitel zählt
  const s = await page.evaluate(() => ({ sailing: window.__ta3ocean().sailing, view: window.__ta3ocean().view }));
  ok(s.sailing === true || s.view === "navigator", `Formations-Klick segelt zur Formation (sailing=${s.sailing}, view=${s.view})`);
  // zurück ans Meer für spätere Checks
  await page.keyboard.press("Escape");
  await sleep(600);

  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 8).join("\n")}` : "0 Konsolenfehler");
  ok(errors.length === 0, "0 Konsolenfehler");
  await browser.close();
} finally {
  kill();
}
process.exit(failures === 0 ? 0 : 1);
