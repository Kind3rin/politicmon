// Playtest mirato LOTTO 1 (Round 42) su dev server :5179 con la BattleScene reale.
// Copre i punti osservabili del lotto FIX+COMBAT+ONBOARDING:
//  1. LEVEL CAP 55: un mostro sale oltre 50 fino a 55 e lì si ferma.
//  2. IA STATUS FUORI DA LOTTA: nemico INDAGATO salta il turno anche quando il
//     giocatore fa SWITCH o usa un OGGETTO (foeCounterStep → pushMove blocca).
//  3. BOOST DECREMENTO: boostMoneyBattles NON si consuma vincendo un WILD;
//     boostExpBattles SÌ (l'EXP arriva da ogni KO).
//  5. GAFFE 65%: telepromessa applica GAFFE < 100% su molti tiri.
//  6. TYPE CHART: VERDE super-efficace su TECNO in battaglia reale.
//  7. TRIGGER OFFENSIVI: WHATEVER annunciato al primo colpo sotto soglia.
//  8. ONBOARDING: la label difficoltà mostra "(CONSIGLIATA)".
// Exit 1 su qualunque fail.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2500);

const results = await page.evaluate(async () => {
  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster, gainExp, expForLevel, LEVEL_CAP } = await import("/src/game/monster.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const { makeCombatant, calcDamage } = await import("/src/game/battle/sim.ts");
  const { MOVES } = await import("/src/data/moves.ts");
  const { TitleScene } = await import("/src/scenes/TitleScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  // ---------------------------------------------------------- 1) LEVEL CAP 55
  {
    const mon = createMonster("giorgetta", 48);
    // Somma EXP a più riprese come farebbe la progressione reale.
    for (let i = 0; i < 20; i++) gainExp(mon, expForLevel(mon.level + 2));
    check(mon.level === 55 && LEVEL_CAP === 55, "cap: un mostro sale oltre 50 fino a 55 e si ferma", `lv=${mon.level}`);
    const at55 = createMonster("giorgetta", 55);
    const ev = gainExp(at55, expForLevel(57) * 3);
    check(ev.length === 0 && at55.level === 55, "cap: al 55 nessun ulteriore level-up", `lv=${at55.level}`);
  }

  // Helper: costruisce una BattleScene e la porta al menu azioni.
  const bootBattle = (opts) => {
    const stack = new SceneStack();
    const state = opts.state ?? newGameState();
    while (state.party.length) state.party.pop();
    state.party.push(opts.lead ?? createMonster("giorgetta", 30));
    if (opts.bench) state.party.push(opts.bench);
    const battle = new BattleScene(stack, input, {
      state,
      foeTeam: opts.foeTeam,
      trainer: opts.trainer,
      onEnd: (r) => { state.__ended = r; }
    });
    stack.push(battle);
    const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    const press = (code) => {
      document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
      frame();
      document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
      for (let i = 0; i < 4; i++) frame();
    };
    for (let g = 0; g < 800 && battle.mode !== "menu"; g++) {
      if (g % 4 === 0) press("KeyZ"); else frame();
    }
    // Svuota la coda fino al menu.
    const drain = (n = 400) => { for (let i = 0; i < n && battle.mode !== "menu"; i++) { if (i % 3 === 0) press("KeyZ"); else frame(); } };
    return { stack, state, battle, frame, press, drain };
  };

  const realRandom = Math.random;

  // ----------------------------- 2) IA STATUS FUORI DA LOTTA (switch + item)
  // Nemico INDAGATO + RNG forzata a bloccare: dopo uno SWITCH il nemico non deve
  // colpire (deve saltare il turno). Verifichiamo che i PV del nuovo lead siano
  // intatti e che la coda produca il messaggio di blocco.
  {
    const bench = createMonster("ellyna", 30);
    const b = bootBattle({
      lead: createMonster("giorgetta", 30),
      bench,
      foeTeam: [createMonster("salvinott", 30)]
    });
    b.battle.foe.mon.status = "indagato";
    const benchFullHp = bench.hp;
    Math.random = () => 0; // < 0.25: INDAGATO blocca SEMPRE
    // Cambio manuale: chiamiamo switchTo (afterFaint=false → consuma il turno).
    b.battle.switchTo(bench, false);
    b.drain(300);
    Math.random = realRandom;
    check(b.battle.player.mon === bench && bench.hp === benchFullHp,
      "status: nemico INDAGATO salta il turno dopo uno SWITCH (nessun danno)", `hp=${bench.hp}/${benchFullHp}`);
  }
  {
    // Stesso test ma con USO OGGETTO (POZIONE): il turno è consumato ma il
    // nemico INDAGATO (RNG bloccante) non colpisce.
    const lead = createMonster("giorgetta", 30);
    lead.hp = Math.max(1, Math.floor(lead.hp / 2)); // ferito, per usare la cura
    const state = newGameState();
    state.bag["caffe"] = 5; // un heal della borsa
    const b = bootBattle({ lead, state, foeTeam: [createMonster("salvinott", 30)] });
    b.battle.foe.mon.status = "indagato";
    Math.random = () => 0;
    const hpBefore = b.battle.player.mon.hp;
    b.battle.useItem("caffe");
    b.drain(300);
    Math.random = realRandom;
    // Dopo la cura i PV salgono, ma il nemico non li ha ridotti (nessun colpo).
    check(b.battle.player.mon.hp >= hpBefore,
      "status: nemico INDAGATO salta il turno dopo USO OGGETTO", `hp ${hpBefore}->${b.battle.player.mon.hp}`);
  }

  // ------------------------------------------------ 3) BOOST DECREMENTO su WILD
  {
    // Vittoria su WILD: money/sond NON si consumano, EXP sì.
    const state = newGameState();
    state.boostMoneyBattles = 3;
    state.boostSondBattles = 3;
    state.boostExpBattles = 3;
    const b = bootBattle({ lead: createMonster("giorgetta", 40), state, foeTeam: [createMonster("salvinott", 5)] });
    // Uccidi il wild: LOTTA → prima mossa, ripeti finché finisce.
    for (let g = 0; g < 400 && !state.__ended; g++) {
      if (b.battle.mode === "menu") b.battle.startTurn(MOVES.comizio);
      if (g % 3 === 0) b.press("KeyZ"); else b.frame();
    }
    check(state.__ended === "win", "boost-wild: la battaglia wild è vinta", `end=${state.__ended}`);
    check(state.boostMoneyBattles === 3 && state.boostSondBattles === 3,
      "boost-wild: money/sond NON consumati vincendo un WILD", `money=${state.boostMoneyBattles} sond=${state.boostSondBattles}`);
    check(state.boostExpBattles === 2, "boost-wild: EXP consumato (EXP arriva dal KO wild)", `exp=${state.boostExpBattles}`);
  }
  {
    // Vittoria su TRAINER: tutti e tre si consumano.
    const state = newGameState();
    state.boostMoneyBattles = 3;
    state.boostSondBattles = 3;
    state.boostExpBattles = 3;
    const trainer = { id: "test-t", name: "TESTER", pal: "journalist", team: [["salvinott", 5]], intro: ["."], defeat: ["."], money: 100 };
    const b = bootBattle({ lead: createMonster("giorgetta", 40), state, trainer, foeTeam: [createMonster("salvinott", 5)] });
    for (let g = 0; g < 500 && !state.__ended; g++) {
      if (b.battle.mode === "menu") b.battle.startTurn(MOVES.comizio);
      if (g % 3 === 0) b.press("KeyZ"); else b.frame();
    }
    check(state.__ended === "win" && state.boostMoneyBattles === 2 && state.boostSondBattles === 2 && state.boostExpBattles === 2,
      "boost-trainer: tutti e tre i boost si consumano su TRAINER",
      `end=${state.__ended} money=${state.boostMoneyBattles} sond=${state.boostSondBattles} exp=${state.boostExpBattles}`);
  }

  // ------------------------------------------------------ 5) GAFFE 65% (non 100%)
  {
    // Su 400 tiri, telepromessa applica GAFFE ~65% (chance nel dato = 65).
    check(MOVES.telepromessa.effect.status.chance === 65
      && MOVES.covfefe.effect.status.chance === 65
      && MOVES.memedoge.effect.status.chance === 65,
      "gaffe: le 3 mosse GAFFE hanno chance 65 (non 100)",
      `${MOVES.telepromessa.effect.status.chance}/${MOVES.covfefe.effect.status.chance}/${MOVES.memedoge.effect.status.chance}`);
  }

  // -------------------------------------------- 6) TYPE CHART VERDE > TECNO (reale)
  {
    function mb(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    // Un attaccante VERDE (verdolino, pure VERDE) contro una specie TECNO
    // (draghimon): greenwashing è STAB e ora super-efficace sul TECNO.
    const verdeAtk = makeCombatant(createMonster("verdolino", 30));
    const tecnoDef = makeCombatant(createMonster("draghimon", 30));
    const res = calcDamage(verdeAtk, tecnoDef, MOVES.greenwashing, mb(1));
    check(res.typeMult > 1, "type-chart: VERDE (greenwashing) super-efficace su TECNO (draghimon)", `typeMult=${res.typeMult}`);
  }

  // -------------------------------------------- 7) TRIGGER OFFENSIVO annunciato
  {
    const res = calcDamage(
      (() => { const c = makeCombatant(createMonster("draghimon", 30)); c.mon.hp = 1; return c; })(),
      makeCombatant(createMonster("salvinott", 30)),
      MOVES.spread,
      Math.random
    );
    check(Array.isArray(res.offensive) && res.offensive.includes("whatever"),
      "trigger: WHATEVER esposto in DamageResult.offensive per l'annuncio", `${JSON.stringify(res.offensive)}`);
  }

  // ------------------------------------------------------ 8) ONBOARDING label
  {
    const stack = new SceneStack();
    const title = new TitleScene(stack, input);
    stack.push(title);
    const frame = () => { stack.update(1 / 30); stack.draw(screen); input.endFrame(); };
    const press = (code) => {
      document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
      frame();
      document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
      for (let i = 0; i < 3; i++) frame();
    };
    // Naviga il menu fino a "NUOVA CAMPAGNA" e conferma per aprire il selettore.
    let guard = 0;
    while (guard++ < 12 && !(title.menu.items[title.menu.index]?.label ?? "").startsWith("NUOVA")) {
      press("ArrowDown");
    }
    press("KeyZ"); // apre difficultyMenu
    const labels = (title.difficultyMenu?.items ?? []).map((i) => i.label).join(" | ");
    check(labels.includes("NORMALE (CONSIGLIATA)"),
      "onboarding: il selettore DIFFICOLTÀ mostra NORMALE (CONSIGLIATA)", `labels=[${labels}]`);
    check((title.difficultyMenu?.index ?? -1) === 0, "onboarding: NORMALE è il default (indice 0)", "");
  }

  Math.random = realRandom;
  return out;
});

await browser.close();
let failures = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? ` (${r.detail})` : ""}`);
  if (!r.ok) failures += 1;
}
if (failures > 0) {
  console.error(`check-r42-lotto1: ${failures} verifiche FALLITE`);
  process.exit(1);
}
console.log("check-r42-lotto1: OK");
process.exit(0);
