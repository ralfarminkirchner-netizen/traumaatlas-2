// TRAUMAATLAS 3 — Smoke-QA über ALLE Bereiche.
// Run 1: Desktop — Meer, Phänomen + Brücke, 3D-Checks (Boje/Label/Übersicht),
//        alle 10 Kapitel mit Screenshots, gezielte Interaktionen.
// Run 2: reduced-motion — Meer statisch, Lexikon-Videos mit Controls.
// Run 3: Mobile-Viewport — Meer + zwei Kapitel.
// Startet den Dev-Server selbst (Port 8471; per TA3_QA_PORT überschreibbar) und räumt auf.
// Aufruf: node qa/ta3-smoke.mjs [desktop|rm|mobile] (ohne Arg = alle)
// Exit 1 bei Konsolenfehlern oder fehlgeschlagenen Checks.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, createWriteStream } from "node:fs";

const PORT = Number(process.env.TA3_QA_PORT || 8471);
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "/tmp/ta3-qa";
mkdirSync(SHOTS, { recursive: true });

// ── Dev-Server (vite direkt, damit SIGTERM wirkt) ──
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
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForServer(timeoutMs = 300000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* noch nicht da */ }
    await sleepMs(800);
  }
  throw new Error("Dev-Server nicht erreichbar — siehe /tmp/ta3-dev.log");
}

const CHAPTERS = [
  ["kosmos", "Der große Graph"],
  ["kaskade", "Die Stresskaskade"],
  ["polyvagal", "Drei Ebenen"],
  ["toleranz", "Toleranzfenster"],
  ["navigator", "Symptom-Navigator"],
  ["lexikon", "Übungs-Lexikon"],
  ["stammbaum", "Halle der Ahnen"],
  ["wechsel", "Wechselwirkungen"],
  ["wegweiser", "Wegweiser"],
  // Baukasten zuletzt: verändert das Programm (Wechsel-Vorschau braucht leeres Programm)
  ["baukasten", "Programm-Baukasten"],
];
// Zeitlupen-Maschine: Tour ab Index N fortsetzen (zwei Läufe à < 5 min,
// gemeinsam volle Abdeckung) — TA3_SMOKE_FROM=5 deckt lexikon..baukasten ab.
const CHAPTERS_FROM = Number(process.env.TA3_SMOKE_FROM || 0);

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

// Zeitlupen-Klick für animierte Karten: auf Maschinen mit ~5-fps-rAF brauchen
// Stabilitätsprüfungen sehr lange — lieber geduldig warten als fehlklicken.
const calmClick = (loc) => loc.click({ timeout: 90000 });

async function gotoSea(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90000 });
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(4000);
    if (await page.locator("#ta3-phen-input").count()) return;
  }
}

function watch(page, tag, errors) {
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${tag}] ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${tag}] ${String(e)}`));
}

async function openChapter(page, id, title) {
  await page.selectOption("#ta3-chapter-jump", id);
  const dialog = page.getByRole("dialog", { name: new RegExp(`Kapitel: ${title}`) });
  await dialog.waitFor({ state: "visible", timeout: 25000 });
  await page.waitForTimeout(1600);
  return dialog;
}

async function closeChapter(page) {
  await page.getByRole("button", { name: /Zurück ans Meer/ }).click();
  await page.waitForTimeout(900);
}

// ── Run 1: Desktop ───────────────────────────────────────────
async function runDesktop() {
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page, "desktop", errors);

  await gotoSea(page);
  await page.waitForTimeout(1500);

  const canvasCount = await page.locator("canvas").count();
  ok(canvasCount >= 1, `Meer-Canvas vorhanden (${canvasCount})`);

  // Kielwasser
  await page.mouse.move(400, 400);
  for (let i = 0; i < 30; i++) await page.mouse.move(400 + i * 20, 400 + Math.sin(i / 3) * 90, { steps: 2 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/00-meer.png` });

  // Phänomen eingeben → Karte → Brücke öffnen
  await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
  await page.press("#ta3-phen-input", "Enter");
  const phenCard = page.getByRole("dialog", { name: /Phänomen:/ });
  await phenCard.waitFor({ state: "visible", timeout: 8000 });
  // Zeitlupen-Maschine: Karten-Animation (gestaffelte Brücken-Zeilen) abwarten,
  // sonst klickt der Brücke-Button während des Layout-Shifts daneben (Canvas-Raycast)
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/01-phaenomen.png` });
  const bridge = phenCard.getByRole("button", { name: "Brücke öffnen" }).first();
  if (await bridge.count()) {
    await bridge.click({ timeout: 90000 });
    await page.waitForTimeout(1500);
    ok(await phenCard.getByText("verbunden").first().count() >= 1, "Brücke bestätigt (verbunden)");
  } else {
    console.log("INFO  keine offene Brücke (alle auto-bestätigt)");
  }
  await page.screenshot({ path: `${SHOTS}/02-bruecke.png` });
  await calmClick(phenCard.getByRole("button", { name: "Schließen" }));
  await page.waitForTimeout(400);

  // ── 3D-Checks: Bojen-Raycast → Brückenkarte, Übersichts-Zoom, Insel-Label ──
  // (im Meer treiben inzwischen viele Körper — den ersten SICHTBAREN nehmen)
  const buoyPos = await page.evaluate(() => {
    const entries = [...(window.__ta3proj?.phen?.values() ?? [])];
    const vis = entries.find((e) => e.visible && e.sx > 40 && e.sx < window.innerWidth - 40 && e.sy > 40 && e.sy < window.innerHeight - 120);
    return vis ? { sx: vis.sx, sy: vis.sy } : null;
  });
  ok(!!buoyPos, "3D: Boje projiziert + sichtbar");
  if (buoyPos) {
    await page.mouse.click(buoyPos.sx, buoyPos.sy);
    await page.waitForTimeout(900);
    const sel = await page.evaluate(() => window.__ta3ocean?.().selected ?? null);
    ok(!!sel, "3D: Boje-Klick selektiert Phänomen (Raycast)");
    ok(await phenCard.count() >= 1, "3D: Brückenkarte nach Boje-Klick sichtbar");
    await page.screenshot({ path: `${SHOTS}/03-boje-karte.png` });
    await calmClick(phenCard.getByRole("button", { name: "Schließen" }));
    await page.waitForTimeout(400);
  }

  await page.getByRole("button", { name: "Karte" }).click();
  await page.waitForTimeout(2400);
  const ov = await page.evaluate(() => window.__ta3ocean?.().overview ?? false);
  ok(ov === true, "3D: Übersichts-Zoom aktiv");
  const labelCount = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label$="ansegeln"]')]
      .filter((el) => el.style.opacity !== "0" && el.style.opacity !== "").length);
  ok(labelCount >= 5, `3D: Insel-Labels in der Übersicht sichtbar (${labelCount})`);
  await page.screenshot({ path: `${SHOTS}/04-uebersicht.png` });

  // Insel-Label anklicken → Segelfahrt → Kapitel öffnet sich
  await page.getByRole("button", { name: /Kosmos: Der große Graph ansegeln/ }).click();
  const dialogKosmos = page.getByRole("dialog", { name: /Kapitel: Der große Graph/ });
  await dialogKosmos.waitFor({ state: "visible", timeout: 25000 });
  ok(await dialogKosmos.count() === 1, "3D: Klick auf Insel-Label öffnet Kapitel");
  await page.screenshot({ path: `${SHOTS}/05-label-segeln.png` });
  await closeChapter(page);

  // Alle Kapitel durchsegeln
  for (const [id, title] of CHAPTERS.slice(CHAPTERS_FROM)) {
    const dialog = await openChapter(page, id, title);
    ok(await dialog.count() === 1, `Kapitel offen: ${title}`);
    await page.screenshot({ path: `${SHOTS}/kap-${id}.png` });

    if (id === "baukasten") {
      const add = dialog.getByRole("button", { name: /hinzufügen$/ }).first();
      await add.click();
      await page.waitForTimeout(600);
      const inShelf = await dialog.getByRole("button", { name: /entfernen$/ }).count();
      ok(inShelf >= 1, `Baukasten: Element im Regal (${inShelf})`);
      await page.screenshot({ path: `${SHOTS}/kap-baukasten-regal.png` });
    }
    if (id === "wechsel") {
      // Regel-Chip → Overlay; ESC darf nur das Overlay schließen
      const chip = dialog.getByRole("group", { name: "Regeln im Netz hervorheben" }).getByRole("button").first();
      if (await chip.count()) {
        await chip.click();
        const ov = page.getByRole("dialog", { name: /Regel:/ });
        await ov.waitFor({ state: "visible", timeout: 5000 });
        await page.screenshot({ path: `${SHOTS}/kap-wechsel-overlay.png` });
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
        ok(await ov.count() === 0, "Wechsel: ESC schließt Overlay");
        ok(await dialog.count() === 1, "Wechsel: Kapitel bleibt nach ESC offen");
      }
      // Netz-Knoten → Element-Overlay (dispatchEvent: Knoten bewegen sich im Force-Layout)
      const node = dialog.locator("g[role='button'][aria-label*='(Übung)']").first();
      if (await node.count()) {
        await node.dispatchEvent("click");
        const ov2 = page.getByRole("dialog", { name: /Element:/ });
        await ov2.waitFor({ state: "visible", timeout: 5000 });
        await page.screenshot({ path: `${SHOTS}/kap-wechsel-element.png` });
        await ov2.getByRole("button", { name: "Schließen" }).click({ timeout: 90000 });
        // Tastatur: Fokus + Enter öffnet ebenfalls
        const node2 = dialog.locator("g[role='button'][aria-label*='(Baustein)']").first();
        await node2.focus();
        await page.keyboard.press("Enter");
        const ov3 = page.getByRole("dialog", { name: /Element:/ });
        await ov3.waitFor({ state: "visible", timeout: 5000 });
        ok(true, "Wechsel: Knoten per Tastatur (Enter) öffnbar");
        await ov3.getByRole("button", { name: "Schließen" }).click({ timeout: 90000 });
      } else {
        ok(false, "Wechsel: Netz-Knoten klickbar");
      }
    }
    if (id === "lexikon") {
      const vid = await dialog.locator("video").count();
      ok(vid >= 1, `Lexikon: Video-Loops vorhanden (${vid})`);
      const exBtn = dialog.locator("button[aria-expanded]").first();
      await exBtn.click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/kap-lexikon-detail.png` });
    }
    if (id === "wegweiser") {
      const navBtn = dialog.getByRole("navigation", { name: /Kategorien/ }).getByRole("button").nth(3);
      await navBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/kap-wegweiser-krisen.png` });
    }

    await closeChapter(page);
  }

  console.log("desktop console errors:", errors.length ? errors : "none");
  ok(errors.length === 0, "Desktop: 0 Konsolenfehler");
  await browser.close();
}

// ── Run 2: reduced-motion ────────────────────────────────────
async function runReduced() {
  const errors = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  watch(page, "reduced", errors);

  await gotoSea(page);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/rm-meer.png` });

  const dialog = await openChapter(page, "lexikon", "Übungs-Lexikon");
  ok(await dialog.count() === 1, "RM: Lexikon offen");
  const withControls = await page.locator("video[controls]").count();
  ok(withControls >= 1, `RM: Videos mit Controls (${withControls})`);
  await page.screenshot({ path: `${SHOTS}/rm-lexikon.png` });
  await closeChapter(page);

  console.log("reduced console errors:", errors.length ? errors : "none");
  ok(errors.length === 0, "RM: 0 Konsolenfehler");
  await browser.close();
}

// ── Run 3: Mobile ────────────────────────────────────────────
async function runMobile() {
  const errors = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  watch(page, "mobile", errors);

  await gotoSea(page);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${SHOTS}/mob-meer.png` });

  for (const [id, title] of [["navigator", "Symptom-Navigator"], ["wegweiser", "Wegweiser"]]) {
    const dialog = await openChapter(page, id, title);
    ok(await dialog.count() === 1, `Mobil: ${title} offen`);
    await page.screenshot({ path: `${SHOTS}/mob-${id}.png` });
    await closeChapter(page);
  }

  console.log("mobile console errors:", errors.length ? errors : "none");
  ok(errors.length === 0, "Mobil: 0 Konsolenfehler");
  await browser.close();
}

const which = process.argv[2] || "alle";
await waitForServer();
if (which === "alle" || which === "desktop") await runDesktop();
if (which === "alle" || which === "rm") await runReduced();
if (which === "alle" || which === "mobile") await runMobile();

console.log(failures === 0 ? "\nALLE CHECKS BESTANDEN" : `\n${failures} CHECK(S) FEHLGESCHLAGEN`);
kill();
process.exit(failures === 0 ? 0 : 1);
