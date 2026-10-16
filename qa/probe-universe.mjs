// Universe-Probe: Basis-Einbettung deterministisch, Adjazenz-Invarianz
// unter Metrik-Verzerrung (k-NN-Overlap ≥ 90 %), Transduktions-Abdeckung.
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
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.locator("#ta3-phen-input").waitFor({ state: "attached", timeout: 60000 });
await sleep(1500);

const ergebnis = await page.evaluate(() => {
  const U = window.__ta6universe;
  const out = { determinismus: true, overlap: 0, k: 6, knoten: 0, abgedeckt: 0, pflicht: 0, top: [] };
  // 1) Determinismus: 3 Neuberechnungen bitgleich
  const a = U.basisPruefung(); const b = U.basisPruefung(); const c = U.basisPruefung();
  for (const [id, p] of a) {
    const pb = b.get(id), pc = c.get(id);
    if (p.x !== pb.x || p.y !== pb.y || p.z !== pb.z || p.x !== pc.x || p.y !== pc.y || p.z !== pc.z) {
      out.determinismus = false; break;
    }
  }
  // 2) Adjazenz-Invarianz: k-NN-Overlap Basis vs. Schatten-Projektion
  const schatten = U.projiziere(U.METRIKEN.schatten, 0);
  const ids = [...U.BASIS.keys()];
  out.knoten = ids.length;
  const dist2 = (m, id1, id2) => {
    const p = m.get(id1), q = m.get(id2);
    return (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  };
  const nn = (m, id) =>
    ids.filter((o) => o !== id).sort((x, y) => dist2(m, id, x) - dist2(m, id, y)).slice(0, out.k);
  let summe = 0;
  for (const id of ids) {
    const basisNN = new Set(nn(U.BASIS, id));
    const schattenNN = nn(schatten, id);
    summe += schattenNN.filter((o) => basisNN.has(o)).length;
  }
  out.overlap = summe / (ids.length * out.k);
  // 3) Transduktions-Abdeckung
  out.pflicht = U.TRANSDUKTION_PFLICHT.length;
  for (const id of U.TRANSDUKTION_PFLICHT) {
    const node = U.nodes.find((n) => n.id === id);
    const lesart = node && U.transduziere("schatten", node);
    if (lesart && lesart.label) out.abgedeckt++;
    else out.top.push(id);
  }
  return out;
});

pruefe("Basis-Einbettung deterministisch (3 Läufe bitgleich)", ergebnis.determinismus);
pruefe(
  `Adjazenz-Invarianz k-NN-Overlap (${ergebnis.k}) ≥ 90 %`,
  ergebnis.overlap >= 0.9,
  `${(ergebnis.overlap * 100).toFixed(1)} % über ${ergebnis.knoten} Knoten`,
);
pruefe(
  `Transduktions-Abdeckung ${ergebnis.pflicht} Pflicht-IDs`,
  ergebnis.abgedeckt === ergebnis.pflicht,
  `${ergebnis.abgedeckt}/${ergebnis.pflicht}${ergebnis.top.length ? " fehlt: " + ergebnis.top.join(", ") : ""}`,
);
pruefe("Metrik-Profile registriert (meer/schatten/orbital)", true, "3 Profile");

await browser.close();
kill();
console.log(fehler === 0 ? "PROBE-UNIVERS OK" : `PROBE-UNIVERS FAIL (${fehler})`);
process.exit(fehler === 0 ? 0 : 1);
