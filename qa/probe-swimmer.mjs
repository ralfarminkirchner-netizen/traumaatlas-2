// Schwimmer-Probe: Zeiger-Führung (Körper erreicht den projizierten Punkt),
// Tempo-Deckel, Feld-Kräfte (Sog/Barriere) als Zahlen, Annehmen → Wachstum
// skaliert Radius/Stärke/Reichweite.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createWriteStream } from "node:fs";

const PORT = 8471;
const BASE = `http://localhost:${PORT}/`;
const log = createWriteStream("/tmp/ta3-dev.log", { flags: "a" });
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url).pathname, stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.pipe(log); server.stderr.pipe(log);
const kill = () => { try { server.kill("SIGTERM"); } catch { /* ok */ } };
process.on("exit", kill);
process.on("SIGINT", () => { kill(); process.exit(130); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(t0 = Date.now()) {
  while (Date.now() - t0 < 300000) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* */ }
    await sleep(800);
  }
  throw new Error("Dev-Server nicht erreichbar");
}

const errors = [];
let failures = 0;
const ok = (cond, label) => { console.log(`${cond ? "PASS" : "FAIL"}  ${label}`); if (!cond) failures++; };

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
  await sleep(3000);

  // ── 1) Der Schwimmer IST der Zeiger: keine Feder, kein Nachhinken ──
  await page.mouse.move(500, 600, { steps: 3 });
  await sleep(1200);
  const dist = await page.evaluate(async () => {
    const mod = await import("/src/ocean3d/projStore.ts");
    const cmod = await import("/src/ocean3d/coords.ts");
    const w = mod.screenToWater(500, 600);
    if (!w) return Infinity;
    const sw = window.__ta3swim;
    return Math.hypot(cmod.w2x(w.wx) - sw.x, cmod.w2z(w.wy) - sw.z);
  });
  ok(dist < 0.6, `Zeiger-Direktheit: Körper sitzt AUF dem Zeigerpunkt (Rest ${dist.toFixed(2)})`);

  // ── 2) Tastatur-Fahrt: W treibt entlang Heading 0 (Norden), Tempo gedeckelt ──
  const z0 = await page.evaluate(() => { window.__ta3swim.heading = 0; return window.__ta3swim.z; });
  await page.keyboard.down("w");
  let vmax = 0;
  let active = false;
  // warten bis die Fahrt aktiv ist (mix > 0.6), dann 1.5 s fahren lassen —
  // auf der Last-Maschine läuft die Seite in Zeitlupe (~5 fps)
  for (let i = 0; i < 24; i++) {
    const s = await page.evaluate(() => ({ v: Math.hypot(window.__ta3swim.vx, window.__ta3swim.vz), mix: window.__ta3swim.driveMix }));
    if (s.v > vmax) vmax = s.v;
    if (s.mix > 0.6) { active = true; break; }
    await sleep(150);
  }
  await sleep(3000); // Sim-Zeit auf der Zeitlupen-Maschine (~5 fps ≙ 0.5 s)
  const z1 = await page.evaluate(() => window.__ta3swim.z);
  await page.keyboard.up("w");
  ok(active, `Fahrt-Modus aktiviert (mix > 0.6)`);
  ok(z1 < z0 - 1, `W fährt vorwärts/Norden (Δz ${(z1 - z0).toFixed(1)})`);
  ok(vmax > 2 && vmax <= 30.5, `Tempo in der Fahrt gedeckelt (vmax=${vmax.toFixed(1)} ≤ 30)`);

  // ── 2b) Maus-Look lenkt die Fahrtrichtung ──
  const h0 = await page.evaluate(() => window.__ta3swim.heading);
  await page.keyboard.down("w");
  for (let i = 0; i < 10; i++) await page.mouse.move(720 + i * 24, 450, { steps: 1 });
  await page.keyboard.up("w");
  await sleep(200);
  const h1 = await page.evaluate(() => window.__ta3swim.heading);
  ok(Math.abs(h1 - h0) > 0.4, `Maus-Look dreht die Fahrtrichtung (Δ ${(h1 - h0).toFixed(2)} rad)`);

  // ── 2c) Wave-Race-Hopfen: Airtime endet mit Landung ──
  // (auf der Last-Maschine läuft rAF gebremst — großzügiges Zeitfenster)
  const hop = await page.evaluate(async () => {
    const sw = window.__ta3swim;
    sw.vy = 3.2; sw.air = true;
    const t0 = performance.now();
    return await new Promise((res) => {
      const tick = () => {
        if (!sw.air) return res({ landed: true, ms: performance.now() - t0, pulse: sw.landPulse });
        if (performance.now() - t0 > 12000) return res({ landed: false, ms: 12000, pulse: 0 });
        requestAnimationFrame(tick);
      };
      tick();
    });
  });
  ok(hop.landed && hop.ms > 150, `Airtime endet in Landung (${Math.round(hop.ms)} ms Flug)`);
  ok(hop.pulse > 0.1, `Landung stößt das Druckfeld an (Puls ${hop.pulse.toFixed(2)})`);

  // ── 3) Feld-Kräfte: Sog (gleiche Erregungslage) und Barriere (Gegensatz) ──
  const fields = await page.evaluate(async () => {
    const sw = await import("/src/ocean3d/swimmer.ts");
    const co = await import("/src/ocean3d/coords.ts");
    const world = await import("/src/ocean/world.ts");
    // kontrollierte Szene: alle Phänomene weg, dann drei gezielt platzierte
    for (const p of [...window.__ta3ocean().phenomena]) world.removePhenomenon(p.id);
    const a = world.addPhenomenon("Ich fühle eine tiefe innere Leere und Hoffnungslosigkeit");
    const b = world.addPhenomenon("Ich fühle eine tiefe innere Leere und Hoffnungslosigkeit");
    const c = world.addPhenomenon("Ich habe Panikattacken mit Herzrasen");
    // Positionen fixieren (3D): a (0,0), b (30,0) weit weg, c (0,-25)
    a.x = co.x2w(0); a.y = co.z2w(0); a.vx = a.vy = 0;
    b.x = co.x2w(30); b.y = co.z2w(0); b.vx = b.vy = 0;
    c.x = co.x2w(0); c.y = co.z2w(-25); c.vx = c.vy = 0;
    const arms = window.__ta3ocean().arms;
    const find = (x, y) => arms.find((ar) => (ar.a === x && ar.b === y) || (ar.a === y && ar.b === x));

    // SOG: Körper 5 Einheiten östlich von a → Kraft muss zu a ziehen (fx < 0)
    window.__ta3swim.x = 5; window.__ta3swim.z = 0;
    window.__ta3swim.vx = 0; window.__ta3swim.vz = 0;
    const fA = sw.fieldForces();

    // BARRIERE: a und b außer Reichweite schieben, Körper 5 Einheiten unter c
    a.x = co.x2w(40); a.y = co.z2w(25);
    b.x = co.x2w(45); b.y = co.z2w(25);
    window.__ta3swim.x = 0; window.__ta3swim.z = -20; // 5 über c (c bei z=-25)
    const fC = sw.fieldForces();

    return {
      armAB: find(a.id, b.id)?.strength ?? null,
      armAC: find(a.id, c.id)?.strength ?? null,
      fA: { fx: +fA.fx.toFixed(3), fz: +fA.fz.toFixed(3), kind: fA.kind },
      fC: { fx: +fC.fx.toFixed(3), fz: +fC.fz.toFixed(3), kind: fC.kind },
    };
  });
  console.log("Felder:", JSON.stringify(fields));
  ok(fields.armAB !== null && fields.armAB > 0.3, `Sog-Arm vorhanden (strength ${fields.armAB})`);
  ok(fields.fA.kind === "sog" && fields.fA.fx < 0, `Sog zieht den Körper an (fx=${fields.fA.fx})`);
  ok(fields.armAC !== null && fields.armAC < -0.3, `Barriere-Arm vorhanden (strength ${fields.armAC})`);
  ok(fields.fC.kind === "barriere" && fields.fC.fz > 0, `Barriere drückt zurück (fz=${fields.fC.fz})`);

  // ── 4) Annehmen → Wachstum skaliert Körper ──
  const growth = await page.evaluate(async () => {
    const sw = await import("/src/ocean3d/swimmer.ts");
    const before = { lvl: sw.swimmer.level, r: sw.swimmerRadius(0), s: sw.swimmerStrength(0), reach: sw.swimmerReach(0) };
    const p = window.__ta3ocean().phenomena[0];
    const first = sw.acceptPhenomenon(p.id);
    const again = sw.acceptPhenomenon(p.id); // doppelt zählt nicht
    return {
      before,
      after: { lvl: sw.swimmer.level, r: sw.swimmerRadius(), s: sw.swimmerStrength(), reach: sw.swimmerReach() },
      first, again,
    };
  });
  ok(growth.first === true && growth.again === false, "Annehmen zählt einmalig pro Phänomen");
  ok(growth.after.lvl === growth.before.lvl + 1, `Wachstum: Stufe ${growth.before.lvl} → ${growth.after.lvl}`);
  ok(growth.after.r > growth.before.r && growth.after.s > growth.before.s && growth.after.reach > growth.before.reach,
    `Radius/Stärke/Reichweite skalieren (r ${growth.before.r.toFixed(1)}→${growth.after.r.toFixed(1)})`);

  await browser.close();
} catch (e) {
  console.error("PROBE-ABBRUCH:", e);
  failures++;
} finally {
  console.log(errors.length ? `KONSOLENFEHLER:\n${[...new Set(errors)].slice(0, 12).join("\n")}` : "0 Konsolenfehler");
  if (errors.length) failures++;
  kill();
  process.exit(failures ? 1 : 0);
}
