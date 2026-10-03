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
    assert.match(preparationNotes(state, foe).join(" "), /DOPO Voto di fiducia/);
    assert.match(preparationNotes(state, foe).join(" "), /KO, PRIMA TORNA AL BAR/);
    assert.equal(JSON.stringify({ state, foe }), before);
    assert.match(preparationNotes(state, final).join(" "), /Garanzia/);
    assert.match(preparationNotes(state, final).join(" "), /GILET/);
    for (const slot of state.party[0].moves) slot.pp = 0;
    assert.match(preparationNotes(state, final).join(" "), /NESSUN ATTACCO CON PP/);
  } finally { Math.random = original; }
});

test("archive touch pages reach earned moves and reject old pages or already learned choices", async () => {
  const { RecallScene } = await import("../../src/scenes/RecallScene"); const { TeachScene } = await import("../../src/scenes/TeachScene"); const { SceneStack } = await import("../../src/engine/scene");
  const state = newGameState(), mon = createMonster("renzilla", 28); state.party = [mon]; mon.moves = [{ id: "giravolta", pp: 1 }];
  const input = { reset() {}, wasPressed() { return false; } }, stack = new SceneStack(), archive = new RecallScene(stack, input as never, state, mon); stack.push(archive);
  const before = JSON.stringify(state), first = archive.touchActions;
  assert.equal(first.length, 6); assert.equal(first[4].disabled, false); first[4].run(); first[0].run(); assert.equal(stack.top, archive);
  const page = archive.touchActions, choice = page[0]; choice.run(); assert.ok(stack.top instanceof TeachScene); assert.equal(JSON.stringify(state), before);
  choice.run(); assert.ok(stack.top instanceof TeachScene); stack.top.touchActions.find(a => a.label === "RINUNCIA")!.run();
  const id = archivedMoves(mon)[4]; mon.moves.push({ id, pp: 1 }); choice.run(); assert.equal(stack.top, archive);
  archive.touchActions[5].run(); assert.equal(stack.top, undefined);
});
