import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";

const map = MAPS.borgo;
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
const walkable = (x: number, y: number) => {
  const tile = TILES[map.tiles[y]?.[x] ?? ""];
  return Boolean(tile && !tile.solid && !tile.water && !tile.ledge);
};
function reach(from: [number, number]) {
  const seen = new Set([`${from[0]},${from[1]}`]), queue = [from];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) if (walkable(x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) { seen.add(`${x + dx},${y + dy}`); queue.push([x + dx, y + dy]); }
  }
  return seen;
}

test("Borgo: from the laboratory door on foot you can reach the whole village and the road north, climbing by the stairs", () => {
  const seen = reach([6, 13]);
  assert.ok(seen.has("14,0"), "the road to Percorso 1 is reachable");
  for (const npc of map.npcs) assert.ok(DIRS.some(([dx, dy]) => seen.has(`${npc.x + dx},${npc.y + dy}`)), `${npc.id} can be talked to`);
  for (const pickup of map.pickups) assert.ok(seen.has(`${pickup.x},${pickup.y}`), `${pickup.id} can be picked up`);
  for (const sign of map.signs) assert.ok(DIRS.some(([dx, dy]) => seen.has(`${sign.x + dx},${sign.y + dy}`)), `sign at ${sign.x},${sign.y} can be read`);
});

test("Borgo: the terraces are only climbed by stairs", () => {
  const rows = map.tiles;
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if (rows[y][x] === "E") {
      assert.ok(walkable(x, y - 1) && walkable(x, y + 1), `stair at ${x},${y} joins ground above and below`);
    }
  }
  // Without the stairs the top is cut off: take them out and the north road is unreachable from the square.
  const saved = [...map.tiles];
  try {
    (map as { tiles: string[] }).tiles = saved.map(row => row.replaceAll("E", "&"));
    assert.ok(!reach([6, 13]).has("14,0"), "no way round the terraces");
  } finally { (map as { tiles: string[] }).tiles = saved; }
});

test("Borgo: nobody stands on a bank, a wall or a stair that is not theirs to hold", () => {
  for (const npc of map.npcs) {
    const tile = TILES[map.tiles[npc.y][npc.x]];
    assert.ok(tile && !tile.solid && !tile.ledge, `${npc.id} stands on open ground`);
    assert.notEqual(map.tiles[npc.y][npc.x], "E", `${npc.id} does not block a stair`);
  }
  for (const sign of map.signs) assert.ok(TILES[map.tiles[sign.y][sign.x]]?.solid, `sign at ${sign.x},${sign.y} is drawn on the map`);
});

test("Borgo: the zone names cover every tile", () => {
  for (let y = 0; y < map.tiles.length; y++) assert.ok(map.zones!.some(zone => y >= zone.y && y < zone.y + zone.h), `row ${y} has a zone`);
});
