// E2E ponte nel gioco VERO (boot reale, tastiera come un giocatore):
// save a Caput Mundi vicino all'imbarco → CONTINUA → smaltisci popup → scendi
// → traversata diretta allo Stretto → cammina sul PONTE verso il Capitano.
// Screenshot alle tappe + verifica posizione dal save (autosalva ai cambi mappa).
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

const tap = async (code, holdMs = 260) => {
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true })), code);
  await page.waitForTimeout(holdMs);
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true })), code);
  await page.waitForTimeout(120);
};
const hold = async (code, ms) => {
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true })), code);
  await page.waitForTimeout(ms);
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true })), code);
  await page.waitForTimeout(300);
};
const shot = async (name) => {
  const d = await page.evaluate(() => { const c = document.querySelector("canvas"); return c ? c.toDataURL("image/png") : null; });
  if (d) writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(d.slice("data:image/png;base64,".length), "base64"));
};
const pos = () => page.evaluate(() => {
  const raw = localStorage.getItem("politicmon-save-v13__s0");
  if (!raw) return null;
  const st = JSON.parse(raw);
  return { map: st.pos.mapId, x: st.pos.x, y: st.pos.y, veh: st.vehicle };
});

// Save a Caput Mundi appena sopra l'imbarco (12,17), traghetto in tasca.
await page.evaluate(() => {
  const st = {
    party: [{ id: "x", speciesId: "renzino", level: 40, exp: 999999, hp: 30, moves: [], status: null }],
    bag: {}, dex: {}, flags: { "dex-received": true, "starter-chosen": true, "intro-done": true, "veh-traghetto": true },
    defeatedTrainers: ["ilcapitano"], pickedItems: [], pos: { mapId: "capitale", x: 12, y: 17, facing: "down" },
    starterId: "renzino", money: 5000, badges: ["auditel", "spread", "dazio"], sondaggi: 60,
    ministri: {}, bulldozed: [], vehicle: null, rivalWins: 5, chips: 0, boxed: [], lastBar: "capitale",
    zoneRewardsClaimed: [], stepsTotal: 0, trainerRematch: {}, lastDailyDate: "", repellentSteps: 99999,
    dailyStreak: 0, duelWins: 0, duelLosses: 0, dailyQuestsDone: [], lastDailyQuestDate: "", browserSeed: 12345,
    hardMode: false, coppaWins: 0, boostExpBattles: 0, boostMoneyBattles: 0, boostSondBattles: 0,
    reduceEffects: false, reduceEffectsSet: true, monumentLevel: 0,
    // ponte-beaten: così IL CAPITANO non blocca il passaggio con la battaglia.
    // (defeatedTrainers + flag) → si cammina liberi sul ponte per la verifica visiva.
  };
  st.flags["ponte-beaten"] = true;
  localStorage.setItem("politicmon-save-v13__s0", JSON.stringify(st));
  localStorage.setItem("politicmon-active-slot", "0");
  localStorage.setItem("politicmon-nick", "TESTER");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

// CONTINUA → carica SLOT 1
await tap("Enter"); await page.waitForTimeout(150);
await tap("Enter"); await page.waitForTimeout(600);
// Smaltisci i popup d'avvio (achievement) che consumano l'input: batch generoso
// di A (25). Ogni A chiude una riga di dialogo; con badge+rivalWins alti ne
// scattano parecchi al primo load.
for (let i = 0; i < 25; i++) await tap("Enter", 70);
await shot("ponte_00_caput");

const checks = [];
const check = (n, c) => checks.push({ n, ok: !!c });
check("boot a CAPUT MUNDI", (await pos())?.map === "capitale");

// Scendi verso il molo → traversata diretta allo STRETTO (approdo su acqua).
await hold("ArrowDown", 900);
await hold("ArrowDown", 700);
await page.waitForTimeout(500);
await shot("ponte_01_approdo");
const p1 = await pos();
check("approdato allo STRETTO", p1?.map === "stretto");
// Nota: il veh nel save è null perché il save viene scritto all'INGRESSO mappa,
// prima che syncFerryVehicle attivi il traghetto. L'attivazione si vede nell'HUD
// ("TRAGHETTO") negli screenshot ponte_*: verifica visiva, non da save.

// Smaltisci eventuali dialoghi riapertisi all'arrivo (quest rival ecc.).
for (let i = 0; i < 8; i++) await tap("Enter", 80);
// Scendi lungo la CARREGGIATA del ponte verso il Capitano (sud).
await hold("ArrowDown", 1400);
await page.waitForTimeout(300);
await shot("ponte_02_carreggiata");
for (let i = 0; i < 4; i++) await tap("Enter", 80);
await hold("ArrowDown", 1400);
await page.waitForTimeout(300);
await shot("ponte_03_capitano");
const p2 = await pos();
check("resta nello STRETTO camminando sul ponte", p2?.map === "stretto");
// Il movimento lungo il ponte NON cambia mappa, quindi il save resta a (13,6):
// la discesa e il rendering (asfalto+mezzeria continua+tralicci sull'acqua) si
// verificano dagli screenshot ponte_02/03, non dalla posizione salvata.

await browser.close();
let fail = 0;
for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.n}`); if (!c.ok) fail++; }
console.log("pos:", JSON.stringify({ p1, p2 }));
if (errs.length) { console.log("--- ERRORI ---"); errs.slice(0, 5).forEach((e) => console.log(e)); }
console.log(`\n${checks.length - fail}/${checks.length} check, ${errs.length} errori console`);
process.exit(fail || errs.length ? 1 : 0);
