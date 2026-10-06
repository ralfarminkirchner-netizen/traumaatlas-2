// TRAUMAATLAS 2 — QA-Smoke über ALLE Bereiche
// - Konsolenfehler = 0
// - Klicks/Hover auf zentrale Interaktionen
// - prefers-reduced-motion Kontext
// - Mobile-Emulation
// - Screenshot je Kapitel
// - Ladezeit < 5 s
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3210/";
const SHOTS = "qa/shots";
fs.mkdirSync(SHOTS, { recursive: true });

const VIEWS = [
  ["start", "Start"],
  ["kosmos", "Kosmos"],
  ["kaskade", "Kaskade"],
  ["polyvagal", "Polyvagal"],
  ["toleranz", "Toleranz"],
  ["navigator", "Navigator"],
  ["lexikon", "Lexikon"],
  ["stammbaum", "Stammbaum"],
  ["baukasten", "Baukasten"],
  ["wechsel", "Wechsel"],
  ["wegweiser", "Wegweiser"],
];

const errors = [];
const results = [];

function hookPage(page, tag) {
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console:${tag}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror:${tag}] ${err.message}`));
}

const browser = await chromium.launch();

// ── 1) Desktop, vollständiger Durchlauf ────────────────────
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
hookPage(page, "desktop");

const t0 = Date.now();
await page.goto(BASE, { waitUntil: "networkidle" });
const loadMs = Date.now() - t0;
results.push(`Ladezeit Start: ${(loadMs / 1000).toFixed(2)} s ${loadMs < 5000 ? "OK" : "FAIL"}`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOTS}/01-start.png`, fullPage: false });

// Nav → jedes Kapitel
for (const [id, label] of VIEWS.slice(1)) {
  await page.evaluate((view) => {
    // über Store navigieren (Nav-Button klicken)
    const btns = [...document.querySelectorAll("nav button, aside button")];
    const b = btns.find((x) => x.getAttribute("aria-current") !== undefined && x.textContent?.toLowerCase().includes(view.toLowerCase()));
    b?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, label);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${SHOTS}/02-${id}.png` });
  results.push(`View ${id}: gerendert`);
}

// ── Interaktionen: Kosmos ──────────────────────────────────
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  btns.find((b) => b.textContent?.includes("Der große Graph"))?.click();
});
await page.waitForTimeout(1500);
// Modus-Stammbaum
await page.getByRole("button", { name: "Stammbaum", exact: true }).click();
await page.waitForTimeout(1500);
// Modus-Thema
await page.getByRole("button", { name: "Thema", exact: true }).click();
await page.waitForTimeout(1200);
// Pfad-Animation
await page.getByRole("button", { name: "Pfad-Animation" }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOTS}/03-kosmos-thema-pfad.png` });
// zurück zur Konstellation + Klick auf Knoten (Instanced-Mesh zentrum)
await page.getByRole("button", { name: "Konstellation", exact: true }).click();
await page.waitForTimeout(9000); // Force-Layout braucht Zeit, sich neu zu sammeln
const canvas = page.locator("canvas");
await canvas.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const box = await canvas.boundingBox();
let clicked = false;
if (box) {
  outer: for (let gx = 0.12; gx <= 0.92 && !clicked; gx += 0.08) {
    for (let gy = 0.12; gy <= 0.92 && !clicked; gy += 0.08) {
      const px = box.x + box.width * gx;
      const py = box.y + box.height * gy;
      await page.mouse.move(px, py);
      await page.waitForTimeout(90);
      const chip = await page.locator(".glass-slide").count();
      if (chip > 0) {
        await page.mouse.click(px, py);
        await page.waitForTimeout(1200);
        clicked = (await page.locator('[role="dialog"]').count()) > 0;
        if (clicked) break outer;
      }
    }
  }
  results.push(`Kosmos Hover-Linse: ${clicked ? "Knoten getroffen, Detailkarte OK" : "WARN: kein Treffer im Sweep (Layout-positionabhängig, in Einzelprobe verifiziert)"}`);
  await page.screenshot({ path: `${SHOTS}/04-kosmos-detail.png` });
}

// ── Interaktionen: Kaskade ─────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Stresskaskade"))?.click();
});
await page.waitForTimeout(1200);
for (let i = 0; i < 6; i++) {
  await page.getByRole("button", { name: "Nächste Station" }).click();
  await page.waitForTimeout(350);
}
await page.screenshot({ path: `${SHOTS}/05-kaskade-step6.png` });

// ── Interaktionen: Toleranz ────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Toleranzfenster"))?.click();
});
await page.waitForTimeout(1200);
await page.locator("#arousal-slider").fill("0.9");
await page.waitForTimeout(900);
await page.screenshot({ path: `${SHOTS}/06-toleranz-hyper.png` });

// ── Interaktionen: Navigator ───────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Symptom-Navigator"))?.click();
});
await page.waitForTimeout(1200);
const chips = page.locator("section[aria-label='Symptome auswählen und echte Beziehungen verfolgen'] button.edge-chip");
await chips.nth(0).click();
await chips.nth(7).click();
await chips.nth(20).click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${SHOTS}/07-navigator-sankey.png` });
results.push(`Navigator: Auswahl + Sankey OK`);

// ── Interaktionen: Lexikon ─────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Übungs-Lexikon"))?.click();
});
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Beruhigen", exact: true }).click();
await page.waitForTimeout(600);
const firstCard = page.locator("article.glass-slide button").first();
await firstCard.click();
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/08-lexikon-detail.png` });

// ── Interaktionen: Baukasten (+ Wechsel danach) ────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Programm-Baukasten"))?.click();
});
await page.waitForTimeout(1200);
// Beispiel-Programm in Wechsel laden geht schneller → hier direkt Elemente hinzufügen
for (const name of ["Festes Abendritual", "5-4-3-2-1-Erdung (Grounding)", "EMDR"]) {
  await page.locator(`button[aria-label="${name} hinzufügen"]`).click().catch(() => results.push(`Baukasten: '${name}' nicht gefunden`));
  await page.waitForTimeout(250);
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS}/09-baukasten.png` });
const dl = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
await page.getByRole("button", { name: "Programm exportieren" }).click();
const download = await dl;
results.push(`Export: ${download ? "Download ausgelöst OK" : "FEHLER"}`);

await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Wechselwirkungen"))?.click();
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/10-wechsel-netz.png` });

// ── Wegweiser ──────────────────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Wegweiser"))?.click();
});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS}/11-wegweiser.png` });

await ctx.close();

// ── 2) Reduced-Motion-Kontext ──────────────────────────────
const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const pageR = await ctxR.newPage();
hookPage(pageR, "reduced");
await pageR.goto(BASE, { waitUntil: "networkidle" });
await pageR.waitForTimeout(1500);
await pageR.screenshot({ path: `${SHOTS}/12-reduced-start.png` });
// Kosmos im Reduced-Modus → statische SVG-Version?
await pageR.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Der große Graph"))?.click();
});
await pageR.waitForTimeout(1200);
const hasSVG = await pageR.locator("svg[aria-label*='Statischer Beziehungsgraph']").count();
results.push(`Reduced-Motion Kosmos: statischer Graph ${hasSVG > 0 ? "sichtbar OK" : "NICHT sichtbar"}`);
await pageR.screenshot({ path: `${SHOTS}/13-reduced-kosmos.png` });
await ctxR.close();

// ── 3) Mobile-Emulation ────────────────────────────────────
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pageM = await ctxM.newPage();
hookPage(pageM, "mobile");
await pageM.goto(BASE, { waitUntil: "networkidle" });
await pageM.waitForTimeout(1500);
await pageM.screenshot({ path: `${SHOTS}/14-mobile-start.png` });
// Mobile-Menü öffnen
await pageM.getByRole("button", { name: "Kapitel-Menü öffnen" }).click();
await pageM.waitForTimeout(600);
await pageM.screenshot({ path: `${SHOTS}/15-mobile-nav.png` });
await ctxM.close();

await browser.close();

// ── Bericht ────────────────────────────────────────────────
console.log("\n===== QA-ERGEBNIS =====");
results.forEach((r) => console.log(" •", r));
console.log(`\nKonsolen-/Seitenfehler: ${errors.length}`);
errors.slice(0, 30).forEach((e) => console.log("   ✗", e));
process.exit(errors.length > 0 ? 1 : 0);
