import assert from "node:assert/strict";
import test from "node:test";
import { MOVES } from "../../src/data/moves.ts";
import type { Move } from "../../src/data/moves.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import { Polemica } from "../../src/game/battle/polemica.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";
import { POSTURES, postureBlocksStatus, postureDamage, postureDealt, postureKeepsPP, posturePolemica, postureTaken } from "../../src/game/battle/posture.ts";
import { createMonster } from "../../src/game/monster.ts";
import { newGameState } from "../../src/game/state.ts";

test("postures trade damage dealt against damage taken, and each has one clear job", () => {
  assert.equal(postureDealt("none"), 1); assert.equal(postureTaken("none"), 1);
  assert.ok(postureDealt("attacca") > 1 && postureTaken("attacca") > 1, "attacca: more both ways");
  assert.ok(postureDealt("smentisci") < 1 && postureTaken("smentisci") < 0.6, "smentisci: soaks the blow, hits less");
  assert.ok(postureDealt("tempo") < 1 && postureTaken("tempo") === 1);
  assert.equal(postureBlocksStatus("smentisci"), true); assert.equal(postureBlocksStatus("attacca"), false);
  assert.equal(postureKeepsPP("tempo"), true); assert.equal(postureKeepsPP("none"), false);
  assert.equal(posturePolemica("tempo"), 1); assert.equal(posturePolemica("attacca"), 0);
  assert.deepEqual(Object.keys(POSTURES).sort(), ["attacca", "smentisci", "tempo"]);
  for (const info of Object.values(POSTURES)) { assert.ok(info.rule.length > 20); assert.ok(info.tip.length > 20); }
});

test("posture damage never rounds a hit to nothing and never invents damage from a miss", () => {
  assert.equal(postureDamage(0, 1.3), 0);
  assert.equal(postureDamage(1, 0.55), 1);
  assert.equal(postureDamage(20, 1.3), 26);
  assert.equal(postureDamage(20, 0.55), 11);
});

function fight(posture: "none" | "attacca" | "smentisci" | "tempo", side: "player" | "foe", move: Move) {
  const realRandom = Math.random; Math.random = () => 0.5;
  try {
    const state = newGameState(), player = makeCombatant(createMonster("berlusconix", 20)), foe = makeCombatant(createMonster("mediocrate", 20));
    state.sondaggi = 50;
    const b: any = Object.create(BattleScene.prototype);
    Object.assign(b, { state, player, foe, queue: [], field: undefined, fieldTurn: 1, fieldResolved: true, fx: { onHit() {}, telegraph: null }, polemica: new Polemica(),
      announcedOffensive: new Set(), turnPosture: posture, posture: "none", actionCaption: null, copione: false, battery: 0, trainer: undefined, electionTurn: 1 });
    const attacker = side === "player" ? player : foe, defender = side === "player" ? foe : player;
    defender.mon.hp = 9999;
    const hp = defender.mon.hp;
    for (const step of b.moveSteps(side, attacker, defender, move, "A", true)) step.run?.();
    return { lost: hp - defender.mon.hp, status: defender.mon.status, texts: [] as string[] };
  } finally { Math.random = realRandom; }
}

test("a posture scales the damage dealt by the player and the damage taken by the player, and only those", () => {
  const strike = MOVES.editoriale;
  const base = fight("none", "player", strike).lost, baseTaken = fight("none", "foe", strike).lost;
  assert.ok(base > 5 && baseTaken > 5);
  assert.equal(fight("attacca", "player", strike).lost, postureDamage(base, 1.3));
  assert.equal(fight("smentisci", "player", strike).lost, postureDamage(base, 0.8));
  assert.equal(fight("tempo", "player", strike).lost, postureDamage(base, 0.9));
  assert.equal(fight("attacca", "foe", strike).lost, postureDamage(baseTaken, 1.3));
  assert.equal(fight("smentisci", "foe", strike).lost, postureDamage(baseTaken, 0.55));
  assert.equal(fight("tempo", "foe", strike).lost, baseTaken, "stalling does not soften the reply");
});

test("only Smentisci stops a status aimed at the player; the player's own statuses still land", () => {
  const smear: Move = { id: "test-smear", name: "Dossier", type: "MEDIA", category: "status", power: 0, accuracy: 100, pp: 5, flavor: "",
    effect: { status: { id: "scandalo", chance: 100, target: "foe" } } };
  assert.equal(fight("none", "foe", smear).status, "scandalo");
  assert.equal(fight("attacca", "foe", smear).status, "scandalo");
  assert.equal(fight("smentisci", "foe", smear).status, null, "the denial blocks it");
  assert.equal(fight("smentisci", "player", smear).status, "scandalo", "it never protects the opponent");
});
