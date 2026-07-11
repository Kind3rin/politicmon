import test from "node:test";
import assert from "node:assert/strict";
import { adaptiveGymRoster, buildRematchDef, gymRematchDoctrine } from "../../src/game/rematch.ts";
import { TRAINERS } from "../../src/data/trainers.ts";
import { calculateElectionResult, newElectionState } from "../../src/game/election.ts";
import { newGameState } from "../../src/game/state.ts";

function ending(government: boolean) {
  const state = newGameState(); const election = newElectionState(true);
  const locals = government ? [60, 60, 60, 40, 40] : [60, 60, 40, 40, 40];
  state.election = { ...election, phase: "resolved", result: calculateElectionResult(election.districts.map((district, index) => ({ ...district, localConsensus: locals[index] })), true) };
  return state;
}

test("P6-T03: Governo e Opposizione selezionano roster diversi senza RNG", () => {
  const government = ending(true); const opposition = ending(false);
  assert.equal(gymRematchDoctrine(government), "government"); assert.equal(gymRematchDoctrine(opposition), "opposition");
  for (const id of ["emittenza", "ladydirettiva", "tycoon"]) {
    const gov = adaptiveGymRoster(government, id); const opp = adaptiveGymRoster(opposition, id);
    assert.ok(gov && opp); assert.notDeepEqual(gov?.team, opp?.team);
    assert.deepEqual(adaptiveGymRoster(government, id), gov);
  }
});

test("P6-T03: frattura coalizione ha priorità e terzo roster dedicato", () => {
  const state = ending(true); state.flags["coalition-broken:generorso"] = true;
  assert.equal(gymRematchDoctrine(state), "coalition");
  const roster = adaptiveGymRoster(state, "emittenza");
  assert.equal(roster?.label, "ROSTER DI COALIZIONE");
  assert.notDeepEqual(roster?.team, adaptiveGymRoster(ending(true), "emittenza")?.team);
});

test("P6-T03: build rematch usa variante, conserva payout e rimuove badge/reward", () => {
  const state = ending(false); const built = buildRematchDef(state, TRAINERS.emittenza);
  assert.match(built.intro[0], /ROSTER D'OPPOSIZIONE/);
  assert.equal(built.badge, undefined); assert.equal(built.reward, undefined);
  assert.ok(built.money > 0);
});
