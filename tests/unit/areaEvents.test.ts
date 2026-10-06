import assert from "node:assert/strict";
import test from "node:test";
import { AREA_EVENTS, applyFieldEvent, chooseAreaEvent } from "../../src/game/battle/fieldEvents.ts";
import { createMonster, statsOf } from "../../src/game/monster.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";

const event = (id: string) => AREA_EVENTS.find(e => e.id === id)!;
const pair = () => [makeCombatant(createMonster("ellyna", 20)), makeCombatant(createMonster("salvinott", 20))] as const;

test("the rule of the day is tied to the place and only every third fight", () => {
  assert.deepEqual([1, 2, 4, 5].map(n => chooseAreaEvent("capitale", n)), [undefined, undefined, undefined, undefined]);
  assert.equal(chooseAreaEvent("capitale", 3)?.id, "taglio");
  assert.equal(chooseAreaEvent("route2", 6)?.id, "diretta");
  assert.equal(chooseAreaEvent("eurotown", 9)?.id, "standard");
  assert.equal(chooseAreaEvent("route3", 12)?.id, "cantiere");
  assert.equal(chooseAreaEvent("borgo", 3), undefined, "the opening keeps its own three events");
});

test("the budget cut takes 8% from both and never knocks anyone out", () => {
  const [p, f] = pair(), pMax = statsOf(p.mon).hp;
  p.mon.hp = 1; f.mon.hp = statsOf(f.mon).hp;
  applyFieldEvent(event("taglio"), p, f);
  assert.equal(p.mon.hp, 1);
  assert.equal(f.mon.hp, statsOf(f.mon).hp - Math.max(1, Math.floor(statsOf(f.mon).hp * .08)));
  p.mon.hp = pMax; applyFieldEvent(event("taglio"), p, f);
  assert.ok(p.mon.hp < pMax && p.mon.hp >= 1);
});

test("live TV raises both attacks, the EU standard clamps stages, the roadworks slow everyone", () => {
  let [p, f] = pair();
  p.stages.atk = 6; applyFieldEvent(event("diretta"), p, f);
  assert.equal(p.stages.atk, 6); assert.equal(f.stages.atk, 1);
  [p, f] = pair(); p.stages.atk = 4; p.stages.def = -3; f.stages.spc = 2;
  applyFieldEvent(event("standard"), p, f);
  assert.deepEqual([p.stages.atk, p.stages.def, f.stages.spc], [1, -1, 1]);
  [p, f] = pair(); p.stages.spd = -6; applyFieldEvent(event("cantiere"), p, f);
  assert.deepEqual([p.stages.spd, f.stages.spd], [-6, -1]);
});
