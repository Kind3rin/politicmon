import assert from "node:assert/strict";
import test from "node:test";
import { archivedMoves } from "../../src/game/moveArchive";
import { createMonster } from "../../src/game/monster";
import { preparationNotes } from "../../src/game/battle/preparation";
import { newGameState } from "../../src/game/state";

test("archive excludes future, current and other-branch moves without changing the candidate", () => {
  const mon = createMonster("generorso", 27);
  const before = JSON.stringify(mon), moves = archivedMoves(mon);
  assert.ok(moves.includes("mondocontrario"));
  assert.ok(!moves.includes("pienipoteri"));
  assert.ok(!moves.includes("decreto"));
  assert.ok(!moves.includes("rebrand"));
  assert.ok(mon.moves.every((s) => !moves.includes(s.id)));
  assert.equal(new Set(moves).size, moves.length);
  assert.equal(JSON.stringify(mon), before);
  mon.level = 28;
  assert.ok(archivedMoves(mon).includes("pienipoteri"));
});
test("preparation reads actual immunities, PP and defense boosts without consuming state or RNG", () => {
  const state = newGameState(); state.party = [createMonster("salvinator", 30), createMonster("renzilla", 30)];
  state.party[1].hp = 0;
  const foe = createMonster("draghimon", 30), before = JSON.stringify({ state, foe });
  const final = createMonster("mattarellux", 32); final.heldItem = "gilet";
  const original = Math.random; Math.random = () => { throw Error("Preview consumed live RNG"); };
  try {
    assert.match(preparationNotes(state, foe).join(" "), /DOPO VOTO DI FIDUCIA/);
    assert.match(preparationNotes(state, foe).join(" "), /KO, PRIMA TORNA AL BAR/);
    assert.equal(JSON.stringify({ state, foe }), before);
    assert.match(preparationNotes(state, final).join(" "), /GARANZIA/);
    assert.match(preparationNotes(state, final).join(" "), /GILET/);
    for (const slot of state.party[0].moves) slot.pp = 0;
    assert.match(preparationNotes(state, final).join(" "), /NESSUN ATTACCO CON PP/);
  } finally { Math.random = original; }
});
