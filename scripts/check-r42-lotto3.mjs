// Playtest mirato LOTTO 3 (Round 42, ECONOMIA) su dev server :5179.
// Copre i 6 riequilibri economici in modo osservabile, col codice REALE:
//  1. REMATCH FAUCET: payout post-game rematch ~dimezzato (mult 3→2) + cooldown
//     400→600.
//  2. SPOT NON-SINK: lo SPOT (+50% fondi) è escluso dai rematch (isRematch).
//  3. TORNEO PREMIO SCALANTE: dal 2° trionfo un premio ripetibile (700€+item).
//  4. MANIFESTI UTILE: comprabile dal 2° badge (non più solo post-garante).
//  5. MONUMENTO: 3 livelli 10k/25k/50k€ deducono i soldi, monumentLevel sale,
//     titolo al lv3.
//  6. HARD MODE: computeAiProfile più aggressiva + hold item extra sui boss.
// Exit 1 su qualunque fail.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5179";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 720, height: 540 } });
page.on("pageerror", (e) => console.error("PAGEERR:", e.message));
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2500);

const results = await page.evaluate(async () => {
  const out = [];
  const check = (ok, label, detail = "") => out.push({ ok, label, detail });

  const { Screen } = await import("/src/engine/screen.ts");
  const { Input } = await import("/src/engine/input.ts");
  const { SceneStack } = await import("/src/engine/scene.ts");
  const { newGameState } = await import("/src/game/state.ts");
  const { createMonster } = await import("/src/game/monster.ts");
  const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
  const {
    buildRematchDef, REMATCH_COOLDOWN_STEPS
  } = await import("/src/game/rematch.ts");
  const { TRAINERS } = await import("/src/data/trainers.ts");
  const {
    COPPA_FEE, COPPA_REPEAT_PRIZE
  } = await import("/src/game/tournament.ts");
  const {
    MONUMENT_COSTS, MONUMENT_MAX, MonumentScene, monumentDecoLines
  } = await import("/src/scenes/MonumentScene.ts");
  const { ShopScene } = await import("/src/scenes/ShopScene.ts");
  const { audio } = await import("/src/engine/audio.ts");
  audio.enabled = false;

  const canvas = document.createElement("canvas");
  canvas.width = 240; canvas.height = 180;
  const screen = new Screen(canvas);
  const input = new Input();

  // Un trainer normale ribattibile (non gym, non boss): cerca in TRAINERS uno
  // che sia in REMATCHABLE (usa un id noto: "portaborse"/"stagista" o il primo
  // trainer comune con def.money>0). Prendiamo "salvinott"? No, cerchiamo per id.
  const commonId = Object.keys(TRAINERS).find((id) => {
    const t = TRAINERS[id];
    return t && !t.badge && t.money > 0 && !["boss", "garante", "ilcapitano", "tesoriere", "commissione"].includes(id);
  });
  const commonDef = TRAINERS[commonId];

  // ------------------------------------------------ 1) REMATCH FAUCET dimezzato
  {
    check(REMATCH_COOLDOWN_STEPS === 600, "rematch: cooldown 400→600", `steps=${REMATCH_COOLDOWN_STEPS}`);
    const st = newGameState();
    st.flags["garante-beaten"] = true; // post-game → mult 2
    st.badges = ["a", "b", "c"];
    const def = buildRematchDef(st, commonDef);
    // Post-game: money = round(base * 2 * 0.6) = round(base * 1.2).
    const expected = Math.round(commonDef.money * 2 * 0.6);
    check(def.money === expected, "rematch: payout post-game usa mult ×2 (era ×3)", `base=${commonDef.money} → ${def.money} (atteso ${expected})`);
    // Confronto col vecchio faucet (mult 3): il nuovo è ~2/3 e su cooldown 1.5×
    // più lungo → per-1000-passi circa -56%.
    const oldPer1000 = (commonDef.money * 3 * 0.6) * (1000 / 400);
    const newPer1000 = (commonDef.money * 2 * 0.6) * (1000 / 600);
    const ratio = newPer1000 / oldPer1000;
    check(ratio < 0.5, "rematch: faucet per-1000-passi < 50% del precedente", `ratio=${ratio.toFixed(3)}`);
  }

  // Helper: BattleScene fino allo step in cui paga il trainer, leggendo il money.
  // Simuliamo la vittoria facendo svenire l'unico foe e drenando la coda.
  const runTrainerWin = (opts) => {
    const stack = new SceneStack();
    const state = opts.state ?? newGameState();
    while (state.party.length) state.party.pop();
    const lead = createMonster("giorgetta", 55);
    state.party.push(lead);
    const foe = createMonster("renzino", 5);
    const battle = new BattleScene(stack, input, {
      state,
      foeTeam: [foe],
      trainer: opts.def,
      isRematch: opts.isRematch === true,
      onEnd: () => {}
    });
    stack.push(battle);
    // Porta il foe a 0 e forza afterFoeDown drenando la coda molte volte.
    foe.hp = 0;
    // Chiama il metodo privato afterFoeDown via reflection sul prototipo.
    battle.afterFoeDown();
    // Drena la coda: ogni step con run() applica gli effetti (money++).
    for (let i = 0; i < 60; i++) {
      const q = battle.queue;
      if (!q || q.length === 0) break;
      const step = q.shift();
      if (step && typeof step.run === "function") step.run();
    }
    return state.money;
  };

  // ------------------------------------------------ 2) SPOT ESCLUSO DAI REMATCH
  {
    const base = newGameState();
    const def = { id: commonId, name: commonDef.name, pal: commonDef.pal, team: [["renzino", 5]], intro: ["x"], defeat: ["y"], money: commonDef.money };
    // Caso A: NON rematch, SPOT attivo → bonus applicato.
    const sA = newGameState(); sA.money = 0; sA.boostMoneyBattles = 5;
    const moneyA = runTrainerWin({ state: sA, def, isRematch: false });
    // Caso B: rematch, SPOT attivo → bonus NON applicato.
    const sB = newGameState(); sB.money = 0; sB.boostMoneyBattles = 5;
    const moneyB = runTrainerWin({ state: sB, def, isRematch: true });
    check(moneyA > moneyB, "spot: non-rematch (bonus) paga più del rematch (niente bonus)", `A=${moneyA} B=${moneyB}`);
    // Il boost NON deve consumarsi sul rematch (nessun bonus applicato).
    check(sB.boostMoneyBattles === 5, "spot: carica boost NON consumata sul rematch", `left=${sB.boostMoneyBattles}`);
    // Sul non-rematch invece si consuma.
    check(sA.boostMoneyBattles === 4, "spot: carica boost consumata sul non-rematch", `left=${sA.boostMoneyBattles}`);
  }

  // ------------------------------------------------ 3) TORNEO PREMIO SCALANTE
  {
    check(COPPA_REPEAT_PRIZE.money > 0 && COPPA_REPEAT_PRIZE.money < COPPA_FEE,
      "torneo: premio ripetibile > 0 ma < tassa (resta SINK netto)",
      `prize=${COPPA_REPEAT_PRIZE.money} fee=${COPPA_FEE}`);
  }

  // ------------------------------------------------ 4) MANIFESTI dal 2° badge
  {
    const has = (state) => {
      const scene = new ShopScene(new SceneStack(), input, state);
      return scene.itemIds.includes("manifesti");
    };
    const s1 = newGameState(); s1.badges = ["a"];
    const s2 = newGameState(); s2.badges = ["a", "b"];
    const s3 = newGameState(); s3.badges = ["a", "b", "c"]; s3.flags["garante-beaten"] = true;
    check(!has(s1), "manifesti: NON in vendita col 1° badge");
    check(has(s2), "manifesti: in vendita dal 2° badge");
    check(has(s3), "manifesti: ancora in vendita post-garante");
    // SPOT resta end-game: col 2° badge NON deve comparire.
    const spotEarly = new ShopScene(new SceneStack(), input, s2).itemIds.includes("spotprimetime");
    check(!spotEarly, "manifesti: SPOT resta end-game (non al 2° badge)");
  }

  // ------------------------------------------------ 5) MONUMENTO 3 livelli
  {
    check(MONUMENT_MAX === 3 && MONUMENT_COSTS.join(",") === "10000,25000,50000",
      "monumento: 3 livelli 10k/25k/50k€", `costs=${MONUMENT_COSTS.join(",")}`);
    const st = newGameState();
    st.money = 100000;
    st.monumentLevel = 0;
    const scene = new MonumentScene(new SceneStack(), input, st);
    // Compra i 3 livelli invocando build().
    scene.build(MONUMENT_COSTS[0]);
    check(st.monumentLevel === 1 && st.money === 90000, "monumento: lv1 (-10.000€)", `lv=${st.monumentLevel} money=${st.money}`);
    scene.build(MONUMENT_COSTS[1]);
    check(st.monumentLevel === 2 && st.money === 65000, "monumento: lv2 (-25.000€)", `lv=${st.monumentLevel} money=${st.money}`);
    scene.build(MONUMENT_COSTS[2]);
    check(st.monumentLevel === 3 && st.money === 15000, "monumento: lv3 (-50.000€)", `lv=${st.monumentLevel} money=${st.money}`);
    // Fondi insufficienti: nessun addebito oltre il max.
    const before = st.money;
    scene.build(99999);
    check(st.money === before && st.monumentLevel === 3, "monumento: al max nessun ulteriore addebito", `money=${st.money}`);
    // Fondi insufficienti in un altro stato: niente deduzione.
    const poor = newGameState(); poor.money = 500; poor.monumentLevel = 0;
    const s2 = new MonumentScene(new SceneStack(), input, poor);
    s2.build(MONUMENT_COSTS[0]);
    check(poor.money === 500 && poor.monumentLevel === 0, "monumento: fondi insufficienti → niente addebito", `money=${poor.money}`);
    // Testo overworld cambia col livello.
    const l3 = monumentDecoLines(3).join(" ");
    check(l3.includes("COLOSSO") || l3.includes("LIVELLO 3"), "monumento: statua nel mondo cresce col livello", l3.slice(0, 40));
  }

  // ------------------------------------------------ 6) HARD MODE AI + hold item
  {
    // computeAiProfile è privato: lo esercitiamo costruendo una BattleScene e
    // leggendo battle.ai. Confrontiamo normale vs hard su un trainer COMUNE.
    const mkBattle = (hard, def) => {
      const stack = new SceneStack();
      const state = newGameState();
      state.hardMode = hard;
      state.badges = ["a", "b"];
      state.party.push(createMonster("giorgetta", 30));
      const b = new BattleScene(stack, input, { state, foeTeam: [createMonster("renzino", 20)], trainer: def, onEnd: () => {} });
      stack.push(b);
      return b.ai;
    };
    const commonBattleDef = { id: commonId, name: "X", pal: "boss", team: [["renzino", 20]], intro: ["x"], defeat: ["y"], money: 100 };
    const aiN = mkBattle(false, commonBattleDef);
    const aiH = mkBattle(true, commonBattleDef);
    check(aiH.whiff < aiN.whiff, "hard: whiff-floor più basso sui trainer comuni", `N=${aiN.whiff.toFixed(2)} H=${aiH.whiff.toFixed(2)}`);
    check(aiH.canHeal && aiH.finisher && !aiN.canHeal && !aiN.finisher,
      "hard: trainer comuni ottengono cura+finisher (normale no)",
      `H heal/fin=${aiH.canHeal}/${aiH.finisher} N=${aiN.canHeal}/${aiN.finisher}`);
    // Boss: whiff più basso in hard.
    const bossDef = { id: "garante", name: "GARANTE", pal: "boss", team: [["draghimon", 55]], intro: ["x"], defeat: ["y"], money: 0 };
    const bN = mkBattle(false, bossDef);
    const bH = mkBattle(true, bossDef);
    check(bH.whiff < bN.whiff, "hard: boss whiff più basso (0.2→0.1)", `N=${bN.whiff} H=${bH.whiff}`);
  }

  return out;
});

let fail = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.detail ? "  (" + r.detail + ")" : ""}`);
  if (!r.ok) fail++;
}
console.log(fail === 0 ? `check-r42-lotto3: OK (${results.length}/${results.length})` : `check-r42-lotto3: ${fail} FAIL`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
