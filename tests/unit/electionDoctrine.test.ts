import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, newCoalitionState } from "../../src/game/coalition.ts";
import { electionDoctrine } from "../../src/game/electionDoctrine.ts";

test("P5-T07: dottrina deriva dall'assetto ma SCISSIONE ha priorità", () => {
  const one = addAlly(newCoalitionState(), "campo_secretary");
  assert.equal(one.ok, true); if (!one.ok) return;
  const two = addAlly(one.state, "civic_mayor");
  assert.equal(two.ok, true); if (!two.ok) return;
  assert.equal(electionDoctrine(two.state, {}), "lista_civica");
  assert.equal(electionDoctrine(two.state, { "coalition-broken:generorso": true }), "scissione");
});
