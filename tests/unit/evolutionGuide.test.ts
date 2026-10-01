import assert from "node:assert/strict";
import test from "node:test";
import { createMonster, evolve, statsOf, levelEvolution } from "../../src/game/monster";
import { careerNotes, evolutionComparison, evolutionPreview } from "../../src/game/evolutionGuide";
import { newGameState, parseGameState } from "../../src/game/state";
import { resolveCivicChoice, civicNpcReply } from "../../src/game/civicChoices";
import { shopPrice } from "../../src/game/governo";
import { ITEMS } from "../../src/data/items";

test("evolution forecast matches actual ratios without consuming PP, status, item or seasonal form", () => {
  const mon = createMonster("giorgetta", 18);
  mon.hp = 7; mon.status = "scandalo"; mon.heldItem = "caffettiera";
  mon.moves[0].pp = 0; mon.memeFormId = "invalid-form";
  const before = JSON.stringify(mon);
  const forecast = evolutionPreview(mon, "giorgiagon");
  assert.equal(JSON.stringify(mon), before);
  assert.equal(forecast.memeFormId, undefined);
  assert.equal(forecast.heldItem, mon.heldItem); assert.equal(forecast.status, mon.status);
  assert.deepEqual(forecast.moves, mon.moves);
  evolve(mon, "giorgiagon"); assert.deepEqual(mon, forecast);
  forecast.moves[0].pp = 3; assert.equal(mon.moves[0].pp, 0);
});

test("evolving a fainted candidate does not provide a free revival", () => {
  const mon = createMonster("salvinator", 30); mon.hp = 0;
  assert.equal(evolutionPreview(mon, "capitanone").hp, 0);
  evolve(mon, "capitanone"); assert.equal(mon.hp, 0); assert.ok(statsOf(mon).hp > 0);
});

test("deferred careers re-evaluate both polling branches at the level cap", () => {
  const mon = createMonster("salvinott", 55);
  assert.equal(levelEvolution(mon, 49), "salvinurlo");
  assert.equal(levelEvolution(mon, 50), "salvinator");
  assert.match(careerNotes(mon, 49).join(" "), /PRONTA: SALVINURLO/);
  assert.match(careerNotes(mon, 50).join(" "), /SONDAGGI SOTTO 50/);
  assert.match(evolutionComparison(mon, "salvinator", 2).join(" "), /NON IMPARA AUTOMATICAMENTE/);
});

test("fuel signage is a persistent tradeoff and cannot be farmed for polls or money", () => {
  const state = newGameState(); state.money = 79;
  const before = JSON.stringify(state);
  assert.equal(resolveCivicChoice(state, "pompa", 1).ok, false); assert.equal(JSON.stringify(state), before);
  state.money = 500; state.morale.trust = 70;
  const price = shopPrice(state, ITEMS.tessera);
  assert.equal(resolveCivicChoice(state, "pompa", 1).ok, true);
  assert.equal(state.money, 420); assert.equal(state.sondaggi, 55); assert.equal(state.morale.trust, 65);
  assert.ok(shopPrice(state, ITEMS.tessera) > price);
  const restored = parseGameState(JSON.stringify(state))!;
  assert.match(civicNpcReply(restored, "benzinaio-r3")!.join(" "), /prezzo/);
  const after = JSON.stringify(restored);
  assert.equal(resolveCivicChoice(restored, "pompa", 0).ok, false); assert.equal(JSON.stringify(restored), after);
});
