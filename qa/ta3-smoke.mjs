// Kurzer Rauchtest des Meeres
import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:7319/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// Wasser vorhanden?
const canvasCount = await page.locator("canvas").count();
console.log("canvas count:", canvasCount);

// Maus durchs Wasser bewegen → Wirbel
await page.mouse.move(400, 400);
for (let i = 0; i < 30; i++) {
  await page.mouse.move(400 + i * 20, 400 + Math.sin(i / 3) * 90, { steps: 2 });
}
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/ta3-sea-1.png" });

// Phänomen eingeben
await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
await page.press("#ta3-phen-input", "Enter");
await page.waitForTimeout(1200);
await page.screenshot({ path: "/tmp/ta3-sea-2.png" });

// Übersichtskarte
await page.getByRole("button", { name: "Karte" }).click();
await page.waitForTimeout(1800);
await page.screenshot({ path: "/tmp/ta3-sea-3.png" });

// Insel ansegeln (Kosmos)
await page.getByRole("button", { name: /Kosmos: Der große Graph ansegeln/ }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/ta3-sea-4.png" });
const dialogVisible = await page.getByRole("dialog", { name: /Kapitel/ }).count();
console.log("chapter dialog:", dialogVisible);

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
