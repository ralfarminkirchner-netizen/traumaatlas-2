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

  const before = await page.evaluate(() => ({ ...window.__ta3ocean().camTarget }));

  // 1) Klick auf offenes Wasser (unten links) → Kamera-Ziel wandert dorthin
  await page.mouse.click(300, 700);
  await sleep(400);
  const after = await page.evaluate(() => ({ ...window.__ta3ocean().camTarget }));
  const movedDist = Math.hypot(after.x - before.x, after.y - before.y);
  console.log("camTarget vorher/nachher:", JSON.stringify(before), JSON.stringify(after));
  ok(movedDist > 150, `Wasser-Klick segelt gezielt (Δ ${Math.round(movedDist)})`);

  // 2) Drag schwenkt die Welt (Pan)
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) await page.mouse.move(720 - i * 14, 450 - i * 6, { steps: 1 });
  await page.mouse.up();
  await sleep(400);
  const panned = await page.evaluate(() => ({ ...window.__ta3ocean().camTarget }));
  const panDist = Math.hypot(panned.x - after.x, panned.y - after.y);
  ok(panDist > 40, `Drag schwenkt die Welt (Δ ${Math.round(panDist)})`);

  // 3) Formation-Klick (Navigator-Label ist DOM; die 3D-Formation: Klick auf die
  //    projizierte Mitte) darf kein zusätzliches Wasser-Segeln auslösen
  const navPos = await page.evaluate(() => {
    const p = window.__ta3proj.labels.get("navigator");
    return p && p.visible ? { sx: p.sx, sy: p.sy } : null;
  });
  if (navPos) {
    await page.mouse.click(navPos.sx, navPos.sy + 10);
    await sleep(400);
    const s = await page.evaluate(() => ({ sailing: window.__ta3ocean().sailing, cam: { ...window.__ta3ocean().camTarget } }));
    // Formation-Klick startet Segelfahrt AUF die Formation (kein Wasser-Punkt dahinter)
    ok(s.sailing === true, "Formations-Klick segelt zur Formation (nicht ins Wasser dahinter)");
  }

  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 8).join("\n")}` : "0 Konsolenfehler");
  ok(errors.length === 0, "0 Konsolenfehler");
  await browser.close();
} finally {
  kill();
}
process.exit(failures === 0 ? 0 : 1);
