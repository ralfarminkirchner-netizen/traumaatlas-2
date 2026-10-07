// TRAUMAATLAS 3 — Smoke-QA über ALLE Bereiche.
// Run 1: Desktop — Meer, Phänomen + Brücke, alle 10 Kapitel mit Screenshots,
//        gezielte Interaktionen (Baukasten, Wechsel-Overlays, Lexikon, Wegweiser).
// Run 2: reduced-motion — Meer statisch, Lexikon-Videos mit Controls.
// Run 3: Mobile-Viewport — Meer + zwei Kapitel.
// Exit 1 bei Konsolenfehlern.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:7319/";
const SHOTS = "/tmp/ta3-qa";
mkdirSync(SHOTS, { recursive: true });

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

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

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
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/01-phaenomen.png` });
  const bridge = phenCard.getByRole("button", { name: "Brücke öffnen" }).first();
  if (await bridge.count()) {
    await bridge.click();
    await page.waitForTimeout(500);
    ok(await phenCard.getByText("verbunden").first().count() >= 1, "Brücke bestätigt (verbunden)");
  } else {
    console.log("INFO  keine offene Brücke (alle auto-bestätigt)");
  }
  await page.screenshot({ path: `${SHOTS}/02-bruecke.png` });
  await phenCard.getByRole("button", { name: "Schließen" }).click();
  await page.waitForTimeout(400);

  // Alle Kapitel durchsegeln
  for (const [id, title] of CHAPTERS) {
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
        await ov2.getByRole("button", { name: "Schließen" }).click();
        // Tastatur: Fokus + Enter öffnet ebenfalls
        const node2 = dialog.locator("g[role='button'][aria-label*='(Baustein)']").first();
        await node2.focus();
        await page.keyboard.press("Enter");
        const ov3 = page.getByRole("dialog", { name: /Element:/ });
        await ov3.waitFor({ state: "visible", timeout: 5000 });
        ok(true, "Wechsel: Knoten per Tastatur (Enter) öffnbar");
        await ov3.getByRole("button", { name: "Schließen" }).click();
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

await runDesktop();
await runReduced();
await runMobile();

console.log(failures === 0 ? "\nALLE CHECKS BESTANDEN" : `\n${failures} CHECK(S) FEHLGESCHLAGEN`);
process.exit(failures === 0 ? 0 : 1);
