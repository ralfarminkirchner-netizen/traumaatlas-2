// Screenshot-Helfer: startet Dev-Server (Port 7319), führt Szenarien aus,
// speichert Screenshots nach /tmp/ta3-shots/, beendet den Server wieder.
// Aufruf: node qa/shot.mjs <szenario[,szenario...]>
// Szenarien: idle | sail | overview | phen | island | mobile | rm
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, createWriteStream } from "node:fs";

const scenarios = (process.argv[2] || "idle").split(",");
const PORT = 7319;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "/tmp/ta3-shots";
mkdirSync(SHOTS, { recursive: true });

const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
const server = spawn("npm", ["run", "dev", "--", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log);
server.stderr.pipe(log);

const kill = () => { try { server.kill("SIGTERM"); } catch { /* ok */ } };
process.on("exit", kill);
process.on("SIGINT", () => { kill(); process.exit(130); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* noch nicht da */ }
    await sleep(800);
  }
  throw new Error("Dev-Server nicht erreichbar — siehe /tmp/ta3-dev.log");
}

async function warmup() {
  // Erste Seitenladung triggert Vite-Transform (auf dieser Maschine bis ~2 min)
  const t0 = Date.now();
  const r = await fetch(BASE);
  await r.text();
  console.log(`warmup ${(Date.now() - t0) / 1000}s`);
}

const errors = [];
const browser = await chromium.launch();

async function newPage(mobile = false, rm = false) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile,
    reducedMotion: rm ? "reduce" : undefined,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
  await sleep(3500);
  return page;
}

try {
  await waitForServer();
  await warmup();

  for (const scenario of scenarios) {
    const page = await newPage(scenario === "mobile", scenario === "rm");

    if (scenario === "idle" || scenario === "rm" || scenario === "mobile") {
      await page.screenshot({ path: `${SHOTS}/${scenario}.png` });
    }

    if (scenario === "sail") {
      await page.mouse.move(500, 450);
      for (let i = 0; i < 20; i++) await page.mouse.move(500 + i * 18, 450 + Math.sin(i / 2.5) * 70, { steps: 2 });
      await sleep(600);
      await page.selectOption("#ta3-chapter-jump", "lexikon");
      await sleep(1400);
      await page.screenshot({ path: `${SHOTS}/sail-mid.png` });
      await sleep(4500);
      await page.screenshot({ path: `${SHOTS}/sail-arrived.png` });
      await page.keyboard.press("Escape");
      await sleep(1200);
      await page.screenshot({ path: `${SHOTS}/sail-back.png` });
    }

    if (scenario === "overview") {
      await page.getByRole("button", { name: "Karte" }).click();
      await sleep(2600);
      await page.screenshot({ path: `${SHOTS}/overview.png` });
    }

    if (scenario === "phen") {
      await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
      await page.press("#ta3-phen-input", "Enter");
      await sleep(2500);
      await page.screenshot({ path: `${SHOTS}/phen.png` });
    }

    if (scenario === "island") {
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, -600);
      await sleep(2000);
      await page.screenshot({ path: `${SHOTS}/island.png` });
    }

    console.log(`SHOT  ${scenario} ✓`);
    await page.close();
  }
} finally {
  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 12).join("\n")}` : "0 Konsolenfehler");
  await browser.close();
  kill();
}
