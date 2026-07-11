import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BADGES, TRAINERS } from "../../src/data/trainers.ts";
import { MAPS } from "../../src/data/maps.ts";
import { SPECIES, STARTERS } from "../../src/data/species.ts";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";
import { newElectionState, startElection } from "../../src/game/election.ts";
import { assegnaMinistro, hasMinistro } from "../../src/game/governo.ts";
import { catchChance } from "../../src/game/battle/sim.ts";
import { createMonster, itemEvolution, levelEvolution } from "../../src/game/monster.ts";
import { markCaught, newGameState } from "../../src/game/state.ts";
import { unlockVehicle, hasVehicle, bulldozedKey } from "../../src/game/vehicles.ts";

test("P7-T04 nuova partita: starter validi e stato iniziale giocabile", () => {
  const state = newGameState(); assert.equal(STARTERS.length, 3); assert.ok(STARTERS.every((id) => SPECIES[id])); assert.equal(state.money, 500); assert.equal(state.pos.mapId, "borgo");
});
test("P7-T04 tre palestre: leader, badge e reward sono completi", () => {
  for (const id of ["emittenza", "ladydirettiva", "tycoon"]) { const trainer = TRAINERS[id]; assert.ok(trainer.badge && BADGES[trainer.badge]); assert.ok(trainer.team.length >= 2); }
});
test("P7-T04 evoluzioni: livello, oggetto e sondaggi restano instradati", () => {
  const levelMon = createMonster("giorgetta", 16); assert.ok(levelEvolution(levelMon, 50));
  const itemMon = createMonster("vannaccix", 30); assert.equal(itemEvolution(itemMon, "tessera_futuro"), "futurorso");
  const pollMon = createMonster("salistrobo", 32); assert.equal(levelEvolution(pollMon, 54), undefined); assert.equal(levelEvolution(pollMon, 55), "salisound");
});
test("P7-T04 cattura e box: probabilità valida, Dex e deposito persistibile", () => {
  const state = newGameState(); const mon = createMonster("salvinott", 5); mon.hp = 1; assert.ok(catchChance(mon, "scheda") > .5); markCaught(state, mon.speciesId); state.boxed.push(mon); assert.equal(state.dex.salvinott, "caught"); assert.equal(state.boxed[0].uid, mon.uid);
});
test("P7-T04 Governo Ombra: assegnazione ministero resta attiva", () => {
  const state = newGameState(); const mon = createMonster("giorgetta", 10); state.party.push(mon); assegnaMinistro(state, "economia", mon); assert.equal(hasMinistro(state, "economia"), true);
});
test("P7-T04 veicoli e warp: unlock, ruspa e destinazioni sono valide", () => {
  const state = newGameState(); unlockVehicle(state, "ruspa"); assert.equal(hasVehicle(state, "ruspa"), true); assert.equal(bulldozedKey("borgo", 2, 3), "borgo:2:3"); for (const map of Object.values(MAPS)) for (const warp of map.warps) assert.ok(MAPS[warp.toMap]);
});
test("P7-T04 percorso end-game: Palazzo, Colle, Offshore e Bruxelles esistono", () => {
  for (const id of ["palazzo", "colle", "offshore", "bruxelles"]) assert.equal(MAPS[id]?.id, id);
});
test("P7-T04 Coalizione, collegi ed Election Night iniziano una sola run", () => {
  const coalition = addAlly(newCoalitionState(), "campo_secretary"); assert.equal(coalition.ok, true);
  const ready = { ...newElectionState(), phase: "ready" as const };
  const election = startElection(ready, "regression-run"); assert.equal(election.ok, true); if (election.ok) { assert.equal(election.state.districts.length, 5); assert.equal(startElection(election.state, "altra-run").ok, false); }
});
test("P7-T04 PvP usa simulatore condiviso e non duplica effetti PvE", () => {
  const duel = readFileSync("src/game/battle/duelsim.ts", "utf8"); assert.match(duel, /calcDamage/); assert.match(duel, /effectContract/); assert.doesNotMatch(duel, /trainerRematch|weeklyCampaign/);
});
test("P7-T04 aggiornamento PWA non legge o cancella i salvataggi", () => {
  const sw = readFileSync("public/sw.js", "utf8"); assert.match(sw, /caches/); assert.doesNotMatch(sw, /localStorage\s*\.\s*(?:clear|removeItem)|indexedDB\.deleteDatabase/);
});
