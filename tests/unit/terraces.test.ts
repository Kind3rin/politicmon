import assert from "node:assert/strict";
import test from "node:test";
import { terraceLevels, isFace, isStair } from "../../src/game/world/terraces.ts";
import { MAPS } from "../../src/data/maps.ts";

const warp = (x: number, y: number) => ({ x, y });

test("a flat map has no terraces and costs nothing", () => {
  const flat = terraceLevels({ tiles: ["....", "....", "...."], warps: [warp(1, 2)] });
  assert.equal(flat.top, 0);
  assert.equal(flat.at(2, 1), 0);
});

test("going north over a stair raises the ground by one, and the bank tile itself reads as the lower level", () => {
  const map = { tiles: ["......", "......", "%%E%%%", "......", "......"], warps: [warp(0, 4)] };
  const t = terraceLevels(map);
  assert.equal(t.at(0, 4), 0);
  assert.equal(t.at(2, 3), 0);
  assert.equal(t.at(2, 2), 0, "the stair belongs to the lower side");
  assert.equal(t.at(2, 1), 1);
  assert.equal(t.at(5, 0), 1, "the whole terrace is one level, reached around the bank");
  assert.equal(t.top, 1);
});

test("two flights make two levels, and a wall hop down lands one level lower", () => {
  const map = { tiles: ["......", "&&E&&&", "......", "%%%E%%", "......"], warps: [warp(0, 4)] };
  const t = terraceLevels(map);
  assert.equal(t.at(0, 2), 1);
  assert.equal(t.at(0, 0), 2);
  assert.equal(t.top, 2);
  // Hop down from the top terrace over the wall: the landing is level 1, the same as the middle terrace.
  assert.equal(t.at(0, 2), t.at(5, 2));
});

test("stairs and faces are named in one place", () => {
  assert.ok(isFace("%") && isFace("&") && !isFace("E"));
  assert.ok(isStair("E") && isStair("l") && !isStair("%"));
});

test("Borgo climbs in three levels: the square, the fields, the belvedere", () => {
  const borgo = MAPS.borgo, t = terraceLevels(borgo);
  assert.equal(t.top, 2);
  for (const door of borgo.warps) assert.equal(t.at(door.x, door.y), 0, `door ${door.toMap} sits on the valley floor`);
  assert.equal(t.at(9, 6), 1, "the fields are the first terrace");
  assert.equal(t.at(14, 2), 2, "the belvedere is the top");
  assert.equal(t.at(14, 0), 2, "the road north leaves from the top");
});
