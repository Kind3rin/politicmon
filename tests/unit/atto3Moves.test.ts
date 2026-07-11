import assert from "node:assert/strict";
import test from "node:test";
import { MOVES, moveSummary } from "../../src/data/moves.ts";
import { SPECIES } from "../../src/data/species.ts";
import { festivalScandaloChance } from "../../src/game/battle/atto3MoveEffects.ts";
import { createMonster } from "../../src/game/monster.ts";
import { makeDuelSim, resolveTurn } from "../../src/game/battle/duelsim.ts";

const IDS = [
  "festival", "exit_poll", "autonomia", "diretta_social",
  "patto_verde", "voto_disgiunto", "smentita_flash", "piazza_aperta",
] as const;

test("P4-T07: otto mosse Atto 3 hanno contratti meccanici distinti", () => {
  assert.equal(new Set(IDS).size, 8);
  for (const id of IDS) assert.equal(MOVES[id].id, id);
  assert.deepEqual(MOVES.festival.effect?.statusIfFirst, { id: "scandalo", chance: 20, target: "foe" });
  assert.equal(MOVES.diretta_social.effect?.priority, 1);
  assert.equal(MOVES.patto_verde.effect?.drainRatio, 0.5);
  assert.equal(MOVES.voto_disgiunto.effect?.highCrit, true);
  assert.deepEqual(MOVES.smentita_flash.effect, { cureStatus: true, priority: 1 });
  assert.deepEqual(MOVES.piazza_aperta.effect?.stat, { key: "spc", stages: 2, target: "self" });
  assert.match(moveSummary(MOVES.festival), /20% SCANDALO SE PRIMO/);
});

test("FESTIVAL: SCANDALO 20% soltanto agendo per primi", () => {
  assert.equal(festivalScandaloChance(true), 20);
  assert.equal(festivalScandaloChance(false), 0);
});

test("FESTIVAL: il duello PvP applica lo stesso vincolo di ordine", () => {
  const fast = createMonster("salisound", 40);
  const slow = createMonster("crosettank", 40);
  fast.moves = [{ id: "festival", pp: 15 }];
  slow.moves = [{ id: "comizio", pp: 35 }];
  const first = makeDuelSim([fast], [slow]);
  resolveTurn(first, { kind: "move", moveId: "festival" }, { kind: "move", moveId: "comizio" }, () => 0);
  assert.equal(first.guest.active.mon.status, "scandalo");

  const late = createMonster("crosettank", 40);
  const quick = createMonster("salisound", 40);
  late.moves = [{ id: "festival", pp: 15 }];
  quick.moves = [{ id: "comizio", pp: 35 }];
  const second = makeDuelSim([late], [quick]);
  resolveTurn(second, { kind: "move", moveId: "festival" }, { kind: "move", moveId: "comizio" }, () => 0);
  assert.equal(second.guest.active.mon.status, null);
});

test("P4-T07: ogni nuova mossa entra in almeno un learnset Atto 3", () => {
  const roster = ["salisound", "quasimagiani", "crosettank", "campocorno", "referendodo"];
  const learned = new Set(roster.flatMap((id) => SPECIES[id].learnset.map(([, moveId]) => moveId)));
  for (const id of IDS) assert.equal(learned.has(id), true, `${id} non assegnata`);
});
