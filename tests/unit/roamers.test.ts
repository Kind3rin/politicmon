import assert from "node:assert/strict";
import test from "node:test";
import { RoamerField, roamerTarget, facingToward, isRareRoamer, type RoamerWorld } from "../../src/game/world/roamers.ts";

const seeded = (seed = 7) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const meadow = (grass: (x: number, y: number) => boolean = () => true): RoamerWorld => ({ width: 12, height: 12, isGrass: grass, isOpen: () => true });
const table = [{ speciesId: "ellyna", weight: 1, minLv: 3, maxLv: 5 }];

test("a map holds a few candidates, scaled by its grass, and none when it has no grass", () => {
  assert.equal(roamerTarget(0), 0);
  assert.equal(roamerTarget(5), 0);
  assert.equal(roamerTarget(20), 2);
  assert.equal(roamerTarget(36), 4);
  assert.equal(roamerTarget(500), 6);
});

test("candidates spawn on grass, away from the player, on distinct tiles, within the level range", () => {
  const field = new RoamerField(meadow((x, y) => x > 4), table, seeded());
  field.fill(5, { x: 0, y: 0, facing: "down" });
  assert.equal(field.roamers.length, 5);
  assert.equal(new Set(field.roamers.map(r => `${r.x},${r.y}`)).size, 5);
  for (const r of field.roamers) { assert.ok(r.x > 4); assert.ok(r.level >= 3 && r.level <= 5); assert.ok(Math.abs(r.x) + Math.abs(r.y) >= 5); }
});

test("candidates never leave the grass, never enter walls or the player's tile, however long they roam", () => {
  const open = (x: number, y: number) => !(x === 6 && y === 6);
  const field = new RoamerField({ width: 12, height: 12, isGrass: (x, y) => x >= 3 && x <= 9 && y >= 3 && y <= 9, isOpen: open }, table, seeded(3));
  const player = { x: 5, y: 5, facing: "up" as const };
  field.fill(4, { x: 0, y: 0, facing: "down" });
  for (let i = 0; i < 4000; i += 1) {
    field.update(0.05, player, false, 4);
    for (const r of field.roamers) {
      assert.ok(r.x >= 3 && r.x <= 9 && r.y >= 3 && r.y <= 9, "stays on grass");
      assert.ok(!(r.x === 6 && r.y === 6), "never in the wall");
      assert.ok(!(r.x === player.x && r.y === player.y), "never on the player");
    }
    assert.equal(new Set(field.roamers.map(r => `${r.x},${r.y}`)).size, field.roamers.length, "never stacked");
  }
});

test("a chaser notices first, then closes the distance and catches a player who is not facing it", () => {
  const field = new RoamerField(meadow(), [{ speciesId: "ellyna", weight: 1, minLv: 3, maxLv: 3 }], seeded());
  field.fill(1, { x: 0, y: 0, facing: "down" });
  const roamer = field.roamers[0];
  Object.assign(roamer, { x: 8, y: 6, fromX: 8, fromY: 6, t: 1, wait: 0, mood: "chase", noticed: false, facing: "left" });
  const player = { x: 5, y: 6, facing: "down" as const };
  field.update(0.05, player, false, 1);
  assert.equal(roamer.noticed, true);
  assert.ok(roamer.alert > 0);
  let caught = null as ReturnType<RoamerField["contact"]>;
  for (let i = 0; i < 400 && !caught; i += 1) { field.update(0.05, player, false, 1); caught = field.contact(player, false); }
  assert.ok(caught, "chaser reaches the player");
  assert.equal(caught.advantage, "foe");
});

test("approaching a sleeper, or one that looks away, gives the player the first move; a face-off gives nobody", () => {
  const field = new RoamerField(meadow(), table, seeded());
  field.fill(1, { x: 0, y: 0, facing: "down" });
  const roamer = field.roamers[0];
  Object.assign(roamer, { x: 5, y: 4, fromX: 5, fromY: 4, t: 1, mood: "sleep", facing: "down" });
  assert.equal(field.contact({ x: 5, y: 5, facing: "up" }, false)?.advantage, "player");
  Object.assign(roamer, { mood: "wander", facing: "up" });
  assert.equal(field.contact({ x: 5, y: 5, facing: "up" }, false)?.advantage, "player");
  Object.assign(roamer, { facing: "down" });
  assert.equal(field.contact({ x: 5, y: 5, facing: "up" }, false)?.advantage, undefined);
  assert.equal(field.contact({ x: 5, y: 5, facing: "up" }, true), null, "repellent: nobody touches");
});

test("a fled-from candidate backs away and a removed one respawns later, out of sight", () => {
  const field = new RoamerField(meadow(), table, seeded(11));
  field.fill(2, { x: 0, y: 0, facing: "down" });
  const [a] = field.roamers;
  Object.assign(a, { x: 6, y: 6, fromX: 6, fromY: 6, t: 1, wait: 0, mood: "flee" });
  const player = { x: 5, y: 6, facing: "right" as const };
  const before = Math.abs(a.x - player.x);
  for (let i = 0; i < 6; i += 1) field.update(0.1, player, false, 2);
  assert.ok(Math.abs(a.x - player.x) > before, "keeps its distance");
  field.remove(a);
  assert.equal(field.roamers.length, 1);
  for (let i = 0; i < 400; i += 1) field.update(0.1, { x: 0, y: 0, facing: "down" }, false, 2);
  assert.equal(field.roamers.length, 2);
});

test("facingToward picks the dominant axis", () => {
  assert.equal(facingToward(0, 0, 3, 1), "right");
  assert.equal(facingToward(0, 0, -1, -4), "up");
  assert.equal(facingToward(5, 5, 5, 6), "down");
});

test("about one candidate in twelve is rare: fixed by its id, always fleeing, and never a change to the random sequence", () => {
  const rare = Array.from({ length: 2000 }, (_, i) => i + 1).filter(isRareRoamer).length;
  assert.ok(rare > 100 && rare < 220, `${rare} rare of 2000`);
  const field = new RoamerField(meadow(), table, seeded(3));
  for (let i = 0; i < 400; i += 1) field.spawnOne({ x: 0, y: 0, facing: "down" }, 0);
  const marked = field.roamers.filter(r => r.rare);
  assert.ok(marked.length > 0, "a long run of spawns includes rare ones");
  assert.ok(marked.every(r => r.mood === "flee"), "rare ones run away");
  const plain = new RoamerField(meadow(), table, seeded(3)), same = new RoamerField(meadow(), table, seeded(3));
  plain.spawnOne({ x: 0, y: 0, facing: "down" }, 0); same.spawnOne({ x: 0, y: 0, facing: "down" }, 0);
  assert.deepEqual([plain.roamers[0].x, plain.roamers[0].y], [same.roamers[0].x, same.roamers[0].y]);
});
