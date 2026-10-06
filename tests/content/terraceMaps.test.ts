import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";
import { terraceLevels } from "../../src/game/world/terraces.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
// Where you walk in from, and what only the stairs should open.
// `ferry`: treasures on islands, which need the ferry rather than a walk.
const TERRACED: Record<string, { from: readonly [number, number]; top: readonly [number, number]; levels: number; ferry?: string[] }> = {
  borgo: { from: [6, 13], top: [14, 0], levels: 2 },
  capitale: { from: [6, 12], top: [14, 5], levels: 1 },
  mediopoli: { from: [6, 11], top: [14, 1], levels: 1 },
  gymtv: { from: [5, 7], top: [4, 1], levels: 1 },
  gymue: { from: [5, 9], top: [5, 1], levels: 2 },
  gymglobal: { from: [3, 11], top: [3, 1], levels: 2 },
  palazzo: { from: [5, 7], top: [5, 1], levels: 1 },
  colle: { from: [5, 7], top: [5, 1], levels: 1 },
  eurotown: { from: [6, 13], top: [15, 0], levels: 1 },
  route1: { from: [14, 29], top: [14, 1], levels: 2, ferry: ["pk-r1-isola"] },
  route2: { from: [1, 28], top: [1, 7], levels: 1, ferry: ["pk-r2-isola"] },
  route3: { from: [14, 30], top: [1, 2], levels: 1 }
};

type TerracedMap = { tiles: string[] };
function reach(map: TerracedMap, from: readonly [number, number]) {
  const walkable = (x: number, y: number) => {
    const tile = TILES[map.tiles[y]?.[x] ?? ""];
    return Boolean(tile && !tile.solid && !tile.water && !tile.ledge);
  };
  const seen = new Set([`${from[0]},${from[1]}`]), queue: [number, number][] = [[from[0], from[1]]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) if (walkable(x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) { seen.add(`${x + dx},${y + dy}`); queue.push([x + dx, y + dy]); }
  }
  return seen;
}

for (const [id, spec] of Object.entries(TERRACED)) {
  const map = MAPS[id];

  test(`${id}: on foot from the entrance you reach every person, pickup and sign, climbing by the stairs`, () => {
    const seen = reach(map, spec.from);
    assert.ok(seen.has(`${spec.top[0]},${spec.top[1]}`), "the top of the climb is reachable");
    for (const npc of map.npcs) assert.ok(DIRS.some(([dx, dy]) => seen.has(`${npc.x + dx},${npc.y + dy}`)), `${npc.id} can be talked to`);
    for (const pickup of map.pickups.filter(pickup => !spec.ferry?.includes(pickup.id))) assert.ok(seen.has(`${pickup.x},${pickup.y}`), `${pickup.id} can be picked up`);
    for (const sign of map.signs) assert.ok(DIRS.some(([dx, dy]) => seen.has(`${sign.x + dx},${sign.y + dy}`)), `sign at ${sign.x},${sign.y} can be read`);
    for (const door of map.warps) assert.ok(seen.has(`${door.x},${door.y}`), `door to ${door.toMap} at ${door.x},${door.y} can be reached`);
  });

  test(`${id}: the terraces are only climbed by stairs`, () => {
    const rows = map.tiles;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== "E") continue;
      const open = (yy: number) => { const tile = TILES[rows[yy]?.[x] ?? ""]; return Boolean(tile && !tile.solid && !tile.ledge) || rows[yy]?.[x] === "E"; };
      assert.ok(open(y - 1) && open(y + 1), `stair at ${x},${y} joins ground above and below`);
    }
    const saved = [...map.tiles];
    try {
      (map as { tiles: string[] }).tiles = saved.map(row => row.replaceAll("E", "&"));
      assert.ok(!reach(map, spec.from).has(`${spec.top[0]},${spec.top[1]}`), "no way round the terraces without the stairs");
    } finally { (map as { tiles: string[] }).tiles = saved; }
  });

  test(`${id}: nobody stands on a wall, a bank or a stair, and no sign is buried in one`, () => {
    for (const npc of map.npcs) {
      const tile = TILES[map.tiles[npc.y][npc.x]];
      assert.ok(tile && !tile.solid && !tile.ledge, `${npc.id} stands on open ground`);
      assert.notEqual(map.tiles[npc.y][npc.x], "E", `${npc.id} does not block a stair`);
    }
    for (const sign of map.signs) assert.ok(!"%&E".includes(map.tiles[sign.y][sign.x]), `sign at ${sign.x},${sign.y} is not buried in a wall`);
  });

  test(`${id}: the heights read from the map are the ones designed`, () => {
    const t = terraceLevels(map);
    assert.equal(t.top, spec.levels);
    assert.equal(t.at(spec.from[0], spec.from[1]), 0, "you enter on the lowest ground");
    assert.equal(t.at(spec.top[0], spec.top[1]), spec.levels, "the top of the climb is the top");
  });

  test(`${id}: the zone names cover every row`, () => {
    for (let y = 0; y < map.tiles.length; y++) assert.ok(map.zones!.some(zone => y >= zone.y && y < zone.y + zone.h), `row ${y} has a zone`);
  });
}

test("Capitale: the Palazzo is up a flight of stairs, and the bar is built into the wall with its door on the avenue", () => {
  const map = MAPS.capitale, t = terraceLevels(map);
  for (const door of map.warps.filter(warp => warp.toMap === "palazzo")) assert.equal(t.at(door.x, door.y), 1);
  for (const door of map.warps.filter(warp => warp.toMap === "bar-cap")) assert.equal(t.at(door.x, door.y), 0);
  for (const arrival of [[14, 6], [15, 6]]) assert.equal(TILES[map.tiles[arrival[1]][arrival[0]]].solid, false, "the way back from the Palazzo lands on open ground");
});

test("Mediopoli: the TV hill is a wall two rows high, so it is never hopped, only climbed", () => {
  const map = MAPS.mediopoli;
  for (const x of [3, 8, 20, 26]) assert.ok(map.tiles[6][x] === "&" && map.tiles[7][x] === "&", `column ${x} is a two-row wall`);
  assert.equal(MAPS.mediopoli.npcs.find(npc => npc.id === "sindacalista")!.y, 5, "the union man waits up on the hill");
});

test("the signs that moved with the redraw are drawn where they are read", () => {
  assert.equal(MAPS.borgo.tiles[7][9], "s");
  assert.deepEqual([MAPS.borgo.signs.find(sign => sign.lines[0] === "CAMPAGNA ELETTORALE NORD")!.x, MAPS.borgo.signs.find(sign => sign.lines[0] === "CAMPAGNA ELETTORALE NORD")!.y], [9, 7]);
  assert.equal(MAPS.mediopoli.tiles[5][6], "s");
});

test("Eurotown: the gym and the market stand on the terrace, the stairs are eight wide, the guide waits at their foot", () => {
  const map = MAPS.eurotown, t = terraceLevels(map);
  assert.equal(map.tiles[7].slice(11, 19), "EEEEEEEE");
  for (const door of map.warps.filter(warp => warp.toMap === "gymue" || warp.toMap === "market2")) assert.equal(t.at(door.x, door.y), 1);
  for (const door of map.warps.filter(warp => !["gymue", "market2"].includes(warp.toMap))) assert.equal(t.at(door.x, door.y), 0);
  assert.equal(map.npcs.find(npc => npc.id === "luca-guida")!.y, 8);
});

test("Il Colle: the Garante sits on a dais behind the carpet stairs", () => {
  const map = MAPS.colle;
  assert.equal(map.stairStyle, "carpet");
  assert.equal(map.tiles[3].slice(5, 7), "EE");
  assert.equal(terraceLevels(map).at(5, 1), 1);
});
