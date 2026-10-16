// Live-Beweis für das Deployment: Kosmos in Tageswelt + Schattenwelt fotografieren,
// Schutz-Lesart prüfen, Konsolenfehler zählen. Kein lokaler Dev-Server nötig.
// Aufruf: node qa/shot-live-shadow.mjs [url]
// Erwartet: https://traumaatlas-6-production.up.railway.app
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.argv[2] || "https://traumaatlas-6-production.up.railway.app";
const SHOTS = new URL("../qa-shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(15000); // Coldstart abwarten
await page.selectOption("#ta3-chapter-jump", "kosmos");
await page.waitForTimeout(7000);
await page.screenshot({ path: `${SHOTS}live-shadow-tageswelt.png` });

await page.evaluate(() => window.__ta6universe?.setWelt("schatten"));
await page.waitForTimeout(5000);
const lesart = await page.evaluate(() => document.body.innerText.includes("gelesen von der anderen Seite"));
await page.screenshot({ path: `${SHOTS}live-shadow-schattenwelt.png` });
console.log("LIVE OK |", BASE_URL, "| Schatten-Lesart:", lesart ? "JA" : "NEIN", "| console errors:", errors.length);
await browser.close();
process.exit(errors.length === 0 && lesart ? 0 : 1);
