import assert from "node:assert/strict";
import test from "node:test";
import { BAG_ORDER, ITEMS } from "../../src/data/items";
import { newGameState } from "../../src/game/state";
import { createMonster } from "../../src/game/monster";
import { buySupplies, shopStock, supplyNotes } from "../../src/game/supplyGuide";
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
