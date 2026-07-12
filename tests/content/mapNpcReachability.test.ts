import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;

test("ogni NPC statico e pickup è raggiungibile da almeno un ingresso della mappa", () => {
  const blocked: string[] = [];
  for (const map of Object.values(MAPS)) {
    if (!map.warps.length || !map.npcs.length) continue;
    const npcCells = new Set(map.npcs.map((npc) => `${npc.x},${npc.y}`));
    const standable = (x: number, y: number) => {
      const tile = TILES[map.tiles[y]?.[x] ?? ""];
      return Boolean(tile && !tile.solid && !tile.water && !npcCells.has(`${x},${y}`));
    };
    const queue = map.warps.map((warp) => [warp.x, warp.y] as [number, number]).filter(([x, y]) => standable(x, y));
    const reached = new Set(queue.map(([x, y]) => `${x},${y}`));
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of DIRS) {
        const next = `${x + dx},${y + dy}`;
        if (!reached.has(next) && standable(x + dx, y + dy)) {
          reached.add(next);
          queue.push([x + dx, y + dy]);
        }
      }
    }
    for (const npc of map.npcs) {
      const approachable = DIRS.some(([dx, dy]) => reached.has(`${npc.x + dx},${npc.y + dy}`));
      if (!approachable) blocked.push(`${map.id}:${npc.id}@${npc.x},${npc.y}`);
    }
    // Negli esterni alcuni pickup richiedono veicoli (isole/traghetto): il
    // flood-fill pedonale certifica invece tutti quelli degli interni.
    for (const pickup of map.outdoor ? [] : map.pickups) {
      if (!reached.has(`${pickup.x},${pickup.y}`)) blocked.push(`${map.id}:${pickup.id}@${pickup.x},${pickup.y}`);
    }
  }
  assert.deepEqual(blocked, []);
});
