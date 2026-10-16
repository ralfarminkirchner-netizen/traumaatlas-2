// Shadow-Probe: Weltwechsel im Kosmos (Hin- und Rückweg), Schutz-Lesart in
// der Detailkarte, Übergang ohne Konsolenfehler. Bildbeweis nach /tmp/ta3-shots.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createWriteStream, mkdirSync } from "node:fs";

const PORT = 8471;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "/tmp/ta3-shots";
mkdirSync(SHOTS, { recursive: true });
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

let fehler = 0;
const pruefe = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) fehler++;
};

await waitForServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text()); });
page.on("pageerror", (e) => consoleErrs.push(String(e)));
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
await sleep(1500);

// Kosmos öffnen, Weltwechsel über den QA-Spiegel (UI-Button identisch, aber
// deterministisch für die Probe)
await page.selectOption("#ta3-chapter-jump", "kosmos");
await sleep(6000);
await page.screenshot({ path: `${SHOTS}/shadow-tageswelt.png` });

await page.evaluate(() => window.__ta6universe.setWelt("schatten"));
await sleep(4500); // Morph 1.4 s + Atmung läuft
await page.screenshot({ path: `${SHOTS}/shadow-schattenwelt.png` });

const zustand = await page.evaluate(() => ({
  welt: window.__ta6universe.getWelt(),
  intro: document.body.innerText.includes("gelesen von der anderen Seite"),
  button: document.body.innerText.includes("Schattenwelt"),
}));
pruefe("Welt = schatten gesetzt", zustand.welt === "schatten", zustand.welt);
pruefe("Intro zeigt Schatten-Lesart", zustand.intro);

// Detailkarte: Knoten wählen → Schutz-Lesart sichtbar
await page.selectOption("select", "erstarrung").catch(() => {});
await sleep(1200);
const karte = await page.evaluate(() => ({
  notbremse: document.body.innerText.includes("Notbremse"),
  gerettet: document.body.innerText.includes("gerettet"),
}));
pruefe("NodeCard zeigt Schutz-Lesart (erstarrung → Notbremse)", karte.notbremse && karte.gerettet);
await page.screenshot({ path: `${SHOTS}/shadow-detailkarte.png` });

// Rückweg
await page.evaluate(() => window.__ta6universe.setWelt("meer"));
await sleep(2500);
const zurueck = await page.evaluate(() => window.__ta6universe.getWelt());
pruefe("Rückweg zur Tageswelt am selben Ort", zurueck === "meer");

pruefe("0 Konsolenfehler im gesamten Wechsel", consoleErrs.length === 0, consoleErrs.slice(0, 2).join(" | ").slice(0, 200));

await browser.close();
kill();
console.log(fehler === 0 ? "PROBE-SHADOW OK" : `PROBE-SHADOW FAIL (${fehler})`);
process.exit(fehler === 0 ? 0 : 1);
