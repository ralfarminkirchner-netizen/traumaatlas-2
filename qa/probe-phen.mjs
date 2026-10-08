// Fokus-Probe für 3D-Phänomene: zwei verwandte Phänomene eingeben,
// auf Arme warten, Boje per projizierter Position anklicken, Karte prüfen.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, createWriteStream } from "node:fs";

const PORT = 8471;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "/tmp/ta3-shots";
mkdirSync(SHOTS, { recursive: true });

const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.pipe(log);
server.stderr.pipe(log);
const kill = () => { try { server.kill("SIGTERM"); } catch { /* ok */ } };
process.on("exit", kill);
process.on("SIGINT", () => { kill(); process.exit(130); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 300000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* noch nicht da */ }
    await sleep(800);
  }
  throw new Error("Dev-Server nicht erreichbar");
}

const errors = [];
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
  await sleep(3000);

  // Zwei verwandte Phänomene → Arme sollten wachsen
  await page.fill("#ta3-phen-input", "ständige Erschöpfung und Angst");
  await page.press("#ta3-phen-input", "Enter");
  await sleep(1200);
  await page.keyboard.press("Escape"); // Karte schließen via Wasser-Klick simulieren nicht nötig
  await page.fill("#ta3-phen-input", "Schlafstörungen und innere Angst");
  await page.press("#ta3-phen-input", "Enter");
  await sleep(9000); // drift + Arm-Wachstum

  const armInfo = await page.evaluate(() => {
    const s = window.__ta3ocean();
    return { arms: s.arms.length, growth: s.arms.map((a) => a.growth), phen: s.phenomena.length, selected: s.selected };
  });
  console.log("armInfo:", JSON.stringify(armInfo));
  ok(armInfo.phen === 2, "zwei Phänomene im Meer");
  ok(armInfo.arms >= 1, "mindestens ein Arm gebildet");
  await page.screenshot({ path: `${SHOTS}/probe-arms.png` });

  // Boje klicken → Brücken-Karte erscheint
  const pos = await page.evaluate(() => {
    const first = [...window.__ta3proj.phen.values()][0];
    return first ? { sx: first.sx, sy: first.sy, visible: first.visible } : null;
  });
  ok(!!pos && pos.visible, "Boje projiziert + sichtbar");
  if (pos) {
    await page.mouse.click(pos.sx, pos.sy);
    await sleep(1200);
    const sel = await page.evaluate(() => window.__ta3ocean().selected);
    ok(!!sel, "Boje-Klick selektiert das Phänomen (Raycast)");
    const card = page.getByRole("dialog", { name: /Phänomen:/ });
    await card.waitFor({ state: "visible", timeout: 5000 }).catch(() => undefined);
    ok(await card.count() >= 1, "Brücken-Karte sichtbar nach Boje-Klick");
    await page.screenshot({ path: `${SHOTS}/probe-buoy-card.png` });
    // Wasser-Klick schließt
    await page.mouse.click(300, 750);
    await sleep(800);
    const sel2 = await page.evaluate(() => window.__ta3ocean().selected);
    ok(sel2 === null, "Wasser-Klick schließt die Auswahl");
  }

  // 3D-Insel-Label klicken → Segeln beginnt
  await page.getByRole("button", { name: /Kosmos: Der große Graph ansegeln/ }).click();
  await sleep(1500);
  const sailing = await page.evaluate(() => window.__ta3ocean().sailing);
  ok(sailing === true, "Klick auf 3D-Insel-Label startet Segelfahrt");

  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 8).join("\n")}` : "0 Konsolenfehler");
  ok(errors.length === 0, "0 Konsolenfehler");
  await browser.close();
} finally {
  kill();
}
process.exit(failures === 0 ? 0 : 1);
