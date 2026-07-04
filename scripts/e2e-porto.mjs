// E2E PORTO nel gioco VERO (tastiera reale): il giocatore ARRIVA a Caput Mundi,
// cammina fino al PORTO (angolo SW), sale sul MOLO e si imbarca per lo STRETTO.
// Save "rodato" (achievement pre-marcati) → nessun popup che blocca l'input.
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

const down = (c) => page.evaluate((k) => document.dispatchEvent(new KeyboardEvent("keydown", { code: k, bubbles: true })), c);
const up = (c) => page.evaluate((k) => document.dispatchEvent(new KeyboardEvent("keyup", { code: k, bubbles: true })), c);
const hold = async (c, ms) => { await down(c); await page.waitForTimeout(ms); await up(c); await page.waitForTimeout(260); };
const tap = async (c, ms = 90) => { await down(c); await page.waitForTimeout(ms); await up(c); await page.waitForTimeout(110); };
const shot = async (n) => { const d = await page.evaluate(() => { const c = document.querySelector("canvas"); return c ? c.toDataURL("image/png") : null; }); if (d) writeFileSync(`artifacts/screens/${n}.png`, Buffer.from(d.slice("data:image/png;base64,".length), "base64")); };
const pos = () => page.evaluate(() => { const r = localStorage.getItem("politicmon-save-v13__s0"); if (!r) return null; const s = JSON.parse(r); return { map: s.pos.mapId, x: s.pos.x, y: s.pos.y, veh: s.vehicle }; });

const ACH = ["first-blood","first-catch","collector","collector2","collector3","first-badge","three-badges","government","plebiscito","rock-bottom","rival-rematch","high-roller","tycoon","treasure-hunter","directive","mechanic","trader"];

await page.evaluate((ach) => {
  const flags = {
    "dex-received": true, "starter-chosen": true, "intro-done": true, "veh-traghetto": true,
    "hint-casino": true, "ponte-beaten": true,
    // TUTTE le main quest chiuse → currentQuest=null → nessun HUD/step/dialogo attivo.
    "rival1-beaten": true, "boss-beaten": true, "garante-beaten": true, "hint-offshore": true,
    "offshore-beaten": true, "hint-brux-arrivo": true, "hint-ue": true, "ue-beaten": true,
    "used-directive": true, "casino-jackpot": true, "talked-mom": true, "talked-influencer": true
  };
  for (const id of ach) flags["ach:" + id] = true;
  const st = {
    party: [{ id: "x", speciesId: "renzino", uid: "u1", level: 40, exp: 999999, hp: 30, moves: [], status: null }],
    bag: { dirVaffa: 1 }, dex: { renzino: "caught" }, flags, defeatedTrainers: ["ilcapitano","giudice1","giudice2","giudice3"], pickedItems: [],
    pos: { mapId: "capitale", x: 6, y: 18, facing: "down" },
    starterId: "renzino", money: 5000, badges: ["auditel","spread","dazio"], sondaggi: 60,
    // ministri popolato + used-directive/casino ecc.: azzera currentQuest (niente HUD/step attivi).
    ministri: { economia: "u1" }, bulldozed: [], vehicle: null, rivalWins: 5, chips: 0, boxed: [], lastBar: "capitale",
    zoneRewardsClaimed: [], stepsTotal: 0, trainerRematch: {}, lastDailyDate: "", repellentSteps: 99999,
    dailyStreak: 0, duelWins: 0, duelLosses: 0, dailyQuestsDone: [], lastDailyQuestDate: "", browserSeed: 12345,
    hardMode: false, coppaWins: 0, boostExpBattles: 0, boostMoneyBattles: 0, boostSondBattles: 0,
    reduceEffects: false, reduceEffectsSet: true, monumentLevel: 0
  };
  localStorage.setItem("politicmon-save-v13__s0", JSON.stringify(st));
  localStorage.setItem("politicmon-active-slot", "0");
  localStorage.setItem("politicmon-nick", "TESTER");
}, ACH);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await tap("Enter"); await page.waitForTimeout(150); // CONTINUA
await tap("Enter"); await page.waitForTimeout(600); // carica slot
// Smaltisci TUTTI i dialoghi d'avvio (breaking news, sfida del giorno, quest rival).
for (let i = 0; i < 20; i++) await tap("Enter", 60);

const checks = [];
const check = (n, c) => checks.push({ n, ok: !!c });
check("boot in-world a CAPUT MUNDI", (await pos())?.map === "capitale");
await shot("porto_e2e_00_start");

// Parti vicino al porto (6,15): il molo è dritto sotto (col 6). Loop robusto:
// chiudi eventuali dialoghi (A) e poi scendi (Down), ripeti finché approdi allo
// STRETTO o esauri i tentativi. I dialoghi quest si accodano e bloccano il passo,
// quindi ogni ciclo prima li smaltisce poi prova a camminare.
let arrived = false;
const pA = await pos();
for (let step = 0; step < 20 && !arrived; step++) {
  for (let i = 0; i < 3; i++) await tap("Enter", 60); // chiudi dialoghi in coda
  await hold("ArrowDown", 500);                        // un passo verso il molo
  const p = await pos();
  if (p?.map === "stretto") arrived = true;
  if (step === 6) await shot("porto_e2e_01_meta");
}
await shot("porto_e2e_02_imbarco");
const pB = await pos();
check("imbarcato → approdato allo STRETTO", pB?.map === "stretto");

await browser.close();
let fail = 0;
for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.n}`); if (!c.ok) fail++; }
console.log("pos:", JSON.stringify({ pA, pB }));
if (errs.length) { console.log("--- ERRORI ---"); errs.slice(0, 5).forEach((e) => console.log(e)); }
console.log(`\n${checks.length - fail}/${checks.length} check, ${errs.length} errori console`);
process.exit(fail || errs.length ? 1 : 0);
