import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";
import { SLOT_NPCS } from "../../src/data/maps/slotNpcs.ts";
import { ITEMS } from "../../src/data/items.ts";
import { SLOTS } from "../../src/game/palinsesto.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
const FROM: Record<string, [number, number]> = { capitale: [6, 12], borgo: [6, 13], mediopoli: [6, 11], eurotown: [6, 13] };

function walkable(mapId: string, blocked: ReadonlySet<string>) {
  const map = MAPS[mapId], at = (x: number, y: number) => TILES[map.tiles[y]?.[x] ?? ""];
  const free = (x: number, y: number) => { const t = at(x, y); return Boolean(t && !t.solid && !t.water && !t.ledge) && !blocked.has(`${x},${y}`); };
  const [sx, sy] = FROM[mapId], seen = new Set([`${sx},${sy}`]), queue: [number, number][] = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) if (free(x + dx, y + dy) && !seen.has(`${x + dx},${y + dy}`)) { seen.add(`${x + dx},${y + dy}`); queue.push([x + dx, y + dy]); }
  }
  return seen;
}

test("the people of the hour stand on open ground, away from doors and everything else, and never in the way", () => {
  const ids = new Set<string>(), flags = new Set<string>();
  for (const [mapId, people] of Object.entries(SLOT_NPCS)) {
    const map = MAPS[mapId];
    assert.ok(FROM[mapId], `${mapId}: no entrance known`);
    const others = new Set([...map.npcs.filter(n => !n.id.startsWith("slot-")).map(n => `${n.x},${n.y}`), ...map.signs.map(s => `${s.x},${s.y}`), ...map.pickups.map(p => `${p.x},${p.y}`), ...map.warps.map(w => `${w.x},${w.y}`)]);
    const doorSides = new Set(map.warps.flatMap(w => [[0, 0], ...DIRS].map(([dx, dy]) => `${w.x + dx},${w.y + dy}`)));
    const mine = new Set(people.map(p => `${p.x},${p.y}`));
    assert.equal(mine.size, people.length, `${mapId}: two people on one tile`);
    for (const p of people) {
      assert.ok(!ids.has(p.id), `${p.id} twice`); ids.add(p.id);
      const tile = TILES[map.tiles[p.y][p.x]];
      assert.ok(tile && !tile.solid && !tile.water && !tile.ledge && !tile.encounter, `${p.id} is not on open ground`);
      assert.ok(!others.has(`${p.x},${p.y}`), `${p.id} stands on something`);
      assert.ok(!doorSides.has(`${p.x},${p.y}`), `${p.id} stands at a door`);
      assert.ok(p.slots?.length && p.slots.every(id => SLOTS.some(s => s.id === id)), `${p.id} has valid slots`);
      assert.ok(p.wander === false && p.lines?.length, `${p.id} stays put and speaks`);
      if (p.gift) { assert.ok(!flags.has(p.gift.flag), `${p.gift.flag} twice`); flags.add(p.gift.flag); assert.ok(ITEMS[p.gift.itemId], `${p.id}: unknown gift`); assert.ok(p.gift.qty >= 1 && p.gift.qty <= 3); }
    }
    // With all of them standing at once, every door and both ends of the map are still reachable.
    const reach = walkable(mapId, mine);
    for (const w of map.warps) assert.ok(DIRS.some(([dx, dy]) => reach.has(`${w.x + dx},${w.y + dy}`)) || reach.has(`${w.x},${w.y}`), `${mapId}: the door at ${w.x},${w.y} is cut off`);
    const rows = map.tiles.length;
    for (const y of [0, rows - 1]) for (let x = 0; x < map.tiles[y].length; x++) if (TILES[map.tiles[y][x]] && !TILES[map.tiles[y][x]].solid) assert.ok(reach.has(`${x},${y}`), `${mapId}: the edge opening at ${x},${y} is cut off`);
  }
});

test("each town has somebody for at least three slots of the schedule, and a gift to find", () => {
  for (const [mapId, people] of Object.entries(SLOT_NPCS)) {
    const slots = new Set(people.flatMap(p => p.slots ?? []));
    assert.ok(slots.size >= 3, `${mapId} covers only ${slots.size} slots`);
    assert.ok(people.some(p => p.gift), `${mapId} has no gift`);
  }
});

test("the registry carries them, so the towns hold both the old people and the new ones", () => {
  for (const [mapId, people] of Object.entries(SLOT_NPCS)) for (const p of people) assert.ok(MAPS[mapId].npcs.includes(p), `${p.id} is in ${mapId}`);
});
