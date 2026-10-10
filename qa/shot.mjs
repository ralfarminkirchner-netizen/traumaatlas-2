// Screenshot-Helfer: startet Dev-Server (Port 7319), führt Szenarien aus,
// speichert Screenshots nach /tmp/ta3-shots/, beendet den Server wieder.
// Aufruf: node qa/shot.mjs <szenario[,szenario...]>
// Szenarien: idle | sail | overview | phen | island | mobile | rm
// Port: 8471 (Default), per TA3_QA_PORT überschreibbar, falls belegt.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, createWriteStream } from "node:fs";

const scenarios = (process.argv[2] || "idle").split(",");
const PORT = Number(process.env.TA3_QA_PORT || 8471);
const BASE = `http://localhost:${PORT}/`;
const SHOTS = "/tmp/ta3-shots";
mkdirSync(SHOTS, { recursive: true });

const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
// vite direkt (ohne npm-Wrapper), damit SIGTERM den Server wirklich beendet
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"],
  { cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"] },
);
server.stdout.pipe(log);
server.stderr.pipe(log);
// Port schon von einem warmen Server bedient (TA3_QA_PORT-Muster)? Dann
// nicht abstürzen — waitForServer findet den laufenden Server selbst.
server.on("error", () => { /* EADDRINUSE o.ä.: warmer Server dient weiter */ });

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

    if (scenario === "arms") {
      // zwei verwandte Phänomene → ein Arm wächst zwischen ihnen
      await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
      await page.press("#ta3-phen-input", "Enter");
      await sleep(1400);
      // Karte per Klick ins freie Wasser schließen (ESC ist den Kapiteln vorbehalten)
      await page.mouse.click(1000, 650);
      await sleep(600);
      await page.locator("#ta3-phen-input").click();
      await page.fill("#ta3-phen-input", "Nachts wache ich mit Herzrasen und Panik auf");
      await page.press("#ta3-phen-input", "Enter");
      await sleep(1500);
      await page.mouse.click(1000, 650);
      await sleep(400);
      // etwas herauszoomen für den Überblick, dann wachsen lassen
      await page.mouse.move(720, 420);
      await page.mouse.wheel(0, 260);
      await sleep(3000);
      await page.screenshot({ path: `${SHOTS}/arms.png` });
    }

    if (scenario === "body") {
      // Starre Test-Position: Verdrängungs-Mulde sichtbar — freies Wasser,
      // Zeiger auf die Körperstelle, moderate Draufsicht
      await page.evaluate(() => {
        const b = window.__ta3body;
        b.x = 10; b.z = 8; b.r = 5.5; b.strength = 1.2; b.active = 1;
      });
      await page.mouse.move(720, 430);
      await page.mouse.wheel(0, 260);
      await sleep(2600);
      await page.screenshot({ path: `${SHOTS}/body.png` });
      // Gegenprobe: Feld aus → glattes Wasser
      await page.evaluate(() => { window.__ta3body.active = 0; });
      await sleep(900);
      await page.screenshot({ path: `${SHOTS}/body-off.png` });
    }

    if (scenario === "swim") {
      // Zeiger führt den Körper: diagonal über das Bild gleiten
      await page.mouse.move(380, 620);
      for (let i = 0; i < 24; i++) await page.mouse.move(380 + i * 24, 620 - i * 9, { steps: 2 });
      await sleep(600);
      await page.screenshot({ path: `${SHOTS}/swim-moving.png` });
      await sleep(2400);
      await page.screenshot({ path: `${SHOTS}/swim-rest.png` });
    }

    if (scenario === "feld" || scenario === "annehmen") {
      // kontrollierte Feld-Szene: Sog-Paar (Leere) + Barriere (Panik) um den Schwimmer
      await page.evaluate(async (openCard) => {
        const world = await import("/src/ocean/world.ts");
        const co = await import("/src/ocean3d/coords.ts");
        for (const p of [...window.__ta3ocean().phenomena]) world.removePhenomenon(p.id);
        const a = world.addPhenomenon("Ich fühle eine tiefe innere Leere und Hoffnungslosigkeit");
        const b = world.addPhenomenon("Ich fühle eine tiefe innere Leere und Hoffnungslosigkeit");
        const c = world.addPhenomenon("Ich habe Panikattacken mit Herzrasen");
        a.x = co.x2w(-5); a.y = co.z2w(-1); a.vx = a.vy = 0;
        b.x = co.x2w(-10); b.y = co.z2w(4); b.vx = b.vy = 0;
        c.x = co.x2w(7); c.y = co.z2w(-4); c.vx = c.vy = 0;
        window.__ta3swim.x = 1.5; window.__ta3swim.z = 0;
        window.__ta3swim.vx = 0; window.__ta3swim.vz = 0;
        if (openCard) {
          world.selectPhenomenon(a.id); // Begegnung öffnet die Lesefläche, Körper wächst
        } else {
          world.selectPhenomenon(null);
        }
      }, scenario === "annehmen");
      await sleep(scenario === "feld" ? 1600 : 2200);
      await page.screenshot({ path: `${SHOTS}/${scenario}.png` });
    }

    if (scenario === "schwarm") {
      // Schwimmer neben einen Wildling setzen: Bemerken, Label, Schwarm um die Insel
      await page.evaluate(async () => {
        const wl = await import("/src/ocean/wildlife.ts");
        const co = await import("/src/ocean3d/coords.ts");
        for (const w of wl.WILDLINGS) {
          const st = wl.wildState.get(w.id);
          if (st.caught || w.home !== "navigator" || w.away) continue;
          window.__ta3swim.x = co.w2x(st.x) + 2.5;
          window.__ta3swim.z = co.w2z(st.y) + 1.5;
          return;
        }
      });
      await sleep(2600);
      await page.screenshot({ path: `${SHOTS}/schwarm.png` });
    }

    if (scenario === "fahrt") {
      // Tastatur-Fahrt mit Maus-Look (Rennspiel): W halten, leicht lenken
      await page.keyboard.down("w");
      for (let i = 0; i < 6; i++) await page.mouse.move(720 + i * 30, 430, { steps: 1 });
      await sleep(1400);
      await page.screenshot({ path: `${SHOTS}/fahrt.png` });
      await page.keyboard.up("w");
    }

    if (scenario === "sprung") {
      // Wave-Race-Airtime: Absprung über der Kammflanke (erzwungen, Bildmitte Flug)
      await page.mouse.move(700, 520, { steps: 2 });
      await sleep(900);
      await page.evaluate(() => { const sw = window.__ta3swim; sw.vy = 3.4; sw.air = true; });
      await sleep(330);
      await page.screenshot({ path: `${SHOTS}/sprung.png` });
    }

    if (scenario === "welle") {
      // Starrer Paket-Sweep: Zeiger nicht bewegen — der Schwimmer bleibt,
      // das gepinnte Paket läuft mit eigener Dispersion durchs Bild.
      // Zuerst: ggf. offene Phänomen-Karte schließen (Meer frei, kein Backdrop)
      await page.evaluate(async () => {
        const world = await import("/src/ocean/world.ts");
        world.selectPhenomenon(null);
      });
      await sleep(900);
      // Kamera auf den Schwimmer holen: Zeiger einmal auf offenes Wasser legen
      // (der Schwimmer springt dorthin, die Kamera folgt), dann Paket pinnen.
      // (700, 260) = freie See — keine Bojen, keine Phänomene im Weg
      await page.mouse.move(700, 260);
      await sleep(1200);
      // Teleport kann eine Begegnung streifen: Karte sicherheitshalber zu
      await page.evaluate(async () => {
        const world = await import("/src/ocean/world.ts");
        world.selectPhenomenon(null);
      });
      await sleep(400);
      // 1) Volle Fahrt-Energie: steile Welle, bricht am Kamm (3 Phasen)
      await page.evaluate(() => {
        const sw = window.__ta3swim;
        sw.vx = 0; sw.vz = 0; sw.heading = Math.PI * 0.78;
        const pk = window.__ta3pack;
        pk.pinned = true;
        pk.x = sw.x; pk.z = sw.z;
        pk.dirX = Math.sin(sw.heading); pk.dirZ = -Math.cos(sw.heading);
        pk.energy = 800; pk.amp = 1.15; pk.active = 1;
      });
      await sleep(500);
      await page.screenshot({ path: `${SHOTS}/welle-voll-0.png` });
      await sleep(1200);
      await page.screenshot({ path: `${SHOTS}/welle-voll-1.png` });
      await sleep(1200);
      await page.screenshot({ path: `${SHOTS}/welle-voll-2.png` });
      // 2) Sachtes Gleiten: niedrige, ruhige Welle — keine Brechung
      await page.evaluate(() => { const pk = window.__ta3pack; pk.energy = 60; pk.amp = 0.35; });
      await sleep(700);
      await page.screenshot({ path: `${SHOTS}/welle-sacht.png` });
      // 3) Gegenprobe: Paket aus → nur Druckfeld-Mulde bleibt
      await page.evaluate(() => { window.__ta3pack.amp = 0; });
      await sleep(600);
      await page.screenshot({ path: `${SHOTS}/welle-aus.png` });
    }

    if (["dawn", "day", "dusk", "night"].includes(scenario)) {
      // Tageszeit-Szenarien: Phase pinnen, Welle leicht aktiv, Kamera wach
      const phases = { dawn: 0.27, day: 0.5, dusk: 0.74, night: 0.92 };
      await page.evaluate(async () => {
        const world = await import("/src/ocean/world.ts");
        world.selectPhenomenon(null);
      });
      await page.mouse.move(700, 400);
      await sleep(1400);
      await page.evaluate((ph) => {
        const d = window.__ta3day;
        d.paused = true; d.phase = ph; d.resumeAt = 0;
        const sw = window.__ta3swim;
        const pk = window.__ta3pack;
        pk.pinned = true;
        pk.x = sw.x; pk.z = sw.z;
        pk.dirX = Math.sin(sw.heading); pk.dirZ = -Math.cos(sw.heading);
        pk.energy = 220; pk.amp = 0.62; pk.active = 1;
      }, phases[scenario]);
      await sleep(1300);
      await page.screenshot({ path: `${SHOTS}/${scenario}.png` });
    }

    if (scenario === "welle2") {
      // Zwei gepinnte Pakete kreuzen sich weit draußen (3D (0,27) ≈ Welt
      // (2600,2140) — >800 Welteinheiten von jeder Insel, keine Wildling-
      // Bahnen): Kämme senkrecht, im Kreuz entsteht das Beugungsmuster
      // (lineare Addition — die Physik malt das Muster von selbst).
      await page.evaluate(() => {
        const sw = window.__ta3swim;
        sw.x = 0; sw.z = 27; sw.vx = 0; sw.vz = 0; sw.heading = Math.PI;
        // Kamera schaut im Zeiger-Modus nach Norden (−z): Pakete NÖRDLICH
        const pk = window.__ta3pack;
        pk.pinned = true;
        pk.x = -5.0; pk.z = 21;
        pk.dirX = 1; pk.dirZ = 0;
        pk.energy = 330; pk.amp = 0.75; pk.active = 1;
        const p2 = window.__ta3pack2;
        p2.pinned = true;
        p2.x = 5.0; p2.z = 21;
        p2.dirX = 0; p2.dirZ = 1;
        p2.energy = 330; p2.amp = 0.75; p2.active = 1;
      });
      await sleep(1800);
      const schliessen = page.getByRole("button", { name: "Schließen" });
      for (const name of ["welle2-0", "welle2-1", "welle2-2"]) {
        if (await schliessen.count()) { await schliessen.first().click(); await sleep(500); }
        await page.screenshot({ path: `${SHOTS}/${name}.png` });
        await sleep(1100);
      }
      // Gegenprobe: Paket 2 aus — nur Paket 1 bleibt
      await page.evaluate(() => { window.__ta3pack2.amp = 0; });
      await sleep(600);
      await page.screenshot({ path: `${SHOTS}/welle2-aus.png` });
    }

    if (scenario === "formen") {
      // Leuchtform hautnah: Phänomen eingeben (neue Form entsteht), Karte
      // schließen, Schwimmer in Sichtweite pinnen — Myzel-Fäden, Wirbel,
      // Wasser-Färbung. Drei Phasen wegen Morph/Wirbel.
      await page.fill("#ta3-phen-input", "Ich bin ständig erschöpft und voller Angst");
      await page.press("#ta3-phen-input", "Enter");
      await sleep(1800);
      const schliessenF = page.getByRole("button", { name: "Schließen" });
      if (await schliessenF.count()) { await schliessenF.first().click(); await sleep(500); }
      await page.evaluate(() => {
        const oc = window.__ta3ocean?.();
        const ph = oc?.phenomena?.[0];
        if (!ph) return;
        const sw = window.__ta3swim;
        // 3D: Phänomen-Position → Schwimmer 5 Einheiten südlich (Kamera schaut −z)
        sw.x = (ph.x - 2600) * 0.02;
        sw.z = (ph.y - 1600) * 0.02 + 5;
        sw.vx = 0; sw.vz = 0;
      });
      await sleep(1800);
      const schliessenF2 = page.getByRole("button", { name: "Schließen" });
      for (const name of ["formen-0", "formen-1", "formen-2"]) {
        if (await schliessenF2.count()) { await schliessenF2.first().click(); await sleep(500); }
        await page.screenshot({ path: `${SHOTS}/${name}.png` });
        await sleep(1300);
      }
    }

    if (scenario === "island") {
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, -600);
      await sleep(2000);
      await page.screenshot({ path: `${SHOTS}/island.png` });
    }

    if (scenario === "tour") {
      // Nahaufnahme jeder Insel: hinsegeln, Kapitel schließen, Insel füllt das Bild
      const ids = ["navigator", "kosmos", "kaskade", "polyvagal", "toleranz", "lexikon", "stammbaum", "baukasten", "wechsel", "wegweiser"];
      for (const id of ids) {
        await page.selectOption("#ta3-chapter-jump", id);
        await sleep(5200);
        await page.getByRole("button", { name: /Zurück ans Meer/ }).click();
        await sleep(1400);
        await page.screenshot({ path: `${SHOTS}/tour-${id}.png` });
        console.log(`  tour ${id} ✓`);
      }
    }

    console.log(`SHOT  ${scenario} ✓`);
    await page.close();
  }
} finally {
  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 12).join("\n")}` : "0 Konsolenfehler");
  await browser.close();
  kill();
}
