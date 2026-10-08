import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps.ts";
import { TILES, buildingKey } from "../../src/art/tiles.ts";

const tileOf = (map: { tiles: string[] }, x: number, y: number) => map.tiles[y]?.[x] ?? "T";

test("every outdoor doorway is one tile, on the centre line of an odd-width building", () => {
  let doors = 0;
  for (const [id, map] of Object.entries(MAPS)) {
    if (!map.outdoor) continue;
    for (const warp of map.warps) {
      if (!"dDg".includes(tileOf(map, warp.x, warp.y))) continue;
      doors += 1;
      const roof = tileOf(map, warp.x, warp.y - 1);
      const key = buildingKey(roof);
      assert.ok(key, `${id} (${warp.x},${warp.y}): no building above the door`);
      let left = warp.x, right = warp.x;
      while (buildingKey(tileOf(map, left - 1, warp.y - 1)) === key) left -= 1;
      while (buildingKey(tileOf(map, right + 1, warp.y - 1)) === key) right += 1;
      const width = right - left + 1;
      assert.equal(width % 2, 1, `${id} (${warp.x},${warp.y}): the building is ${width} tiles wide, not odd`);
      assert.equal((left + right) / 2, warp.x, `${id} (${warp.x},${warp.y}): the door is off the centre of its ${width}-tile building`);
      assert.ok(!map.warps.some(w => w.x === warp.x + 1 && w.y === warp.y), `${id} (${warp.x},${warp.y}): two warps side by side`);
    }
  }
  assert.ok(doors >= 29, `expected the 29 authored shopfronts, found ${doors} doors`);
});

test("every interior room has one mat per doorway, never two side by side", () => {
  for (const [id, map] of Object.entries(MAPS)) {
    if (map.outdoor) continue;
    const mats = map.warps.filter(w => tileOf(map, w.x, w.y) === "c");
    for (const mat of mats) {
      assert.ok(!mats.some(other => other.y === mat.y && other.x === mat.x + 1), `${id} (${mat.x},${mat.y}): two mats side by side`);
    }
  }
});

test("every doorway leads to walkable ground in its target map", () => {
  for (const [id, map] of Object.entries(MAPS)) {
    for (const warp of map.warps) {
      if (!"dDgc".includes(tileOf(map, warp.x, warp.y))) continue;
      const target = MAPS[warp.toMap];
      assert.ok(target, `${id} -> ${warp.toMap}: unknown map`);
      const ch = tileOf(target, warp.toX, warp.toY);
      assert.ok(!TILES[ch]?.solid && ch !== "T", `${id} (${warp.x},${warp.y}) -> ${warp.toMap} (${warp.toX},${warp.toY}) lands on '${ch}'`);
    }
  }
});

test("the lab's mat sits on the centre line of its widened room", () => {
  const lab = MAPS.lab;
  assert.equal(lab.tiles[0].length, 13, "the room gains one floor column on the right");
  assert.deepEqual(lab.warps.filter(w => w.y === 7).map(w => [w.x, w.toX, w.toY]), [[6, 6, 13]]);
  assert.equal(tileOf(lab, 5, 7), "p", "the other mat is floor now");
});
