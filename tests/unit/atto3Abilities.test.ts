import assert from "node:assert/strict";
import test from "node:test";
import { ABILITIES } from "../../src/data/abilities.ts";
import { MOVES } from "../../src/data/moves.ts";
import { createMonster } from "../../src/game/monster.ts";
import {
  resolveHitReactionAbility, resolveKoAbility,
} from "../../src/game/battle/effectContract.ts";
import { makeDuelSim, resolveTurn } from "../../src/game/battle/duelsim.ts";
import { calcDamage, makeCombatant } from "../../src/game/battle/sim.ts";

test("P4-T08: cinque abilita Atto 3 sono dichiarate", () => {
  for (const id of ["tabularasa", "forchettasondaggi", "primapagina", "contraddittorio", "staffetta"]) {
    assert.equal(ABILITIES[id].id, id);
  }
});

test("PRIMA PAGINA: bonus una-tantum e reset a ogni ingresso", () => {
  const attacker = makeCombatant(createMonster("salistrobo", 35));
  const defender = makeCombatant(createMonster("crosettank", 35));
  const first = calcDamage(attacker, defender, MOVES.festival, () => 0.9).damage;
  const second = calcDamage(attacker, defender, MOVES.festival, () => 0.9).damage;
  assert.ok(first > second);
  const reentered = makeCombatant(attacker.mon);
  assert.equal(reentered.firstAttackUsed, false);
});

test("CONTRADDITTORIO: reagisce una volta anche se chiamato come multi-hit", () => {
  const defender = makeCombatant(createMonster("gianimago", 35));
  const first = resolveHitReactionAbility(defender);
  defender.stages.spc = first.resulting;
  const second = resolveHitReactionAbility(defender);
  assert.equal(first.triggered, true);
  assert.equal(first.resulting, 1);
  assert.equal(second.triggered, false);
  assert.equal(defender.stages.spc, 1);
});

test("STAFFETTA: scatta solo su KO causato da un utilizzatore vivo", () => {
  const attacker = makeCombatant(createMonster("nordiodo", 35));
  const defender = makeCombatant(createMonster("crosettank", 35));
  assert.equal(resolveKoAbility(attacker, defender).triggered, false);
  defender.mon.hp = 0;
  assert.deepEqual(resolveKoAbility(attacker, defender), { triggered: true, key: "spd", resulting: 1 });
  attacker.mon.hp = 0;
  assert.equal(resolveKoAbility(attacker, defender).triggered, false);
});

test("abilità post-hit e KO emettono stage autoritativi nel PvP", () => {
  const host = createMonster("nordiodo", 50);
  const guest = createMonster("gianimago", 20);
  host.moves = [{ id: "comizio", pp: 35 }];
  guest.moves = [{ id: "comizio", pp: 35 }];
  guest.hp = 1;
  const sim = makeDuelSim([host], [guest]);
  const events = resolveTurn(sim, { kind: "move", moveId: "comizio" }, { kind: "move", moveId: "comizio" }, () => 0.9);
  assert.ok(events.some((e) => e.e === "stat" && e.side === "host" && e.key === "spd"));
  assert.equal(events.some((e) => e.e === "stat" && e.side === "guest" && e.key === "spc"), false, "un KO non attiva CONTRADDITTORIO");
});
