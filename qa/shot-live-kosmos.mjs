// Screenshot-Helfer für die LIVE-Deployment (Railway) — ohne lokalen
// Dev-Server, dadurch unabhängig vom lokalen WIP-Zustand.
// Aufruf: node qa/shot-live-kosmos.mjs [url]
// 1) Kosmos-Kapitel mit Reduced-Motion → GraphFallback (statischer SVG-Graph,
//    komplett mit Legende) — ideal, um Daten-Integration zu verifizieren.
// 2) Versuch: echtes WebGL via SwiftShader-Flags.
// Speichert nach qa-shots/live-*.png und druckt Graph-Zähler + Legende.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.argv[2] || "https://traumaatlas-5-production.up.railway.app";
const SHOTS = new URL("../qa-shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();

// ── Lauf 1: Reduced-Motion → GraphFallback ────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);
  await page.selectOption("#ta3-chapter-jump", "kosmos");
  await page.waitForTimeout(5000);
  const label = await page.locator("svg[role='img']").first().getAttribute("aria-label").catch(() => "(kein aria-label)");
  const legend = await page.locator("text=Neuroprofile").count();
  await page.screenshot({ path: `${SHOTS}live-kosmos-rm.png` });
  console.log("RM-SHOT OK |", label, "| Legende 'Neuroprofile':", legend === 0 ? "NEIN" : "JA", "| console errors:", errors.length);
  await ctx.close();
}

// ── Lauf 2: WebGL-Versuch mit SwiftShader ─────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(10000);
  await page.selectOption("#ta3-chapter-jump", "kosmos");
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${SHOTS}live-kosmos-3d.png` });
  console.log("3D-SHOT OK | console errors:", errors.length);
  await ctx.close();
}

await browser.close();
