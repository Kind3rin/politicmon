import assert from "node:assert/strict";
import test from "node:test";
import { BAG_ORDER, ITEMS } from "../../src/data/items";
import { newGameState } from "../../src/game/state";
import { createMonster, statsOf } from "../../src/game/monster";
import { buySupplies, shopStock, supplyNotes, healingQuote, useHealingSupply } from "../../src/game/supplyGuide";
import { shopAdjustments, shopPrice } from "../../src/game/governo";

test("all inventory items are reachable, including the clean special SINISTRA directive", () => {
  assert.deepEqual(new Set(BAG_ORDER), new Set(Object.keys(ITEMS)));
  const state = newGameState();
  assert.ok(shopStock(state).includes("dirPiazza"));
  assert.ok(!shopStock(state).includes("manifesti"));
  state.badges = ["a", "b"];
  assert.ok(shopStock(state).includes("manifesti"));
  assert.ok(!shopStock(state).includes("comizio"));
});
test("quotes recheck live funds, reusable stock and quantities; rejected commits are pure", () => {
  const state = newGameState(); state.money = 1000;
  const price = shopPrice(state, ITEMS.caffe);
  assert.ok(buySupplies(state, "caffe", 3)); assert.equal(state.money, 1000 - price * 3);
  const before = JSON.stringify(state);
  for (const [id, q] of [["caffe", 99], ["caffe", 1.5], ["caffe", 0], ["comizio", 1], ["bogus", 1]] as const) {
    assert.equal(buySupplies(state, id, q), false); assert.equal(JSON.stringify(state), before);
  }
  state.money = 10000;
  assert.ok(buySupplies(state, "dirPiazza", 1)); const after = JSON.stringify(state);
  assert.equal(buySupplies(state, "dirPiazza", 1), false); assert.equal(JSON.stringify(state), after);
});
test("price breakdown includes every active minister cost and matches the charged unit price", () => {
  const state = newGameState(); state.sondaggi = 80; state.morale.trust = 80;
  state.party = [createMonster("giorgetta", 10), createMonster("salvinott", 10), createMonster("ellyna", 10)];
  state.ministri = { esteri: state.party[0].uid, interno: state.party[1].uid, propaganda: state.party[2].uid };
  const entries = shopAdjustments(state);
  assert.deepEqual(entries.map((e) => e.percent), [-5, -10, -20, 10, 12]);
  assert.equal(shopPrice(state, ITEMS.tessera), 2610);
  state.party[1].hp = 0;
  assert.equal(shopPrice(state, ITEMS.tessera), 2310);
});
test("reading supply tactics leaves HP, PP, held items, funds and inventory intact", () => {
  const state = newGameState(); state.party = [createMonster("salvinott", 20), createMonster("ellyna", 20)];
  state.party[0].hp = 0; state.party[1].status = "scandalo";
  const before = JSON.stringify(state);
  for (const id of BAG_ORDER) for (let page = 0; page < 3; page++) supplyNotes(state, ITEMS[id], page, false);
  assert.equal(JSON.stringify(state), before);
  assert.match(supplyNotes(state, ITEMS.caffe, 1, false).join(" "), /KO, NON RIANIMA/);
  assert.match(supplyNotes(state, ITEMS.spotprimetime, 0, false).join(" "), /ESCLUDE I REMATCH/);
});

test("quick cure quotes actual recovery, chooses stocked coffee first and preserves PP/status/funds", () => {
  const state = newGameState(), mon = createMonster("giorgetta", 8);
  state.party = [mon]; state.bag = { caffe: 2, spritz: 1 }; mon.hp = statsOf(mon).hp - 3; mon.status = "scandalo"; mon.moves[0].pp = 1;
  const before = JSON.stringify(state), quote = healingQuote(state, mon)!;
  assert.equal(JSON.stringify(state), before); assert.equal(quote.id, "caffe"); assert.equal(quote.after - quote.before, 3);
  const money = state.money; assert.equal(useHealingSupply(state, mon, quote), true);
  assert.equal(mon.hp, statsOf(mon).hp); assert.equal(state.bag.caffe, 1); assert.equal(state.bag.spritz, 1);
  assert.equal(mon.moves[0].pp, 1); assert.equal(mon.status, "scandalo"); assert.equal(state.money, money);
  const after = JSON.stringify(state); assert.equal(useHealingSupply(state, mon, quote), false); assert.equal(JSON.stringify(state), after);
});
test("cure rejects stale stock or HP, KO, full health, outsiders and non-healing items without spending", () => {
  const state = newGameState(), mon = createMonster("ellyna", 8); state.party = [mon]; state.bag = { caffe: 2, spritz: 1 }; mon.hp = 1;
  const quote = healingQuote(state, mon)!; state.bag.caffe = 1;
  let before = JSON.stringify(state); assert.equal(useHealingSupply(state, mon, quote), false); assert.equal(JSON.stringify(state), before);
  const live = healingQuote(state, mon)!; mon.hp++;
  before = JSON.stringify(state); assert.equal(useHealingSupply(state, mon, live), false); assert.equal(JSON.stringify(state), before);
  assert.equal(healingQuote(state, createMonster("ellyna", 8)), null); assert.equal(healingQuote(state, mon, "maalox"), null);
  mon.hp = 0; assert.equal(healingQuote(state, mon), null); mon.hp = statsOf(mon).hp; assert.equal(healingQuote(state, mon), null);
  mon.hp = 1; state.bag.caffe = 0; assert.equal(healingQuote(state, mon)!.id, "spritz");
  state.bag.spritz = 0; assert.equal(healingQuote(state, mon), null);
});

test("quick cure scene blocks duplicate and stale taps, then returns automatically to pause", async () => {
  const { BagScene } = await import("../../src/scenes/BagScene");
  const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(), mon = createMonster("giorgetta", 8); state.party = [mon]; state.bag = { caffe: 2 }; mon.hp = 1;
  const stack = new SceneStack(), input = { reset() {}, wasPressed() { return false; }, tapInRect() { return false; } };
  const pause = { update() {}, draw() {} }; stack.push(pause);
  const bag = new BagScene(stack, input as never, state, { inBattle: false, quickHeal: true }); stack.push(bag);
  const tap = bag.touchActions![0]; tap.run(); const after = JSON.stringify(state); tap.run();
  assert.equal(JSON.stringify(state), after); assert.equal(state.bag.caffe, 1);
  assert.ok(bag.touchActions!.every((action) => action.disabled));
  for (let i = 0; i < 5 && stack.top === bag; i++) bag.update(1);
  assert.equal(stack.top, pause); tap.run(); assert.equal(JSON.stringify(state), after);
});

test("battle supply preview rejects waste, trainer captures and cup limits without consuming a turn", async () => {
  const { BattleScene } = await import("../../src/game/battle/BattleScene");
  const { makeCombatant } = await import("../../src/game/battle/sim");
  const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(), mon = createMonster("renzino", 6); state.party = [mon]; state.bag = { caffe: 2, maalox: 1, scheda: 2, spray: 1 };
  const battle = Object.create(BattleScene.prototype) as any;
  Object.assign(battle, { state, player: makeCombatant(mon), foe: makeCombatant(createMonster("contemorfo", 5)), trainer: { id: "praticante" }, mode: "menu", finished: false, queue: [], maxBattleHealingItems: null, battleHealingItemsUsed: 0, stack: new SceneStack() });
  battle.stack.push(battle);
  Object.assign(battle, { mainMenu: { items: ["LOTTA", "BORSA", "SQUADRA", "FUORIONDA", "CAMPAGNA", "FUGA"].map(label => ({ label })) }, polemica: { value: 0, gainFor:()=>0 }, input: { reset() {} } });
  const trainer = battle.trainer; battle.trainer = undefined;
  battle.displayHp={player:mon.hp,foe:battle.foe.mon.hp}; battle.msg={isOpen:false}; battle.fx={damageNumbers:[],effFx:null}; battle.fightMenu={index:0};
  const reserve = battle.uiPanel.actions.find((a:any)=>a.label==="Borsa"); reserve.run();
  assert.notEqual(battle.stack.top, battle); battle.stack.top.touchActions.find((a: any) => a.label === "INDIETRO").run(); assert.equal(battle.stack.top, battle); battle.trainer = trainer;
  const untouched = JSON.stringify(state);
  for (const id of ["caffe", "maalox", "scheda", "spray", "bogus"]) { assert.equal(battle.supplyInfo(id).disabled, true); battle.useItem(id); }
  assert.equal(JSON.stringify(state), untouched); assert.equal(battle.mode, "menu"); assert.equal(battle.queue.length, 0);
  mon.hp -= 3; const before = mon.hp; assert.match(battle.supplyInfo("caffe").hint, new RegExp(`PV ${before} → ${before + 3}`));
  battle.maxBattleHealingItems = 0; assert.equal(battle.supplyInfo("caffe").disabled, true); battle.useItem("caffe"); assert.equal(state.bag.caffe, 2);
  battle.maxBattleHealingItems = 1; battle.foeCounterStep = () => ({ text: "COUNTER" }); battle.endOfTurnSteps = () => [];
  const pp = mon.moves.map(s => s.pp); battle.useItem("caffe"); battle.useItem("caffe");
  assert.equal(state.bag.caffe, 1); assert.equal(battle.battleHealingItemsUsed, 1); assert.equal(battle.queue.filter((s: any) => s.text === "COUNTER").length, 1);
  assert.match(battle.queue[0].text, /\+3 PV/); battle.queue[0].run(); assert.equal(mon.hp, statsOf(mon).hp); assert.deepEqual(mon.moves.map(s => s.pp), pp);
  battle.mode = "menu"; mon.status = "scandalo"; battle.player.gaffeTurns = 2; assert.equal(battle.supplyInfo("maalox").disabled, true);
  battle.maxBattleHealingItems = null; assert.match(battle.supplyInfo("maalox").hint, /GAFFE/); battle.queue = []; battle.useItem("maalox"); battle.queue[0].run();
  assert.equal(mon.status, null); assert.equal(battle.player.gaffeTurns, 0); assert.equal(state.bag.maalox, 0);
});

test("battle bag uses the selected stock once, rejects stale taps and cancel spends nothing", async () => {
  const { BagScene } = await import("../../src/scenes/BagScene"); const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(); state.bag = { caffe: 2, maalox: 1, scheda: 3, spray: 1 };
  const stack = new SceneStack(), input = { reset() {} }, battle = { update() {}, draw() {} }; stack.push(battle);
  const used: string[] = []; const options = { inBattle: true, battleItem: (id: string) => ({ hint: id === "caffe" ? "PV 1 → 9 · nemico risponde" : "Nessuno status", disabled: id !== "caffe" }), onUse: (id: string) => { used.push(id); state.bag[id]--; } };
  const bag = new BagScene(stack, input as never, state, options); stack.push(bag);
  const commands = bag.touchActions!; assert.ok(commands.find(c => c.label === ITEMS.maalox.name)?.disabled); assert.ok(!commands.some(c => c.label === ITEMS.spray.name));
  const use = commands.find(c => c.label === ITEMS.caffe.name)!; use.run(); use.run(); assert.deepEqual(used, ["caffe"]); assert.equal(stack.top, battle); assert.equal(state.bag.caffe, 1);
  const staleBag = new BagScene(stack, input as never, state, options); stack.push(staleBag); const stale = staleBag.touchActions!.find(c => c.label === ITEMS.caffe.name)!;
  state.bag.caffe = 0; stale.run(); assert.equal(stack.top, staleBag); assert.deepEqual(used, ["caffe"]);
  const before = JSON.stringify(state); staleBag.touchActions!.find(c => c.label === "INDIETRO")!.run(); assert.equal(JSON.stringify(state), before); assert.equal(stack.top, battle);
});

test("battle inventory pages and campaign remain reachable; old page taps cannot spend stock", async () => {
  const { BagScene } = await import("../../src/scenes/BagScene"); const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(); state.bag = { scheda: 1, caffe: 2, spritz: 1, maalox: 1 };
  const stack = new SceneStack(), input = { reset() {} }, battle = { update() {}, draw() {} }; stack.push(battle);
  let campaigns = 0, uses = 0;
  const bag = new BagScene(stack, input as never, state, { inBattle: true, battleItem: () => ({ hint: "LIVE", disabled: false }), onUse: () => uses++, onCampaign: () => campaigns++ }); stack.push(bag);
  const initial = bag.touchActions!, old = initial.find(a => a.label === ITEMS.caffe.name)!;
  initial.find(a => a.label === "ALTRI")!.run(); old.run(); assert.equal(uses, 0); assert.equal(stack.top, bag);
  assert.ok(bag.touchActions!.some(a => a.label === ITEMS.maalox.name));
  const campaign = bag.touchActions!.find(a => a.label === "CAMPAGNA")!; const before = JSON.stringify(state); campaign.run(); campaign.run();
  assert.equal(campaigns, 1); assert.equal(stack.top, battle); assert.equal(JSON.stringify(state), before);
});
