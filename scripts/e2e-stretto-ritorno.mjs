// E2E: sbarco sul molo dello Stretto (13,6), poi RIPARTO entrando in acqua a lato
// (12,6) col traghetto → torno a Caput Mundi. Verifica che non resti bloccato.
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto(BASE, { waitUntil: "networkidle" });

const down = (c) => page.evaluate((k) => document.dispatchEvent(new KeyboardEvent("keydown", { code: k, bubbles: true })), c);
const up = (c) => page.evaluate((k) => document.dispatchEvent(new KeyboardEvent("keyup", { code: k, bubbles: true })), c);
const hold = async (c, ms) => { await down(c); await page.waitForTimeout(ms); await up(c); await page.waitForTimeout(300); };
const tap = async (c, ms=80) => { await down(c); await page.waitForTimeout(ms); await up(c); await page.waitForTimeout(110); };
const pos = () => page.evaluate(() => { const r = localStorage.getItem("politicmon-save-v14__s0"); if (!r) return null; const s = JSON.parse(r); return { map: s.pos.mapId, x: s.pos.x, y: s.pos.y }; });

await page.evaluate(() => {
  const flags = { "dex-received": true, "starter-chosen": true, "intro-done": true, "veh-traghetto": true, "hint-casino": true, "ponte-beaten": true, "rival1-beaten": true, "boss-beaten": true };
  const st = {
    party: [{ id: "x", speciesId: "renzino", uid: "u1", level: 40, exp: 999999, hp: 30, moves: [], status: null }],
    bag: {}, dex: {}, flags, defeatedTrainers: ["ilcapitano"], pickedItems: [],
    pos: { mapId: "stretto", x: 13, y: 6, facing: "up" }, // sul MOLO d'approdo
    starterId: "renzino", money: 5000, badges: ["auditel","spread","dazio"], sondaggi: 60,
    ministri: { economia: "u1" }, bulldozed: [], vehicle: null, rivalWins: 5, chips: 0, boxed: [], lastBar: "stretto",
    zoneRewardsClaimed: [], stepsTotal: 0, trainerRematch: {}, lastDailyDate: "", repellentSteps: 99999,
    dailyStreak: 0, duelWins: 0, duelLosses: 0, dailyQuestsDone: [], lastDailyQuestDate: "", browserSeed: 12345,
    hardMode: false, coppaWins: 0, boostExpBattles: 0, boostMoneyBattles: 0, boostSondBattles: 0,
    reduceEffects: false, reduceEffectsSet: true, monumentLevel: 0
  };
  localStorage.setItem("politicmon-save-v14__s0", JSON.stringify(st));
  localStorage.setItem("politicmon-active-slot", "0");
  localStorage.setItem("politicmon-nick", "TESTER");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await tap("Enter"); await page.waitForTimeout(150);
await tap("Enter"); await page.waitForTimeout(600);
for (let i = 0; i < 20; i++) await tap("Enter", 60);

const checks = [];
const check = (n, c) => checks.push({ n, ok: !!c });
check("spawn sul molo dello STRETTO", (await pos())?.map === "stretto");

// Dal molo (13,6) vai a sinistra sull'acqua (12,6) col traghetto → warp ritorno.
await hold("ArrowLeft", 700);
await page.waitForTimeout(500);
const p = await pos();
check("ripartito → tornato a CAPUT MUNDI", p?.map === "capitale");

await browser.close();
let fail = 0;
for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.n}`); if (!c.ok) fail++; }
console.log("pos:", JSON.stringify(p));
if (errs.length) errs.slice(0,4).forEach((e)=>console.log("ERR",e));
console.log(`\n${checks.length - fail}/${checks.length} check, ${errs.length} errori`);
process.exit(fail || errs.length ? 1 : 0);
