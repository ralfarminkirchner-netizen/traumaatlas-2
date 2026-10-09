// Schwarm-Probe: Katalog um die Inseln, Bemerken bei Nähe, Fang bei Berührung
// (steigt als Atlas-Phänomen ein), Sammlungs-Zähler, Persistenz.
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
  await sleep(3500);

  // 1) Katalog: viele Wildlinge, um Inseln verteilt, mit Schwirrern
  const catalog = await page.evaluate(async () => {
    const wl = await import("/src/ocean/wildlife.ts");
    const homes = {};
    let away = 0;
    for (const w of wl.WILDLINGS) {
      homes[w.home] = (homes[w.home] || 0) + 1;
      if (w.away) away++;
    }
    return { total: wl.WILDLINGS.length, homes, away, progress: wl.wildProgress() };
  });
  console.log("Katalog:", JSON.stringify(catalog));
  ok(catalog.total >= 50, `viele Wildlinge im Meer (${catalog.total})`);
  ok(Object.keys(catalog.homes).length >= 3, `auf mehrere Inseln verteilt (${Object.keys(catalog.homes).length})`);
  ok(catalog.away >= 8, `Schwirrer zwischen den Feldern (${catalog.away})`);

  // 2) Bewegung: Positionen verändern sich (Treiben/Schwirren)
  const moved = await page.evaluate(async () => {
    const wl = await import("/src/ocean/wildlife.ts");
    const first = wl.WILDLINGS[0];
    const st = wl.wildState.get(first.id);
    const x0 = st.x, y0 = st.y;
    wl.stepWildlife(100);
    return Math.hypot(st.x - x0, st.y - y0);
  });
  ok(moved > 1, `Wildlinge treiben/schwirren (Δ ${moved.toFixed(1)})`);

  // 3) Bemerken bei Nähe + Label im DOM
  const notice = await page.evaluate(async () => {
    const wl = await import("/src/ocean/wildlife.ts");
    const co = await import("/src/ocean3d/coords.ts");
    // freien (ungefangenen) Wildling suchen und Schwimmer in Sichtweite setzen
    for (const w of wl.WILDLINGS) {
      const st = wl.wildState.get(w.id);
      if (st.caught) continue;
      window.__ta3swim.x = co.w2x(st.x) + 3.0;
      window.__ta3swim.z = co.w2z(st.y);
      window.__ta3swim.vx = 0; window.__ta3swim.vz = 0;
      return { id: w.id, label: w.label };
    }
    return null;
  });
  await sleep(1200);
  const labelVisible = await page.evaluate((id) => {
    const pr = window.__ta3proj.wildLabels.get(id);
    const el = document.querySelector(`[aria-label^="Phänomen begegnen:"]`);
    return { proj: !!pr?.visible, dom: !!el };
  }, notice.id);
  ok(labelVisible.proj && labelVisible.dom, `Nähe lässt den Wildling aufleuchten (Label im DOM)`);

  // 4) Fang bei Berührung: steigt als Atlas-Phänomen ein, Zähler +1, persistiert
  const before = await page.evaluate(async () => (await import("/src/ocean/wildlife.ts")).wildProgress().caught);
  await page.evaluate(async (id) => {
    const wl = await import("/src/ocean/wildlife.ts");
    const co = await import("/src/ocean3d/coords.ts");
    const st = wl.wildState.get(id);
    window.__ta3swim.x = co.w2x(st.x);
    window.__ta3swim.z = co.w2z(st.y);
  }, notice.id);
  await sleep(1000);
  const after = await page.evaluate(async (id) => {
    const wl = await import("/src/ocean/wildlife.ts");
    const st = wl.wildState.get(id);
    const ocean = window.__ta3ocean();
    const stored = JSON.parse(localStorage.getItem("ta4-wildlife-v1") || "[]");
    return {
      caught: st.caught,
      progress: wl.wildProgress().caught,
      buoy: ocean.phenomena.some((p) => !p.user),
      selected: ocean.selected !== null,
      stored: stored.includes(id),
    };
  }, notice.id);
  console.log("Fang:", JSON.stringify(after));
  ok(after.caught, `Berührung fängt den Wildling`);
  ok(after.progress > before, `Sammlungs-Zähler wächst (${before} → ${after.progress})`);
  ok(after.buoy, `gefangener Wildling steigt als Phänomen-Boje ein`);
  ok(after.selected, `Begegnung öffnet die Lesefläche`);
  ok(after.stored, `Fang persistiert (localStorage)`);

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
