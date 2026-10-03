import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES } from "../../src/data/species";
import { MOVES } from "../../src/data/moves";
import { MAPS } from "../../src/data/maps";
import { createMonster } from "../../src/game/monster";
import { newGameState, parseGameState } from "../../src/game/state";
import { defensiveMatchups, dexAcquisitionNotes, dexHabitats, dexMatches, evolutionCondition, reachableDexMaps } from "../../src/game/dexGuide";
import { damageRange, fieldTactics, moveTactics, switchPreview } from "../../src/game/battle/tactics";
import { calcDamage, catchChance, makeCombatant } from "../../src/game/battle/sim";

test("temporary GAFFE boosts capture like persistent statuses, without stacking twice", () => {
  const foe = createMonster("giorgetta", 30);
  const base = catchChance(foe, "scheda");
  assert.equal(catchChance(foe, "scheda", 1, true), Math.min(.95, base * 2));
  foe.status = "indagato";
  assert.equal(catchChance(foe, "scheda", 1, true), catchChance(foe, "scheda"));
});

test("tactical inspection does not consume first-hit abilities, holds, PP or random draws", () => {
  const a = makeCombatant(createMonster("mediocrate", 30));
  const d = makeCombatant(createMonster("berlusconix", 30));
  a.mon.heldItem = "invalid-legacy-hold";
  a.stages.atk = 2; d.stages.def = 1;
  const before = JSON.stringify([a, d]);
  const originalRandom = Math.random;
  Math.random = () => { throw new Error("Inspection consumed RNG"); };
  try {
    for (const move of Object.values(MOVES)) {
      damageRange(a, d, move, { sondaggi: 80 }); moveTactics(a, d, move, { sondaggi: 80 });
    }
    fieldTactics(a, d, { sondaggi: 80 });
  } finally { Math.random = originalRandom; }
  assert.equal(JSON.stringify([a, d]), before);
});

test("damage estimate encloses actual noncritical rolls across species, political weather and LODO", () => {
  const ids = Object.keys(SPECIES);
  for (let i = 0; i < ids.length; i++) {
    const a = makeCombatant(createMonster(ids[i], 30));
    const d = makeCombatant(createMonster(ids[(i + 7) % ids.length], 30));
    a.stages.spc = 2; d.stages.def = -1;
    const move = MOVES[a.mon.moves.find((s) => MOVES[s.id].power > 0)!.id];
    for (const sondaggi of [20, 50, 80]) {
      const range = damageRange(a, d, move, { sondaggi });
      for (const roll of [.01, .35, .5, .8, .99]) {
        let calls = 0;
        const actual = calcDamage(structuredClone(a), structuredClone(d), move, () => calls++ === 0 ? .99 : roll, { sondaggi });
        assert.equal(actual.crit, false);
        assert.ok(actual.damage >= range.min && actual.damage <= range.max, `${ids[i]}: ${actual.damage} outside ${JSON.stringify(range)}`);
      }
    }
  }
});

test("status and stat forecasts report immunity and stage caps", () => {
  const a = makeCombatant(createMonster("giorgetta", 20));
  const d = makeCombatant(createMonster("contemorfo", 20));
  assert.match(moveTactics(a, d, MOVES.telepromessa).join(" "), /BLOCCATO DA TEFLON/);
  d.stages.def = -6;
  assert.match(moveTactics(a, d, MOVES.slogan).join(" "), /FACCIA TOSTA \+0/);
  d.gaffeTurns = 3;
  assert.match(moveTactics(d, a, MOVES.comizio).join(" "), /33%/);
});

test("switch inspection applies entry abilities on snapshots without changing the party or live foe", () => {
  const mon=createMonster("futurorso",45), foe=makeCombatant(createMonster("berlusconix",45));
  mon.hp=23;mon.status="scandalo";mon.heldItem="caffettiera";
  foe.stages.atk=4;foe.stages.spd=-2;foe.firstHitTaken=true;foe.gaffeTurns=3;
  const before=JSON.stringify([mon,foe]);
  const preview=switchPreview(mon,foe);
  assert.deepEqual(preview.entrant.stages,{atk:0,def:0,spc:0,spd:0});
  assert.deepEqual(preview.opponent.stages,{atk:0,def:0,spc:0,spd:0});
  assert.equal(preview.opponent.firstHitTaken,true);assert.equal(preview.opponent.gaffeTurns,3);
  assert.equal(preview.entrant.mon.hp,23);assert.equal(preview.entrant.mon.status,"scandalo");
  assert.equal(preview.entrant.mon.heldItem,"caffettiera");
  preview.entrant.mon.moves[0].pp--;
  assert.equal(JSON.stringify([mon,foe]),before);
});

test("switch inspection preserves ordinary opponent stages and includes VOLTAGABBANA speed on entry", () => {
  const mon=createMonster("renzino",30), foe=makeCombatant(createMonster("giorgiagon",30));
  foe.stages.def=3;
  const preview=switchPreview(mon,foe);
  assert.equal(preview.entrant.stages.spd,1);
  assert.equal(preview.opponent.stages.def,3);
  assert.notEqual(preview.opponent.stages,foe.stages);
});

test("field guide exposes accurate branch conditions and incoming type matchups", () => {
  const rules = SPECIES.salvinott.evolutions!;
  assert.match(evolutionCondition(rules[0]), /SONDAGGI DA 50/);
  assert.match(evolutionCondition(rules[1], rules.slice(0, 1)), /SONDAGGI SOTTO 50/);
  assert.match(evolutionCondition(SPECIES.salvinator.evolutions![0]), /TESSERA/);
  assert.equal(defensiveMatchups("giorgetta").length, 8);
  const state = newGameState(); state.browserSeed = 2;
  assert.deepEqual(dexHabitats("contemorfo", state), []);
  assert.match(dexAcquisitionNotes("contemorfo", state).join(" "), /ALTRA VERSIONE.*SCAMBIO ONLINE/);
  assert.match(dexAcquisitionNotes("salvinurlo", state).join(" "), /SONDAGGI SOTTO 50/);
});

test("habitats are restricted to open travel gates and version-adjusted encounter pools", () => {
  const state = newGameState(); state.browserSeed = 2;
  const reachable = reachableDexMaps(state);
  assert.ok(reachable.has("borgo"));
  for (const id of Object.keys(SPECIES)) {
    for (const h of dexHabitats(id, state, reachable)) {
      assert.ok(reachable.has(h.mapId)); assert.ok(h.share > 0 && h.share <= 1);
      assert.ok(MAPS[h.mapId].encounters!.some((e) => e.speciesId === id));
    }
  }
  state.pos.mapId = "campo-largo";
  const off = reachableDexMaps(state, { territories: false, atto3: false });
  const on = reachableDexMaps(state, { territories: true, atto3: true });
  assert.ok([...off].every((id) => on.has(id)));
  state.pos.mapId = "borgo";
  assert.equal(dexMatches("salvinott", "here", state), true);
  assert.equal(dexMatches("contemorfo", "here", state), false);
  state.dex.salvinott = "seen";
  assert.equal(dexMatches("salvinott", "seen", state), true);
  assert.equal(dexMatches("salvinott", "caught", state), false);
  state.dex.salvinott = "caught";
  assert.equal(dexMatches("salvinott", "missing", state), false);
});

test("battle speed migration accepts only supported presentation speeds", () => {
  const legacy = newGameState(); delete (legacy as Partial<typeof legacy>).battleSpeed;
  assert.equal(parseGameState(JSON.stringify(legacy))!.battleSpeed, 1);
  for (const value of [0, -1, "2", 200, null]) assert.equal(parseGameState(JSON.stringify({ ...legacy, battleSpeed: value }))!.battleSpeed, 1);
  assert.equal(parseGameState(JSON.stringify({ ...legacy, battleSpeed: 2 }))!.battleSpeed, 2);
});

test("the compact Dex exposes four facts and keeps unobserved traits hidden", async () => {
  const { dexSummary } = await import("../../src/game/dexGuide.ts");
  const state = newGameState(); state.pos.mapId = "route1";
  const before = JSON.stringify(state);
  for (const id of Object.keys(SPECIES)) {
    const facts = dexSummary(id, state); assert.equal(facts.length, 4);
    assert.equal(facts[0], "TIPI: DA AVVISTARE"); assert.equal(facts[1], "ABILITÀ: DA AVVISTARE");
    assert.equal(facts[3], "EVOLUZIONE: DA AVVISTARE");
  }
  assert.equal(JSON.stringify(state), before);
  state.dex.salvinott = "seen";
  assert.match(dexSummary("salvinott", state)[2], /PERCORSO 1: LV 4-6/);
  assert.match(dexSummary("salvinott", state)[3], /2 STRADE/);
  state.dex.ellyna = "caught";
  assert.match(dexSummary("ellyna", state)[3], /SCHLEINIX: LIVELLO 8/);
});

test("Dex canvas rows select then open, direct habitat is guarded and B restores the compact card", async () => {
  const { DexScene } = await import("../../src/scenes/DexScene.ts");
  const { SceneStack } = await import("../../src/engine/scene.ts");
  const state = newGameState(); state.dex.ellyna = "caught"; state.dex.salvinott = "seen";
  let tap: { x: number; y: number } | null = { x: 70, y: 49 }, back = false;
  const input = { consumeTap: () => tap, clearTap: () => { tap = null; }, wasPressed: (key: string) => key === "b" && back, reset: () => {} } as any;
  const stack = new SceneStack(), scene = Object.assign(Object.create(DexScene.prototype), { stack, input, state, reachable: new Set(["borgo", "route1"]), index: 0, filter: "seen", typeFilter: null, scroll: 0, time: 0, detail: false, page: -1, textScroll: 0 });
  scene.selectFirst(); stack.push(scene);
  scene.update(); assert.equal(scene.detail, false);
  tap = { x: 70, y: 49 }; scene.update(); assert.equal(scene.detail, true); assert.equal(scene.page, -1);
  const habitat = scene.touchActions[0]; habitat.run(); assert.equal(scene.page, 3);
  back = true; scene.update(); assert.equal(scene.page, -1); assert.equal(scene.detail, true);
  back = false; stack.push({ update() {}, draw() {} }); habitat.run(); assert.equal(scene.page, -1);
});

test("an unobserved Dex entry opens its habitat directly with A", async () => {
  const { DexScene } = await import("../../src/scenes/DexScene.ts");
  const scene = Object.assign(Object.create(DexScene.prototype), { state: newGameState(), reachable: new Set(["borgo"]), index: 0, filter: "all", typeFilter: null, detail: true, page: -1, time: 0, input: { consumeTap: () => null, wasPressed: (key: string) => key === "a" } });
  scene.update(); assert.equal(scene.page, 3);
});

test("switch buttons reach every reserve and reject KO, replaced parties and stale taps", async () => {
  const { PartyScene } = await import("../../src/scenes/PartyScene");
  const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(), stack = new SceneStack(), input = { reset() {}, wasPressed() { return false; } };
  state.party = ["renzino", "ellyna", "salvinott", "grillix", "giorgetta", "vannaccix"].map(id => createMonster(id, 8));
  state.party[1].hp = 0;
  const parent = { update() {}, draw() {} }; stack.push(parent);
  const chosen: string[] = [], options = { mode: "battle-switch" as const, currentUid: state.party[0].uid, onChoose: (mon: typeof state.party[number]) => chosen.push(mon.uid) };
  const scene = new PartyScene(stack, input as never, state, options); stack.push(scene);
  const before = JSON.stringify(state), commands = scene.touchActions!;
  assert.equal(commands.length, 6); assert.equal(commands[0].disabled, true); commands[0].run();
  assert.equal(stack.top, scene); assert.equal(JSON.stringify(state), before);
  for (const action of commands.slice(1, 5)) assert.match(action.hint!, /nemico risponde/);
  const last = commands[4]; last.run(); last.run();
  assert.deepEqual(chosen, [state.party[5].uid]); assert.equal(stack.top, parent); assert.equal(JSON.stringify(state), before);
  const reopened = new PartyScene(stack, input as never, state, options); stack.push(reopened);
  const stale = reopened.touchActions![1]; state.party[2].hp = 0; stale.run(); assert.equal(stack.top, reopened);
  state.party[2] = createMonster("salvinott", 8); stale.run(); assert.equal(stack.top, reopened);
  reopened.touchActions![5].run(); assert.equal(stack.top, parent); assert.equal(chosen.length, 1);
});

test("forced and mirror switches preserve ownership and cannot cancel after a KO", async () => {
  const { PartyScene } = await import("../../src/scenes/PartyScene");
  const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(), stack = new SceneStack(), input = { reset() {}, wasPressed(key: string) { return key === "b"; } };
  state.party = [createMonster("renzino", 8)]; const before = JSON.stringify(state);
  const mirror = [createMonster("giorgetta", 10), createMonster("ellyna", 10)]; mirror[0].hp = 0;
  let choice: typeof mirror[number] | undefined;
  const scene = new PartyScene(stack, input as never, state, { mode: "forced-switch", currentUid: mirror[0].uid, partyOverride: mirror, onChoose: mon => { choice = mon; } }); stack.push(scene);
  const commands = scene.touchActions!; assert.match(commands[0].hint!, /rimpasto gratis/);
  assert.equal(commands[5].disabled, true); commands[5].run(); scene.update(); assert.equal(stack.top, scene);
  commands[0].run(); assert.equal(choice, mirror[1]); assert.equal(stack.top, undefined); assert.equal(JSON.stringify(state), before);
});

test("battle switches charge one counter only; next foe opens a free choice without a confirmation", async () => {
  const { BattleScene } = await import("../../src/game/battle/BattleScene");
  const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(); state.party = [createMonster("renzino", 8), createMonster("ellyna", 8)];
  const battle = Object.assign(Object.create(BattleScene.prototype), { state, input: { reset() {} }, stack: new SceneStack(), player: makeCombatant(state.party[0]), foe: makeCombatant(createMonster("grillix", 5)), queue: [], mode: "menu", displayHp: {}, finished: false,
    foeCounterStep: () => ({ text: "COUNTER" }), endOfTurnSteps: () => [{ text: "END" }] }); battle.stack.push(battle);
  const before = JSON.stringify(state); battle.openParty(false); battle.stack.top.touchActions[5].run(); assert.equal(JSON.stringify(state), before); assert.equal(battle.queue.length, 0);
  battle.openParty(false); const choose = battle.stack.top.touchActions[0]; choose.run(); choose.run();
  assert.equal(battle.player.mon, state.party[1]); assert.equal(battle.queue.filter((step: any) => step.text === "COUNTER").length, 1);
  assert.equal(battle.queue.filter((step: any) => step.text === "END").length, 1);
  battle.queue = []; battle.trainer = { id: "trainer", name: "Rivale" }; battle.foeTeam = [battle.foe.mon, createMonster("salvinott", 6)]; battle.foeIndex = 0;
  battle.afterFoeDown(); for (const step of [...battle.queue]) step.run?.();
  const free = battle.stack.top; assert.notEqual(free, battle); assert.match(free.touchActions[0].hint, /rimpasto gratis/);
  battle.queue = []; free.touchActions[0].run(); assert.equal(battle.player.mon, state.party[0]);
  assert.ok(!battle.queue.some((step: any) => step.text === "COUNTER" || step.text === "END"));
});
