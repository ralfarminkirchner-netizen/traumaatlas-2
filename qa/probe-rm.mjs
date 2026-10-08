// RM-Probe: reduced-motion-Kontext, Kapitel öffnen, App-Zustand beobachten.
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0, 200)); });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
await sleep(2500);

const pre = await page.evaluate(() => {
  const s = window.__ta3ocean();
  return { cam: s.cam, target: s.camTarget, view: s.view, sailing: s.sailing };
});
console.log("vor Auswahl:", JSON.stringify(pre));

await page.selectOption("#ta3-chapter-jump", "lexikon");
for (let i = 0; i < 5; i++) {
  await sleep(2000);
  const cur = await page.evaluate(() => {
    const s = window.__ta3ocean();
    return { cam: s.cam, target: s.camTarget, view: s.view, sailing: s.sailing };
  });
  console.log(`t+${(i + 1) * 2}s:`, JSON.stringify(cur));
  if (cur.view) break;
}
await page.screenshot({ path: "/tmp/ta3-shots/rm-probe.png" });
await browser.close();
kill();
