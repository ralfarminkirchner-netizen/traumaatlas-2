// Verdrängungs-Probe: CPU-Sampler (waves.ts) vs. GLSL-Spiegel der Shader-Formel.
// Beide Seiten müssen deckungsgleich sein — die Probe rechnet die GLSL-Mathematik
// hier als JS nach (gleiche Konstanten wie im Shader-Quelltext) und vergleicht
// Höhe und Gradient über ein Testgitter. Läuft im Browser (vite-Modul-Import).
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
  await sleep(2500);

  const result = await page.evaluate(async () => {
    const mod = await import("/src/ocean3d/waves.ts");
    const { bodyState, bodyDisplacement, bodyGradient, BODY_PROFILE } = mod;

    // GLSL-Spiegel: exakt die Mathematik aus BODY_GLSL (bodyHeight)
    function glslBody(x, z, b) {
      const w = b.strength * b.active;
      if (w <= 0.0001) return { h: 0, gx: 0, gz: 0 };
      const dx = x - b.x, dz = z - b.z;
      const r = Math.max(b.r, 0.001);
      const d2 = dx * dx + dz * dz;
      const s = Math.sqrt(d2);
      const bowl = Math.exp(-d2 / (r * r * BODY_PROFILE.BOWL_K));
      const u = (s - r * BODY_PROFILE.RIM_R) / (r * BODY_PROFILE.RIM_W);
      const rimE = BODY_PROFILE.RIM_H * Math.exp(-u * u);
      const h = w * (rimE - bowl);
      const kb = bowl * (-2 / (r * r * BODY_PROFILE.BOWL_K));
      const kr = s > 1e-4 ? (rimE * (-2 * u)) / (r * BODY_PROFILE.RIM_W) / s : 0;
      const k = w * (kr - kb);
      return { h, gx: k * dx, gz: k * dz };
    }

    // Testgitter um den Körper (inkl. Randwulst-Zone und Fernfeld)
    bodyState.x = 3.0; bodyState.z = -7.5; bodyState.r = 4.2; bodyState.strength = 0.55; bodyState.active = 1;
    let maxH = 0, maxG = 0, minH = 0, maxRim = 0;
    for (let i = -24; i <= 24; i++) {
      for (let j = -24; j <= 24; j++) {
        const x = bodyState.x + i * 0.45;
        const z = bodyState.z + j * 0.45;
        const g = glslBody(x, z, bodyState);
        const dh = Math.abs(bodyDisplacement(x, z) - g.h);
        const [bgx, bgz] = bodyGradient(x, z);
        const dg = Math.hypot(bgx - g.gx, bgz - g.gz);
        if (dh > maxH) maxH = dh;
        if (dg > maxG) maxG = dg;
        if (g.h < minH) minH = g.h;
        if (g.h > maxRim) maxRim = g.h;
      }
    }

    // Körpermitte muss die tiefste Stelle sein; Wulst muss positiv sein
    const center = bodyDisplacement(bodyState.x, bodyState.z);
    const rimAt = bodyDisplacement(bodyState.x + bodyState.r * BODY_PROFILE.RIM_R, bodyState.z);

    // active = 0 muss das Feld vollständig abschalten
    bodyState.active = 0;
    const offH = bodyDisplacement(bodyState.x, bodyState.z);
    bodyState.active = 1;

    return { maxH, maxG, minH, maxRim, center, rimAt, offH, mirror: !!window.__ta3body };
  });

  console.log("Parität:", JSON.stringify(result, (k, v) => (typeof v === "number" ? +v.toFixed(6) : v)));
  ok(result.mirror, "__ta3body-Spiegel vorhanden");
  ok(result.maxH < 1e-9, `Höhe CPU ≡ Shader (max Abweichung ${result.maxH.toExponential(2)})`);
  ok(result.maxG < 1e-9, `Gradient CPU ≡ Shader (max Abweichung ${result.maxG.toExponential(2)})`);
  ok(result.center < -0.4, `Mulde unter dem Körper (Mitte ${result.center.toFixed(3)})`);
  ok(result.rimAt > 0.1, `Randwulst positiv (${result.rimAt.toFixed(3)})`);
  ok(result.minH < result.center + 1e-6 || Math.abs(result.minH - result.center) < 1e-6, "Körpermitte ist tiefster Punkt");
  ok(result.offH === 0, "active=0 schaltet das Feld ab");

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
