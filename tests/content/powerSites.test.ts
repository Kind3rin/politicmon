import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { MAPS } from "../../src/data/maps.ts";
import { POWER_SITES } from "../../src/data/maps/powerSites.ts";
import { bridgePlan, climbLanding } from "../../src/game/world/powerWorld.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
const FROM: Record<string, [number, number]> = { route2: [1, 28], capitale: [6, 12], route1: [14, 29], borgo: [6, 13], mediopoli: [6, 11], eurotown: [6, 13], route3: [14, 30], antenna: [14, 25] };

/** What can be reached on foot, with some powers: tape cut, boulders pushed away, ditches bridged, banks climbed. */
function reach(mapId: string, powers: { taglio?: boolean; spallata?: boolean; ponte?: boolean; scalata?: boolean }) {
  const map = MAPS[mapId], at = (x: number, y: number) => TILES[map.tiles[y]?.[x] ?? ""];
  const spot = (x: number, y: number) => map.spots?.find(s => s.x === x && s.y === y);
  const free = (x: number, y: number) => { const tile = at(x, y), s = spot(x, y); return Boolean(tile && !tile.solid && !tile.water && !tile.ledge) && !(s?.kind === "tape" && !powers.taglio) && !(s?.kind === "boulder" && !powers.spallata); };
  const grid = { width: map.tiles[0].length, height: map.tiles.length, water: (x: number, y: number) => Boolean(at(x, y)?.water), open: (x: number, y: number) => free(x, y) };
  const start = FROM[mapId], seen = new Set([`${start[0]},${start[1]}`]), queue: [number, number][] = [[start[0], start[1]]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const next: [number, number][] = [];
    for (const [dx, dy] of DIRS) {
      if (free(x + dx, y + dy)) next.push([x + dx, y + dy]);
      if (powers.ponte) { const plan = bridgePlan(grid, { x, y }, dx, dy); if (plan) next.push([plan.landing.x, plan.landing.y]); }
    }
    if (powers.scalata && at(x, y - 1)?.ledge) { const to = climbLanding(grid, { x, y }); if (to) next.push([to.x, to.y]); }
    for (const [nx, ny] of next) if (!seen.has(`${nx},${ny}`)) { seen.add(`${nx},${ny}`); queue.push([nx, ny]); }
  }
  return seen;
}

test("what a site hides is out of reach without its power, and within reach with it", () => {
  const gated = Object.values(MAPS).flatMap(map => map.pickups.filter(p => p.power).map(p => ({ map: map.id, ...p })));
  assert.ok(gated.length >= 8, "the sites hold treasures");
  for (const p of gated) {
    assert.ok(FROM[p.map], `${p.id}: no entrance known for ${p.map}`);
    assert.ok(!reach(p.map, {}).has(`${p.x},${p.y}`), `${p.id} can be taken without ${p.power}`);
    assert.ok(reach(p.map, { [p.power!]: true }).has(`${p.x},${p.y}`), `${p.id} cannot be taken even with ${p.power}`);
  }
});

test("each of the four obstacle powers has a site with a treasure behind it", () => {
  for (const power of ["taglio", "scalata", "spallata", "ponte"]) assert.ok(Object.values(MAPS).some(map => map.pickups.some(p => p.power === power)), `${power} has no site`);
});

test("a site is drawn on open ground and its obstacle sits where the road meets it", () => {
  for (const site of POWER_SITES) {
    const map = MAPS[site.map];
    for (const spot of site.spots ?? []) assert.ok(!TILES[map.tiles[spot.y][spot.x]].solid || spot.kind === "boulder", `${spot.id} stands on a wall`);
    for (const p of site.pickups ?? []) { const tile = TILES[map.tiles[p.y][p.x]]; assert.ok(tile && !tile.solid && !tile.water && !tile.ledge, `${p.id} is buried`); }
  }
});
