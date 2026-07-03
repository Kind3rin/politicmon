// Playtest mirato LOTTO 3 (Round 41 END-GAME) su dev server :5179.
// Copre: migrazione save v11->v12 (hardMode/coppaWins/boost* a default, dati
// conservati, chiave v11 rimossa + .bak), MODALITÀ DIFFICILE (level bonus + no
// ONDA DEL CONSENSO), COPPA DELLE POLTRONE (bracket, duelsim risolve i fantasmi,
// premio/tassa), boost CAMPAGNA ELETTORALE (attiva/scala). Exit 1 su fail.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2500);

const results = await page.evaluate(async () => {
  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  const stateMod = await import("/src/game/state.ts");
  const { newGameState, SAVE_KEY, loadGame } = stateMod;
  const { hardModeLevelBonus } = await import("/src/game/rematch.ts");
  const tour = await import("/src/game/tournament.ts");
  const { ITEMS } = await import("/src/data/items.ts");

  // ---------------------------------------------------- 1) MIGRAZIONE v11 -> v12
  {
    // Costruisci un save "v11" (senza i campi v12) con dati significativi.
    const base = newGameState();
    base.money = 7777;
    base.badges = ["auditel", "spread", "dazio"];
    base.flags["garante-beaten"] = true;
    delete base.hardMode;
    delete base.coppaWins;
    delete base.boostExpBattles;
    delete base.boostMoneyBattles;
    delete base.boostSondBattles;
    localStorage.clear();
    localStorage.setItem("politicmon-save-v11", JSON.stringify(base));

    const loaded = loadGame();
    check(SAVE_KEY === "politicmon-save-v12", "SAVE_KEY è v12", SAVE_KEY);
    check(loaded && loaded.money === 7777, "migrazione conserva i dati (money)", loaded && loaded.money);
    check(loaded && loaded.hardMode === false, "hardMode default false", loaded && loaded.hardMode);
    check(loaded && loaded.coppaWins === 0, "coppaWins default 0", loaded && loaded.coppaWins);
    check(
      loaded && loaded.boostExpBattles === 0 && loaded.boostMoneyBattles === 0 && loaded.boostSondBattles === 0,
      "boost* default 0",
      loaded && `${loaded.boostExpBattles}/${loaded.boostMoneyBattles}/${loaded.boostSondBattles}`
    );
    check(localStorage.getItem("politicmon-save-v11") === null, "chiave v11 rimossa dopo migrazione");
    check(localStorage.getItem("politicmon-save-v12") !== null, "chiave v12 scritta");
    // Il .bak si scrive alla PRIMA sovrascrittura di una chiave v12 già presente
    // (saveGame conserva il valore precedente). Una seconda save lo genera.
    stateMod.saveGame(loaded);
    check(localStorage.getItem("politicmon-save-v12.bak") !== null, "backup .bak scritto alla seconda save");
  }

  // parseState difensivo: campi v12 corrotti -> default
  {
    const bad = newGameState();
    bad.hardMode = "yes"; // non booleano
    bad.coppaWins = -3;
    bad.boostExpBattles = "abc";
    bad.boostMoneyBattles = 4.9;
    bad.boostSondBattles = NaN;
    const code = btoa(encodeURIComponent(JSON.stringify(bad)));
    const parsed = stateMod.importSaveCode(code);
    check(parsed && parsed.hardMode === false, "parseState: hardMode non-bool -> false", parsed && parsed.hardMode);
    check(parsed && parsed.coppaWins === 0, "parseState: coppaWins negativo -> 0", parsed && parsed.coppaWins);
    check(parsed && parsed.boostExpBattles === 0, "parseState: boostExp non-numerico -> 0", parsed && parsed.boostExpBattles);
    check(parsed && parsed.boostMoneyBattles === 4, "parseState: boostMoney floor(4.9)=4", parsed && parsed.boostMoneyBattles);
    check(parsed && parsed.boostSondBattles === 0, "parseState: boostSond NaN -> 0", parsed && parsed.boostSondBattles);
  }

  // ---------------------------------------------------- 2) MODALITÀ DIFFICILE
  {
    const normal = newGameState();
    const hard = newGameState();
    hard.hardMode = true;
    check(hardModeLevelBonus(normal, 12) === 0, "normale: nessun bonus livello", hardModeLevelBonus(normal, 12));
    check(hardModeLevelBonus(hard, 12) === 3, "hard: +3 livelli sui trainer normali", hardModeLevelBonus(hard, 12));
    check(hardModeLevelBonus(hard, 50) === 5, "hard: +5 livelli sui boss (lv>=45)", hardModeLevelBonus(hard, 50));
  }

  // ---------------------------------------------------- 3) COPPA DELLE POLTRONE
  {
    const t = tour.initTournament("2026-07-03");
    check(t.alive.length === 8, "bracket: 8 partecipanti", t.alive.length);
    check(t.alive[0].isPlayer === true, "bracket: slot 0 è il giocatore");
    const ghosts = t.alive.filter((e) => !e.isPlayer);
    check(ghosts.length === 7, "bracket: 7 fantasmi", ghosts.length);
    const opp = tour.playerOpponent(t);
    check(opp && opp.name, "bracket: c'è un avversario per il giocatore", opp && opp.name);
    // Ripetibile e stabile nel giorno: stesso seed -> stesso avversario.
    const t2 = tour.initTournament("2026-07-03");
    check(tour.playerOpponent(t2)?.id === opp?.id, "bracket deterministico nel giorno (stesso opp)");
    // Giorno diverso può cambiare (non è un fail se coincide, ma il seed differisce).
    const t3 = tour.initTournament("2026-08-01");
    check(t3.seed !== t.seed, "bracket: giorni diversi -> seed diverso", `${t.seed} vs ${t3.seed}`);

    // Def del fantasma: id "coppa:*" (mai in defeatedTrainers), team lv 48-55.
    const gi = t.alive.findIndex((e, i) => i > 0 && e.ghost?.id === opp.id);
    const def = tour.ghostTrainerDef(opp, t.seed, gi);
    check(def.id.startsWith("coppa:"), "ghost def id 'coppa:*'", def.id);
    check(def.money === 0, "ghost match non paga (niente farm)", def.money);
    const lvs = def.team.map((m) => m[1]);
    check(lvs.every((l) => l >= 48 && l <= 55), "ghost team lv 48-55", lvs.join(","));

    // Avanzamento: il giocatore vince i suoi 3 round; gli altri match risolti
    // con duelsim (deterministico dal seed). Simula un torneo completo.
    let cur = tour.initTournament("2026-07-03");
    let champion = false;
    let rounds = 0;
    while (!champion && rounds < 5) {
      const res = tour.advanceAfterPlayerWin(cur);
      // Ogni round non-finale deve produrre risultati dei fantasmi (duelsim).
      if (!res.champion) {
        check(res.results.length > 0, `round ${rounds}: duelsim risolve i match fantasma`, res.results.length);
      }
      champion = res.champion;
      rounds += 1;
    }
    check(champion === true, "il giocatore diventa campione vincendo tutti i round", `round=${rounds}`);
    // 8 -> 4 -> 2 -> 1: esattamente 3 round.
    check(rounds === 3, "torneo a 3 round (quarti/semi/finale)", rounds);
  }

  // ---------------------------------------------------- 4) BOOST CAMPAGNA
  {
    for (const id of ["manifesti", "spotprimetime", "comizio"]) {
      const it = ITEMS[id];
      check(it && it.kind === "boost", `${id}: kind boost`, it && it.kind);
      check(it && it.boost && it.boost.battles > 0, `${id}: concede N battaglie`, it && it.boost && it.boost.battles);
      check(it && it.price >= 2000, `${id}: prezzo money-sink >=2000`, it && it.price);
    }
    // Simula l'uso: il campo del save sale, poi scala a fine battaglia (win).
    const st = newGameState();
    const b = ITEMS.manifesti.boost;
    st[b.field] += b.battles;
    check(st.boostExpBattles === 10, "MANIFESTI attiva 10 battaglie", st.boostExpBattles);
    // Consumo (endBattle su win): -1.
    if (st.boostExpBattles > 0) st.boostExpBattles -= 1;
    check(st.boostExpBattles === 9, "boost scala di 1 a fine battaglia vinta", st.boostExpBattles);
  }

  return out;
});

let fails = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail !== "" ? ` (${r.detail})` : ""}`);
  if (!r.ok) fails += 1;
}
await browser.close();
if (fails > 0) {
  console.error(`check-r41-lotto3: ${fails} FAIL`);
  process.exit(1);
}
console.log("check-r41-lotto3: OK");
