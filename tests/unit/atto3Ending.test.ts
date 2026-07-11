import { test } from "node:test";
import assert from "node:assert/strict";
import { ATTO3_ENDINGS, applyAtto3EndingReward, deriveAtto3Ending } from "../../src/game/atto3Ending.ts";
import { calculateElectionResult, newElectionState } from "../../src/game/election.ts";
import { newGameState } from "../../src/game/state.ts";
import { addAlly } from "../../src/game/coalition.ts";

function stateWith(government: boolean, fractured: boolean) {
  const state = newGameState();
  const base = newElectionState(true);
  const local = government ? [60, 60, 60, 40, 40] : [60, 60, 40, 40, 40];
  state.election = { ...base, phase: "resolved", result: calculateElectionResult(base.districts.map((d, i) => ({ ...d, localConsensus: local[i] })), true) };
  const ally = addAlly(state.coalition, "campo_secretary");
  if (ally.ok) state.coalition = ally.state;
  if (fractured) state.flags["coalition-broken:generorso"] = true;
  return state;
}

test("P5-T08: le quattro combinazioni producono quattro epiloghi distinti", () => {
  assert.equal(deriveAtto3Ending(stateWith(true, false))?.id, "government_cohesive");
  assert.equal(deriveAtto3Ending(stateWith(true, true))?.id, "government_fractured");
  assert.equal(deriveAtto3Ending(stateWith(false, false))?.id, "opposition_cohesive");
  assert.equal(deriveAtto3Ending(stateWith(false, true))?.id, "opposition_fractured");
});

test("P5-T08: tutti i finali hanno premio equivalente e idempotente", () => {
  for (const ending of Object.values(ATTO3_ENDINGS)) {
    const state = stateWith(ending.id.startsWith("government"), ending.id.endsWith("fractured"));
    const before = state.money;
    assert.equal(applyAtto3EndingReward(state, ending), true);
    assert.equal(state.money, before + 2500);
    assert.equal(state.bag.schedona, 2);
    assert.equal(state.flags[ending.cosmeticFlag], true);
    assert.equal(applyAtto3EndingReward(state, ending), false);
    assert.equal(state.money, before + 2500);
  }
});
