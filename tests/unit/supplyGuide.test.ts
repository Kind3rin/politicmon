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
