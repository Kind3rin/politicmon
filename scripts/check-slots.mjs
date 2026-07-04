// Test funzionale degli SLOT multipli di salvataggio (isolamento, migrazione,
// retrocompat mono-slot). Gira nel browser reale (localStorage vero) via Playwright.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });

const results = await page.evaluate(async () => {
  const S = await import("/src/game/state.ts");
  const out = [];
  const assert = (name, cond) => out.push({ name, ok: !!cond });

  const clean = () => {
    // Azzera tutte le chiavi note prima di ogni scenario.
    for (let i = 0; i < 3; i++) {
      localStorage.removeItem(`politicmon-save-v13__s${i}`);
      localStorage.removeItem(`politicmon-save-v13__s${i}.bak`);
    }
    localStorage.removeItem("politicmon-save-v13");
    localStorage.removeItem("politicmon-save-v13.bak");
    localStorage.removeItem("politicmon-active-slot");
    for (const k of ["v12","v11","v10","v9","v8","v7","v6","v5","v4","v3"]) {
      localStorage.removeItem(`politicmon-save-${k}`);
    }
    // Forza rilettura dello slot attivo dopo aver tolto la chiave.
    S.setActiveSlot(0);
  };

  const mkState = (badges, money) => {
    const st = S.newGameState();
    st.badges = badges;
    st.money = money;
    st.party = [{ id: "x", speciesId: "renzino", level: badges.length * 5 + 5, exp: 0, hp: 10, moves: [], status: null }];
    return st;
  };

  // --- Scenario 1: isolamento tra slot ---
  clean();
  S.setActiveSlot(0);
  S.saveGame(mkState(["auditel"], 111));
  S.setActiveSlot(1);
  S.saveGame(mkState(["auditel","spread"], 222));
  S.setActiveSlot(2);
  S.saveGame(mkState(["auditel","spread","dazio"], 333));

  S.setActiveSlot(0);
  const l0 = S.loadGame();
  S.setActiveSlot(1);
  const l1 = S.loadGame();
  S.setActiveSlot(2);
  const l2 = S.loadGame();
  assert("slot0 money 111", l0 && l0.money === 111);
  assert("slot1 money 222", l1 && l1.money === 222);
  assert("slot2 money 333", l2 && l2.money === 333);
  assert("slot0 1 badge", l0 && l0.badges.length === 1);
  assert("slot2 3 badge", l2 && l2.badges.length === 3);

  // --- Scenario 2: summary + hasSaveInSlot ---
  const s1 = S.slotSummary(1);
  assert("summary1 exists", s1.exists);
  assert("summary1 badges 2", s1.badges === 2);
  assert("summary1 money 222", s1.money === 222);
  assert("hasSaveInSlot(1)", S.hasSaveInSlot(1) === true);
  clean();
  assert("empty slot no save", S.hasSaveInSlot(1) === false);
  assert("empty summary !exists", S.slotSummary(1).exists === false);
  assert("hasAnySave false quando vuoto", S.hasAnySave() === false);

  // --- Scenario 3: clearSlot non tocca gli altri ---
  clean();
  S.setActiveSlot(0); S.saveGame(mkState(["auditel"], 10));
  S.setActiveSlot(1); S.saveGame(mkState(["auditel"], 20));
  S.clearSlot(0);
  assert("clearSlot0 svuota s0", S.hasSaveInSlot(0) === false);
  assert("clearSlot0 lascia s1", S.hasSaveInSlot(1) === true);

  // --- Scenario 4: migrazione mono-slot (vecchia chiave) -> slot 0 ---
  clean();
  const legacyState = mkState(["auditel","spread"], 777);
  localStorage.setItem("politicmon-save-v13", JSON.stringify(legacyState));
  S.setActiveSlot(0);
  const migr = S.loadGame(); // deve migrare la vecchia chiave in __s0
  assert("migrazione mono-slot money 777", migr && migr.money === 777);
  assert("migrazione riempie __s0", localStorage.getItem("politicmon-save-v13__s0") !== null);
  assert("migrazione rimuove vecchia chiave", localStorage.getItem("politicmon-save-v13") === null);
  assert("slot1 resta vuoto dopo migrazione", S.hasSaveInSlot(1) === false);

  // --- Scenario 5: nuova campagna su slot pieno = clear + save ---
  clean();
  S.setActiveSlot(2); S.saveGame(mkState(["dazio"], 999));
  assert("pre: slot2 pieno", S.hasSaveInSlot(2) === true);
  S.clearSlot(2);
  S.saveGame(S.newGameState());
  const fresh = S.loadGame();
  assert("nuova campagna slot2 money 500", fresh && fresh.money === 500);
  assert("nuova campagna slot2 0 badge", fresh && fresh.badges.length === 0);

  clean();
  return out;
});

await browser.close();
let fail = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.ok) fail++;
}
console.log(`\n${results.length - fail}/${results.length} passati`);
process.exit(fail ? 1 : 0);
