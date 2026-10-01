import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => sessionStorage.setItem("politicmon-intro-seen", "1"));
  await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5179", { waitUntil: "networkidle" });
  const result = await page.evaluate(async () => {
    const { Screen } = await import("/src/engine/screen.ts");
    const { SceneStack } = await import("/src/engine/scene.ts");
    const { newGameState, loadGame, saveGame } = await import("/src/game/state.ts");
    const { createMonster } = await import("/src/game/monster.ts");
    const { DexScene } = await import("/src/scenes/DexScene.ts");
    const { BattleIntelScene } = await import("/src/scenes/BattleIntelScene.ts");
    const { BattleScene } = await import("/src/game/battle/BattleScene.ts");
    const { PartyScene } = await import("/src/scenes/PartyScene.ts");
    const { PauseScene } = await import("/src/scenes/PauseScene.ts");
    const { makeCombatant } = await import("/src/game/battle/sim.ts");
    const { SPECIES, DEX_ORDER } = await import("/src/data/species.ts");
    const { MOVES } = await import("/src/data/moves.ts");
    const { MEME_FORMS } = await import("/src/game/memeForms.ts");
    const { audio } = await import("/src/engine/audio.ts"); audio.enabled = false;
    const { preloadSprites, waitForSprites } = await import("/src/engine/assets.ts");
    const entries = Object.fromEntries(DEX_ORDER.map((id) => [`mon:${id}`, `monsters/${id}.png`]));
    preloadSprites(entries); await waitForSprites(Object.keys(entries), 5000);
    const screen = new Screen(document.createElement("canvas")); const stack = new SceneStack(); let pressed = "";
    const input = { wasPressed: (b) => b === pressed, isDown: () => false, tapInRect: () => false, consumeTap: () => null };
    const press = (scene, button) => { pressed = button; scene.update(.1); pressed = ""; };
    const state = newGameState(); state.party = [createMonster("giorgetta", 20), createMonster("renzino", 20)]; state.starterId = "giorgetta";
    state.pos.mapId = "borgo"; state.browserSeed = 2; state.unlockedMemeForms = Object.keys(MEME_FORMS);
    const issues = []; const shots = {}; let name = ""; let boxes = []; let checked = 0;
    const text = screen.text.bind(screen);
    screen.text = (value, x, y, color, scale = 1) => {
      const m = screen.ctx.getTransform(); const base = screen.ctx.canvas.width / 240;
      const b = { value, x: (m.a * x + m.e) / base, y: (m.d * y + m.f) / base, w: Math.max(0, value.length * 6 - 1) * scale * m.a / base, h: 7 * scale * m.d / base };
      if (b.x < 0 || b.y < 0 || b.x + b.w > 240 || b.y + b.h > 180) issues.push({ name, kind: "bounds", ...b });
      for (const old of boxes) if (b.w && old.w && b.x < old.x + old.w && b.x + b.w > old.x && b.y < old.y + old.h && b.y + b.h > old.y) issues.push({ name, kind: "overlap", value, other: old.value });
      boxes.push(b); text(value, x, y, color, scale);
    };
    const draw = (key, scene, capture = false) => { name = key; boxes = []; scene.draw(screen); checked++; if (capture) shots[key] = screen.ctx.canvas.toDataURL("image/png"); };
    const dex = new DexScene(stack, input, state);
    draw("dex-sconosciuti", dex, true); press(dex, "a"); draw("dex-indizi", dex, true); press(dex, "b");
    for (const id of DEX_ORDER) state.dex[id] = "seen";
    for (const seed of [1, 2]) {
      state.browserSeed = seed;
      for (const [index, id] of DEX_ORDER.entries()) {
        dex.index = index; dex.detail = true;
        for (let p = 0; p < dex.pageCount(); p++) {
          dex.page = p;
          for (let scroll = 0; scroll <= Math.max(0, dex.lines().length - 7); scroll++) {
            dex.textScroll = scroll; draw(`dex-${id}-${p}-${scroll}-v${seed}`, dex, seed === 2 && scroll === 0 && ((id === "salvinott" && p === 4) || (id === "tajanide" && p === 0) || (id === "contemorfo" && p === 3) || (id === "salvinott" && p === 2) || (id === "salvinott" && p === 3)));
          }
        }
      }
    }
    dex.detail = false; dex.typeFilter = "DESTRA"; dex.filter = "caught"; draw("dex-filtro-vuoto", dex, true);
    dex.typeFilter = null; dex.filter = "here"; dex.selectFirst(); draw("dex-qui", dex, true);
    for (const move of Object.values(MOVES)) {
      const player = makeCombatant(createMonster("giorgiagon", 30)); player.mon.moves = [{ id: move.id, pp: move.pp }];
      const foe = makeCombatant(createMonster("contemorfo", 30));
      const intel = new BattleIntelScene(stack, input, player, foe, 0, { sondaggi: 80 });
      for (let p = 0; p < 2; p++) {
        intel.page = p;
        for (let scroll = 0; scroll <= Math.max(0, intel.lines().length - 9); scroll++) { intel.scroll = scroll; draw(`tattica-${move.id}-${p}-${scroll}`, intel, move.id === "fiammatricolore" && scroll === 0); }
      }
    }
    const battle = new BattleScene(stack, input, { state, foeTeam: [createMonster("salvinott", 20)], onEnd: () => {} });
    battle.openFightMenu(); battle.mode = "fight"; battle.introT = 1.2; battle.msg = { isOpen: false, draw: () => {}, update: () => {} };
    const before = JSON.stringify([state, battle.player, battle.foe]);
    stack.push(battle); press(battle, "start");
    if (stack.top?.constructor.name !== BattleIntelScene.name) throw new Error(`START non apre la tattica: ${stack.top?.constructor.name} mode ${battle.mode} hit ${battle.fx.hitStop}`);
    const intel = stack.top; draw("dossier-mossa", intel, true); press(intel, "a"); draw("dossier-campo", intel, true); press(intel, "a"); draw("dossier-recluta", intel, true);
    press(intel, "right"); press(intel, "b");
    if (JSON.stringify([state, battle.player, battle.foe]) !== before) throw new Error("Consultare la tattica cambia il turno");
    if (battle.fightMenu.index !== 1 || stack.top !== battle) throw new Error("Selezione tattica non torna alla lotta");
    const oldPp = battle.player.mon.moves[1].pp; press(battle, "a");
    if (battle.player.mon.moves[1].pp !== oldPp - 1) throw new Error("La mossa scelta nel dossier non viene eseguita");
    for (const speed of [1, 2]) {
      const s = newGameState(); s.party = [createMonster("giorgetta", 20)]; s.battleSpeed = speed;
      const b = new BattleScene(stack, input, { state: s, foeTeam: [createMonster("salvinott", 20)], onEnd: () => {} });
      b.msg = { isOpen: false, update: () => {} }; b.introT = 1.2; b.stepTimer = 5; b.queue = [{ pause: 10 }];
      b.update(.1); if (Math.abs(b.stepTimer - (5 - .1 * speed)) > .0001) throw new Error("Ritmo non cambia la presentazione");
    }
    const party = new PartyScene(stack, input, state, { mode: "view" });
    press(party, "start"); press(party, "down"); press(party, "start");
    if (loadGame().party[0].speciesId !== "renzino") throw new Error("Riordino squadra perso al reload");
    const pause = new PauseScene(stack, input, state); pause.sub = pause.buildOptionsMenu();
    pause.handleSub(pause.sub, "RITMO LOTTE: NORMALE");
    if (loadGame().battleSpeed !== 2) throw new Error("Ritmo non salvato"); draw("opzioni-ritmo", pause, true);
    saveGame(state);
    return { issues, shots, checked };
  });
  writeFileSync("artifacts/premium/layout-report.json", JSON.stringify(result.issues, null, 2));
  assert.deepEqual(errors, [], "runtime errors"); assert.deepEqual(result.issues, [], "text bounds and overlap");
  mkdirSync("artifacts/screens/gameplay-guide", { recursive: true });
  for (const [name, data] of Object.entries(result.shots)) writeFileSync(`artifacts/screens/gameplay-guide/${name}.png`, Buffer.from(data.split(",")[1], "base64"));
  console.log(`PASS: ${result.checked} layouts; START dossier, no turn consumption, selection, rapid pace, save reload.`);
} finally { await browser.close(); }
