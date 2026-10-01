import assert from "node:assert/strict";
import test from "node:test";
import { newGameState, parseGameState } from "../../src/game/state";
import { changeMorale, keepPromise, moraleEpilogue, moraleExpMultiplier, newMoraleState, normalizeMorale, promiseCost } from "../../src/game/morale";
import { resolveCivicChoice, civicNpcReply } from "../../src/game/civicChoices";
import { recordNewTrainerVictory } from "../../src/game/world/battleCoordinator";
import { shopPrice } from "../../src/game/governo";
import { ITEMS } from "../../src/data/items";
import { CLASSIC_MEME_EVENTS } from "../../src/data/meme-events/classics";
import { applyMemeEffects, canApplyMemeEffects } from "../../src/game/memeEventRuntime";
import { validateMemePack } from "../../src/editorial/memePackValidator";

test("morale: migrazione legacy e normalizzazione non alterano squadra o sondaggi", () => {
  const legacy = newGameState();
  legacy.sondaggi = 91;
  delete (legacy as Partial<typeof legacy>).morale;
  const parsed = parseGameState(JSON.stringify(legacy))!;
  assert.equal(parsed.sondaggi, 91);
  assert.deepEqual(parsed.morale, newMoraleState());
  assert.deepEqual(parsed.party, legacy.party);
  assert.deepEqual(normalizeMorale({ trust: -1, cohesion: 1000, promises: [{ id: "__proto__" }, { id: "bus", status: "invalid", dueAt: -20 }, { id: "bus" }] }).promises, [{ id: "bus", status: "pending", dueAt: 0 }]);
  assert.equal(normalizeMorale({ trust: NaN, cohesion: Infinity }).trust, 50);
});

test("scelta civica: fondi insufficienti e ripetizione non producono mutazioni", () => {
  const state = newGameState(); state.money = 179;
  const before = JSON.stringify(state);
  assert.equal(resolveCivicChoice(state, "bus", 0).ok, false);
  assert.equal(JSON.stringify(state), before);
  state.money = 500;
  assert.equal(resolveCivicChoice(state, "bus", 0).ok, true);
  assert.equal(state.money, 320);
  assert.equal(state.sondaggi, 48);
  assert.equal(state.morale.trust, 62);
  assert.equal(state.morale.cohesion, 66);
  const after = JSON.stringify(state);
  assert.equal(resolveCivicChoice(state, "bus", 2).ok, false);
  assert.equal(JSON.stringify(state), after);
});

test("promesse: soltanto tre vittorie nuove fanno scadere; selvatici, sconfitte e rematch non contano", () => {
  const state = newGameState();
  resolveCivicChoice(state, "bus", 1);
  for (const id of ["wander:x", "daily:x", "coppa:x", "weekly:2026-W40:1"]) recordNewTrainerVictory(state, id, "win");
  recordNewTrainerVictory(state, "aide", "loss");
  assert.equal(state.morale.progress, 0);
  recordNewTrainerVictory(state, "aide", "win");
  recordNewTrainerVictory(state, "aide", "win");
  recordNewTrainerVictory(state, "stagista", "win");
  assert.equal(state.morale.progress, 2);
  assert.equal(state.morale.promises[0].status, "pending");
  const restored = parseGameState(JSON.stringify(state))!;
  const notices = recordNewTrainerVictory(restored, "emittenza", "win");
  assert.equal(notices.length, 1);
  assert.equal(restored.morale.promises[0].status, "broken");
  assert.equal(restored.morale.trust, 40);
  assert.equal(restored.morale.cohesion, 54);
  assert.deepEqual(recordNewTrainerVictory(restored, "funzionario", "win"), []);
  assert.equal(restored.morale.trust, 40);
});

test("promessa mantenuta: pagamento esatto, niente premi duplicati e nessuna scadenza successiva", () => {
  const state = newGameState(); state.money = 180;
  resolveCivicChoice(state, "bus", 1);
  assert.equal(keepPromise(state, "bus"), "kept");
  assert.equal(state.money, 0);
  assert.equal(state.morale.trust, 64);
  const before = JSON.stringify(state);
  assert.equal(keepPromise(state, "bus"), "unavailable");
  assert.equal(JSON.stringify(state), before);
  for (const id of ["aide", "stagista", "emittenza"]) recordNewTrainerVictory(state, id, "win");
  assert.equal(state.morale.promises[0].status, "kept");
  assert.equal(state.morale.trust, 64);
});

test("ritardo: riparare costa 50% in più e lascia conseguenze nel save, nel dialogo e nell'epilogo", () => {
  const state = newGameState(); resolveCivicChoice(state, "bus", 1);
  for (const id of ["aide", "stagista", "emittenza"]) recordNewTrainerVictory(state, id, "win");
  assert.equal(promiseCost(state.morale.promises[0]), 270);
  state.money = 269;
  const before = JSON.stringify(state);
  assert.equal(keepPromise(state, "bus"), "funds");
  assert.equal(JSON.stringify(state), before);
  state.money = 270;
  assert.equal(keepPromise(state, "bus"), "repaired");
  assert.equal(state.money, 0);
  assert.equal(state.morale.trust, 47);
  assert.match(civicNpcReply(state, "egg-pensionato")!.join(" "), /ritardo/);
  assert.match(moraleEpilogue(state.morale).join(" "), /0 MANTENUTE\. 1 RIPARATE/);
  assert.deepEqual(parseGameState(JSON.stringify(state))!.morale, state.morale);
});

test("fiducia e coesione: effetti distinti ai confini, senza alterare il consenso", () => {
  const state = newGameState(); const item = ITEMS.tessera;
  state.morale.trust = 69; state.morale.cohesion = 69;
  const neutralPrice = shopPrice(state, item);
  assert.equal(moraleExpMultiplier(state.morale), 1);
  changeMorale(state, "PROVA", 1, 1);
  assert.ok(shopPrice(state, item) < neutralPrice);
  assert.equal(moraleExpMultiplier(state.morale), 1.08);
  changeMorale(state, "PROVA", -40, -40);
  assert.equal(moraleExpMultiplier(state.morale), 1);
  changeMorale(state, "PROVA", -1, -1);
  assert.ok(shopPrice(state, item) > neutralPrice);
  assert.equal(moraleExpMultiplier(state.morale), .92);
  assert.equal(state.sondaggi, 50);
  changeMorale(state, "CLAMP", -1000, 1000);
  assert.equal(state.morale.trust, 0); assert.equal(state.morale.cohesion, 100);
  assert.notEqual(moraleEpilogue(state.morale)[0], moraleEpilogue(newMoraleState())[0]);
});

test("meme verificati: tradeoff reali e costi coperti prima della scelta", () => {
  const state = newGameState(); state.money = 159;
  const paid = CLASSIC_MEME_EVENTS[0].choices[1];
  assert.equal(canApplyMemeEffects(state, paid.effects), false);
  state.money = 160;
  assert.equal(canApplyMemeEffects(state, paid.effects), true);
  applyMemeEffects(state, paid.effects);
  assert.equal(state.money, 0); assert.equal(state.morale.cohesion, 68); assert.equal(state.morale.trust, 54); assert.equal(state.sondaggi, 53);
  const brokenPack = structuredClone(CLASSIC_MEME_EVENTS) as any;
  brokenPack[0].choices[0].effects.push({ kind: "trust", delta: "lots" });
  assert.ok(validateMemePack(brokenPack).errors.some((error) => error.message.includes("delta trust")));
});
