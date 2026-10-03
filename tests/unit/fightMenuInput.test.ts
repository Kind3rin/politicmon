import assert from "node:assert/strict";
import test from "node:test";
import { MOVES, moveSummary } from "../../src/data/moves.ts";
test("tutte le 78 mosse hanno un effetto runtime supportato e feedback meccanico", () => {
  const supported = new Set([
    "status", "stat", "healRatio", "drainRatio", "recoilRatio",
    "cureStatus", "highCrit", "priority", "statusIfFirst"
  ]);
  const moves = Object.values(MOVES);
  assert.equal(moves.length, 78);
  for (const move of moves) {
    for (const key of Object.keys(move.effect ?? {})) {
      assert.ok(supported.has(key), `${move.id}: effetto senza handler ${key}`);
    }
    assert.ok(moveSummary(move).trim().length > 0, `${move.id}: feedback meccanico mancante`);
    assert.ok(move.pp > 0, `${move.id}: PP massimi invalidi`);
  }
});


test("l'intento nemico indica il bersaglio dal punto di vista del giocatore e distingue la potenza dai PV", () => {
  const attack = Object.values(MOVES).find(m => m.effect?.stat?.target === "foe")!;
  const setup = Object.values(MOVES).find(m => m.effect?.stat?.target === "self")!;
  assert.match(moveSummary(attack, "foe"), /TUO/);
  assert.match(moveSummary(setup, "foe"), /NEMICO/);
  assert.match(moveSummary(attack), /NEMICO/);
  assert.match(moveSummary(setup), /TUO/);
  assert.match(moveSummary(MOVES.comizio, "foe"), /POTENZA 40/);
});
