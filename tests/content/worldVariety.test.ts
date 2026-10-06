import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";
import { BATTLE_BACKDROPS, battleBackdropId } from "../../src/game/battle/backdrop.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
const same = (a: string[], b: string[]) => {
  let equal = 0, total = 0;
  for (let y = 0; y < Math.min(a.length, b.length); y++) for (let x = 0; x < a[y].length; x++) { total++; if (a[y][x] === b[y][x]) equal++; }
  return equal / total;
};

test("the three routes are three different places, not one road drawn three times", () => {
  const routes = ["route1", "route2", "route3"].map(id => MAPS[id].tiles);
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) assert.ok(same(routes[i], routes[j]) < .6, `route${i + 1} and route${j + 1} share too many tiles`);
  assert.equal(new Set(["route1", "route2", "route3"].map(id => battleBackdropId(id))).size, 3, "each route has its own battle backdrop");
  const zones = ["route1", "route2", "route3"].flatMap(id => MAPS[id].zones!.map(zone => zone.name));
  assert.equal(new Set(zones).size, zones.length, "no zone name is repeated across the routes");
});

test("every city fights on its own backdrop except where the same chain of places repeats on purpose", () => {
  const cityBackdrops = ["borgo", "mediopoli", "eurotown", "capitale"].map(id => battleBackdropId(id));
  assert.equal(new Set(cityBackdrops).size, 4);
  for (const id of Object.keys(BATTLE_BACKDROPS)) assert.ok(id.length > 0);
});

// Chains (the bar sport, the discount) repeat on purpose: you know what you are walking into.
const CHAINS = [/^bar-/, /^market\d$/];

test("no two interiors share a floor plan unless they belong to a chain", () => {
  const owners = new Map<string, string[]>();
  for (const map of Object.values(MAPS)) {
    if (map.outdoor !== false || CHAINS.some(chain => chain.test(map.id))) continue;
    const key = map.tiles.join("|");
    owners.set(key, [...(owners.get(key) ?? []), map.id]);
  }
  const shared = [...owners.values()].filter(ids => ids.length > 1);
  assert.deepEqual(shared, [], `interiors with the same plan: ${shared.map(ids => ids.join("+")).join(", ")}`);
});

test("in every shop, house and hideout you can reach each person, pickup and sign from the door", () => {
  const houses = ["home", "circolo", "attico", "redazione", "lobbystudio", "bistrot", "salotto", "retroscena", "covo", "chiosco", "casino"];
  for (const id of houses) {
    const map = MAPS[id], open = (x: number, y: number) => { const tile = TILES[map.tiles[y]?.[x] ?? ""]; return Boolean(tile && !tile.solid && !tile.water && !tile.ledge); };
    const start = map.warps[0], seen = new Set([`${start.x},${start.y}`]), queue = [[start.x, start.y]];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of DIRS) if (open(x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) { seen.add(`${x + dx},${y + dy}`); queue.push([x + dx, y + dy]); }
    }
    const touch = (x: number, y: number) => DIRS.some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
    for (const npc of map.npcs) assert.ok(touch(npc.x, npc.y), `${id}: ${npc.id} can be talked to`);
    for (const pickup of map.pickups) assert.ok(seen.has(`${pickup.x},${pickup.y}`), `${id}: ${pickup.id} can be picked up`);
    for (const sign of map.signs) assert.ok(touch(sign.x, sign.y), `${id}: sign at ${sign.x},${sign.y} can be read`);
  }
});
