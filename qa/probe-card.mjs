// Mini-Probe: Kartenposition der 3D-Phänomen-Karte auslesen (Viewport-Problem).
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(t0 = Date.now()) {
  while (Date.now() - t0 < 240000) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* */ }
    await sleep(800);
  }
  throw new Error("Server nicht da");
}

await waitForServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e)));
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
await sleep(3000);

await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
await page.press("#ta3-phen-input", "Enter");
await sleep(2500);

const info = await page.evaluate(() => {
  const card = document.querySelector('[role="dialog"][aria-label^="Phänomen:"]');
  const box = card?.getBoundingClientRect();
  return {
    phenProj: [...window.__ta3proj.phen.entries()],
    cardBox: box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null,
    cardStyle: card ? card.style.cssText : null,
    ocean: { cam: window.__ta3ocean().cam, selected: window.__ta3ocean().selected },
    vw: window.innerWidth, vh: window.innerHeight,
  };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: "/tmp/ta3-shots/probe-card.png" });
await browser.close();
kill();
