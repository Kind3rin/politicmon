// E2E traversata Caput Mundi ⇄ Stretto usando il BOOT REALE del gioco (come
// e2e-slots): inietta un save a Caput Mundi vicino all'imbarco, CONTINUA, poi
// pilota il player verso il molo e verifica l'approdo diretto allo Stretto.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(BASE, { waitUntil: "networkidle" });

const tap = async (code, holdMs = 500) => {
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true })), code);
  await page.waitForTimeout(holdMs);
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true })), code);
  await page.waitForTimeout(220);
};
// Legge la posizione dal SAVE (il gioco autosalva a ogni cambio mappa via
// loadMap). Dopo un warp, il save riflette la mappa nuova.
const pos = () => page.evaluate(() => {
  const raw = localStorage.getItem("politicmon-save-v13__s0");
  if (!raw) return null;
  const st = JSON.parse(raw);
  return { map: st.pos.mapId, x: st.pos.x, y: st.pos.y, veh: st.vehicle };
});
const shot = async (name) => {
  const d = await page.evaluate(() => { const c = document.querySelector("canvas"); return c ? c.toDataURL("image/png") : null; });
  if (d) writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(d.slice("data:image/png;base64,".length), "base64"));
};

// Inietta un save a Caput Mundi appena SOPRA l'imbarco (12,17), traghetto in tasca.
await page.evaluate(() => {
  const st = {
    party: [{ id: "x", speciesId: "renzino", level: 40, exp: 999999, hp: 30, moves: [], status: null }],
    bag: {}, dex: {}, flags: { "dex-received": true, "starter-chosen": true, "intro-done": true, "veh-traghetto": true },
    defeatedTrainers: [], pickedItems: [], pos: { mapId: "capitale", x: 6, y: 19, facing: "down" },
    starterId: "renzino", money: 5000, badges: ["auditel", "spread", "dazio"], sondaggi: 60,
    ministri: {}, bulldozed: [], vehicle: null, rivalWins: 5, chips: 0, boxed: [], lastBar: "capitale",
    zoneRewardsClaimed: [], stepsTotal: 0, trainerRematch: {}, lastDailyDate: "", repellentSteps: 9999,
    dailyStreak: 0, duelWins: 0, duelLosses: 0, dailyQuestsDone: [], lastDailyQuestDate: "", browserSeed: 12345,
    hardMode: false, coppaWins: 0, boostExpBattles: 0, boostMoneyBattles: 0, boostSondBattles: 0,
    reduceEffects: false, reduceEffectsSet: true, monumentLevel: 0
  };
  localStorage.setItem("politicmon-save-v13__s0", JSON.stringify(st));
  localStorage.setItem("politicmon-active-slot", "0");
  localStorage.setItem("politicmon-nick", "TESTER");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

// TITLE → CONTINUA → SlotScene(load) → SLOT 1 (già selezionato) → CARICA
await tap("Enter");                 // CONTINUA
await page.waitForTimeout(150);
await tap("Enter");                 // carica SLOT 1
await page.waitForTimeout(600);
await shot("e2e_st_00_caput");

const checks = [];
const check = (n, c) => checks.push({ n, ok: !!c });

// Smaltisci i popup d'avvio (achievement "ESORDIO IN TV", banner traguardo, ecc.)
// che consumano l'input: premi A ripetutamente finché il player non è libero.
for (let i = 0; i < 8; i++) { await tap("Enter", 120); }
await shot("e2e_st_00b_ready");

const p0 = await pos();
check("boot in-world a CAPUT MUNDI", p0 && p0.map === "capitale");

// Scendi verso l'IMBARCO (6,21): 2 passi giù → warp allo STRETTO, approdo NAVALE
// sull'ACQUA del bordo sud (14,16) col TRAGHETTO attivo (non più spawn sul molo).
await tap("ArrowDown", 700);
await tap("ArrowDown", 700);
await page.waitForTimeout(500);
await shot("e2e_st_01_approdo");
const p1 = await pos();
check("approdo allo STRETTO (no mappa mare intermedia)", p1 && p1.map === "stretto");
check("approdo su ACQUA → traghetto attivo (arrivo navale)", p1 && p1.veh === "traghetto");
check("spawn sul BORDO SUD in acqua (non a metà mappa)", p1 && p1.y >= 14);

// Torna in acqua a nord (verso il ponte/molo) navigando: qui verifichiamo solo
// che la navigazione parta (resta traghetto). La traversata completa fino al molo
// richiede di battere IL CAPITANO (gate), fuori scope per questo E2E.
await tap("ArrowUp", 700);
await page.waitForTimeout(300);
await shot("e2e_st_02_naviga");
const p2 = await pos();
check("navigazione attiva (traghetto mantenuto risalendo)", p2 && p2.map === "stretto" && p2.veh === "traghetto");

await browser.close();
let fail = 0;
for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.n}`); if (!c.ok) fail++; }
console.log("pos:", JSON.stringify({ p0, p1, p2 }));
if (errs.length) { console.log("--- ERRORI ---"); errs.slice(0, 5).forEach((e) => console.log(e)); }
console.log(`\n${checks.length - fail}/${checks.length} check, ${errs.length} errori console`);
process.exit(fail || errs.length ? 1 : 0);
