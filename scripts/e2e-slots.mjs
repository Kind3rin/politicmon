// Test END-TO-END nel gioco VERO: pilota la UI con la tastiera reale (keydown/keyup
// sul document, come un giocatore) e verifica lo stato in localStorage + screenshot.
// Flusso: NUOVA CAMPAGNA su SLOT 2 → gioca → reload → CONTINUA SLOT 2.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const SAVE_BASE = "politicmon-save-v18";
mkdirSync("artifacts/screens", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(BASE, { waitUntil: "networkidle" });

// Helper: premi un tasto (code) come un vero keydown/keyup, con attesa frame.
const tap = async (code, holdMs = 60) => {
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keydown", { code: c, bubbles: true })), code);
  await page.waitForTimeout(holdMs);
  await page.evaluate((c) => document.dispatchEvent(new KeyboardEvent("keyup", { code: c, bubbles: true })), code);
  await page.waitForTimeout(90);
};
const shot = async (name) => {
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return c ? c.toDataURL("image/png") : null;
  });
  if (dataUrl) writeFileSync(`artifacts/screens/${name}.png`, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));
};
const ls = (k) => page.evaluate((key) => localStorage.getItem(key), k);
const setNick = () => page.evaluate(() => localStorage.setItem("politicmon-nick", "TESTER"));

const checks = [];
const check = (name, cond) => { checks.push({ name, ok: !!cond }); };

// --- Reset pulito: niente save, niente slot attivo, nick impostato (salta NicknameScene) ---
await page.evaluate(() => {
  for (let i = 0; i < 3; i++) {
    localStorage.removeItem(`politicmon-save-v18__s${i}`);
    localStorage.removeItem(`politicmon-save-v18__s${i}.bak`);
    localStorage.removeItem(`politicmon-save-v14__s${i}`);
    localStorage.removeItem(`politicmon-save-v14__s${i}.bak`);
    localStorage.removeItem(`politicmon-save-v13__s${i}`);
    localStorage.removeItem(`politicmon-save-v13__s${i}.bak`);
  }
  localStorage.removeItem("politicmon-save-v13");
  localStorage.removeItem("politicmon-save-v13.bak");
  localStorage.removeItem("politicmon-active-slot");
});
await setNick();
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await shot("e2e_01_title");

// --- TITLE: senza save, prima voce = NUOVA CAMPAGNA. Premi A per aprirla ---
await tap("Enter");                 // NUOVA CAMPAGNA
await page.waitForTimeout(150);
await shot("e2e_02_difficulty");
// Selettore DIFFICOLTÀ: NORMALE è index 0 → A conferma
await tap("Enter");                 // NORMALE
await page.waitForTimeout(150);
await shot("e2e_03_slotnew");
// SlotScene(new): cursore su SLOT 1 (index 0). Scendi di 1 → SLOT 2, poi A.
await tap("ArrowDown");             // → SLOT 2
await tap("Enter");                 // scegli SLOT 2 (vuoto → nessuna conferma)
await page.waitForTimeout(500);     // avvio WorldScene
await shot("e2e_04_world");

// Verifica: slot attivo = 1 (SLOT 2), save presente in __s1, __s0/__s2 vuoti.
const active1 = await ls("politicmon-active-slot");
check("slot attivo = 1 (SLOT 2)", active1 === "1");
const s0 = await ls(`${SAVE_BASE}__s1`);
check("save scritto in __s1", s0 !== null);
check("__s0 vuoto", (await ls(`${SAVE_BASE}__s0`)) === null);
check("__s2 vuoto", (await ls(`${SAVE_BASE}__s2`)) === null);

// --- Muoviti un po' e apri PAUSA → SALVA (prima voce) ---
await tap("ArrowDown"); await tap("ArrowDown");
await tap("KeyP");                  // START → PauseScene
await page.waitForTimeout(150);
await shot("e2e_05_pause");
await tap("Enter");                 // SALVA (prima voce del menu pausa)
await page.waitForTimeout(150);
await shot("e2e_06_saved");
await tap("Enter");                 // chiudi il messaggio "Partita salvata!"
// snapshot del save dello slot 2 per confronto post-reload
const saveBefore = await ls(`${SAVE_BASE}__s1`);
check("save slot2 non vuoto dopo SALVA", saveBefore !== null);

// --- RELOAD: simula chiusura/riapertura app ---
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await shot("e2e_07_title_after_reload");
// Lo slot attivo deve sopravvivere al reload
const active2 = await ls("politicmon-active-slot");
check("slot attivo sopravvive al reload (=1)", active2 === "1");
// Il save dello slot 2 deve essere intatto
const saveAfter = await ls(`${SAVE_BASE}__s1`);
check("save slot2 intatto dopo reload", saveAfter === saveBefore);

// --- TITLE dopo reload: con un save esiste CONTINUA (prima voce). A → SlotScene(load) ---
await tap("Enter");                 // CONTINUA
await page.waitForTimeout(200);
await shot("e2e_08_slotload");
// SlotScene(load): SLOT 1 vuoto (disabled), SLOT 2 pieno. Scendi a SLOT 2 e carica.
await tap("ArrowDown");             // → SLOT 2
await tap("Enter");                 // CARICA
await page.waitForTimeout(500);
await shot("e2e_09_world_loaded");
// Ancora sullo slot 2, save intatto
check("dopo CONTINUA slot attivo = 1", (await ls("politicmon-active-slot")) === "1");
check("dopo CONTINUA save slot2 intatto", (await ls(`${SAVE_BASE}__s1`)) === saveBefore);

// --- Verifica isolamento: SLOT 1 e SLOT 3 restano vuoti per tutto il flusso ---
check("SLOT 1 (__s0) mai scritto", (await ls(`${SAVE_BASE}__s0`)) === null);
check("SLOT 3 (__s2) mai scritto", (await ls(`${SAVE_BASE}__s2`)) === null);

await browser.close();

// Report
let fail = 0;
for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`); if (!c.ok) fail++; }
const errLogs = logs.filter((l) => l.includes("[error]") || l.includes("[pageerror]"));
if (errLogs.length) { console.log("\n--- ERRORI CONSOLE ---"); errLogs.forEach((l) => console.log(l)); }
console.log(`\n${checks.length - fail}/${checks.length} check passati, ${errLogs.length} errori console`);
process.exit(fail || errLogs.length ? 1 : 0);
