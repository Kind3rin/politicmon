import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { MOVES } from "../../src/data/moves.ts";
import type { Move } from "../../src/data/moves.ts";
import { BattleScene } from "../../src/game/battle/BattleScene.ts";
import { Polemica } from "../../src/game/battle/polemica.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";
import { POSTURES, foePostureFor, postureBlocksStatus, postureDamage, postureDealt, postureKeepsPP, posturePolemica, postureTaken } from "../../src/game/battle/posture.ts";
import { createMonster } from "../../src/game/monster.ts";
import { sharedTypes } from "../../src/game/battle/handoff.ts";
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

function fight(posture: "none" | "attacca" | "smentisci" | "tempo", side: "player" | "foe", move: Move, foePosture: "none" | "attacca" | "smentisci" | "tempo" = "none") {
  const realRandom = Math.random; Math.random = () => 0.5;
  try {
    const state = newGameState(), player = makeCombatant(createMonster("berlusconix", 20)), foe = makeCombatant(createMonster("mediocrate", 20));
    state.sondaggi = 50;
    const b: any = Object.create(BattleScene.prototype);
    Object.assign(b, { state, player, foe, queue: [], field: undefined, fieldTurn: 1, fieldResolved: true, fx: { onHit() {}, telegraph: null }, polemica: new Polemica(),
      announcedOffensive: new Set(), turnPosture: posture, turnFoePosture: foePosture, posture: "none", actionCaption: null, copione: false, battery: 0, trainer: undefined, electionTurn: 1 });
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

test("A gaffe followed by a scandal on the same target raises a one-off Bufera worth an eighth of its health", () => {
  const realRandom = Math.random; Math.random = () => 0.2;
  try {
    const scandal: Move = { id: "test-scandal", name: "Scandalo", type: "MEDIA", category: "status", power: 0, accuracy: 100, pp: 5, flavor: "",
      effect: { status: { id: "scandalo", chance: 100, target: "foe" } } };
    const state = newGameState(), player = makeCombatant(createMonster("berlusconix", 20)), foe = makeCombatant(createMonster("mediocrate", 20));
    const b: any = Object.create(BattleScene.prototype);
    Object.assign(b, { state, player, foe, queue: [], field: undefined, fieldTurn: 1, fieldResolved: true, fx: { onHit() {}, telegraph: null }, polemica: new Polemica(),
      announcedOffensive: new Set(), turnPosture: "none", posture: "none", actionCaption: null, copione: false, battery: 0, trainer: undefined, electionTurn: 1,
      buferaDone: new WeakSet(), displayHp: { player: 0, foe: 0 } });
    foe.gaffeTurns = 3;
    const max = foe.mon.hp, drain = () => { while (b.queue.length) b.queue.shift().run?.(); };
    for (const step of b.moveSteps("player", player, foe, scandal, "A", true)) step.run?.();
    drain();
    assert.equal(foe.mon.status, "scandalo", "the scandal landed on top of the gaffe");
    assert.equal(foe.mon.hp, max - Math.max(1, Math.floor(max / 8)), "bufera took an eighth");
    for (const step of b.moveSteps("player", player, foe, { ...scandal, id: "test-scandal-2" }, "A", true)) step.run?.();
    drain();
    assert.equal(foe.mon.hp, max - Math.max(1, Math.floor(max / 8)), "it happens only once per fighter");
  } finally { Math.random = realRandom; }
});

test("handing over to a companion that shares a type brings it in motivated, once per pair", () => {
  const state = newGameState();
  const a = createMonster("berlusconix", 20), same = createMonster("mediocrate", 20), other = createMonster("ellyna", 20);
  assert.ok(sharedTypes(a, same).length > 0, "fixture: same type family");
  assert.deepEqual(sharedTypes(a, other), [], "fixture: unrelated types");
  state.party = [a, same, other];
  const b: any = Object.create(BattleScene.prototype);
  Object.assign(b, { state, player: makeCombatant(a), foe: makeCombatant(createMonster("giorgetta", 20)), queue: [], finished: false, displayHp: { player: 0, foe: 0 },
    displayExp: 0, mode: "menu", field: undefined, fieldTurn: 1, foeIntent: null });
  b.stack = { top: b };
  b.foeCounterStep = () => ({}); b.endOfTurnSteps = () => [];
  b.switchTo(same, false);
  assert.equal(b.player.stages.atk, 1); assert.equal(b.player.stages.spd, 1);
  assert.ok(b.queue.some((step: any) => /CONSEGNE/.test(step.text ?? "")));
  b.queue.length = 0; b.switchTo(a, false); b.queue.length = 0; b.switchTo(same, false);
  assert.equal(b.player.stages.atk, 0, "the same pair does not pay out twice");
  b.queue.length = 0; b.switchTo(other, false);
  assert.equal(b.player.stages.atk, 0, "different types: no baton");
});

test("the opponent's declared posture works the same way against the player", () => {
  const strike = MOVES.editoriale;
  const playerBase = fight("none", "player", strike).lost, foeBase = fight("none", "foe", strike).lost;
  assert.equal(fight("none", "foe", strike, "attacca").lost, postureDamage(foeBase, 1.3), "an aggressive foe hits harder");
  assert.equal(fight("none", "player", strike, "attacca").lost, postureDamage(playerBase, 1.3), "and takes more");
  assert.equal(fight("none", "player", strike, "smentisci").lost, postureDamage(playerBase, 0.55), "a foe that denies soaks the blow");
  assert.equal(fight("none", "foe", strike, "smentisci").lost, postureDamage(foeBase, 0.8), "and hits less");
  assert.equal(fight("attacca", "player", strike, "smentisci").lost, postureDamage(playerBase, 1.3 * 0.55), "postures multiply across both sides");
  const smear: Move = { id: "test-smear2", name: "Dossier", type: "MEDIA", category: "status", power: 0, accuracy: 100, pp: 5, flavor: "",
    effect: { status: { id: "scandalo", chance: 100, target: "foe" } } };
  assert.equal(fight("none", "player", smear).status, "scandalo");
  assert.equal(fight("none", "player", smear, "smentisci").status, null, "the foe's denial blocks the player's status");
});

test("a trainer answers your Attacca with Smentisci, unless it is low on HP, and otherwise keeps its own style", () => {
  const healthy = { hp: .8, intentAttacks: true, lastPlayer: "attacca" as const };
  assert.equal(foePostureFor({ ...healthy, style: "fortress" }), "smentisci", "any style answers an Attacca");
  assert.equal(foePostureFor({ ...healthy, style: "rush" }), "smentisci", "the answer beats the rush's own Attacca");
  assert.equal(foePostureFor({ hp: .3, style: "pressure", intentAttacks: true, lastPlayer: "attacca" }), "none", "low HP: no answer, no pressure");
  assert.equal(foePostureFor({ hp: .3, style: "fortress", intentAttacks: true, lastPlayer: "none" }), "smentisci", "low HP keeps the defensive habit");
  assert.equal(foePostureFor({ hp: .8, style: "pressure", intentAttacks: true, lastPlayer: "smentisci" }), "attacca", "no answer to Smentisci: own style");
  assert.equal(foePostureFor({ hp: .8, style: "setup", intentAttacks: false, lastPlayer: "tempo" }), "tempo", "setup stalls on a status intent");
  assert.equal(foePostureFor({ hp: .8, style: "setup", intentAttacks: true, lastPlayer: "none" }), "none");
});

test("the battle scene asks the rule with the posture you used last turn; rivals stay out of it", () => {
  const b: any = Object.create(BattleScene.prototype);
  const attack = Object.values(MOVES).find((m: Move) => m.power > 0)!;
  Object.assign(b, { trainer: { id: "tycoon" }, ai: { style: "pressure" }, foe: makeCombatant(createMonster("mediocrate", 20)), lastPlayerPosture: "attacca" });
  assert.equal(b.pickFoePosture(attack), "smentisci");
  assert.equal(b.foeReadsAttacca, true, "the banner says it saw your Attacca");
  b.lastPlayerPosture = "none";
  assert.equal(b.pickFoePosture(attack), "attacca", "without the habit the pressure style attacks");
  Object.assign(b, { trainer: { id: "rival1" }, lastPlayerPosture: "attacca" });
  assert.equal(b.pickFoePosture(attack), "none", "the first rival declares no posture");
});

test("every posture has its own icon, and the file is in the build", () => {
  const icons = Object.values(POSTURES).map(info => info.icon);
  assert.equal(new Set(icons).size, 3, "three different icons");
  for (const icon of icons) {
    assert.match(icon, /^\/sprites\/ui\/posture\/[a-z]+\.png$/);
    assert.ok(existsSync(new URL(`../../public${icon}`, import.meta.url)), `${icon} exists under public/`);
  }
});
