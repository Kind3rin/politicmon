import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps";
import { TILES } from "../../src/art/tiles";
import { resolveCivicChoice, civicNpcReply } from "../../src/game/civicChoices";
import { newGameState, parseGameState } from "../../src/game/state";
import { civicBridgeTile } from "../../src/game/world/civicBridge";

function canReachIsland(state: ReturnType<typeof newGameState>): boolean {
  const map = MAPS.route1, seen = new Set<string>(), queue = [{ x: 9, y: 7 }];
  while (queue.length) {
    const p = queue.shift()!, key = `${p.x},${p.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = map.tiles[p.y]?.[p.x];
    if (!raw) continue;
    const tile = TILES[civicBridgeTile(state, map.id, p.x, p.y, raw)];
    if (!tile || tile.solid || tile.water) continue;
    if (p.x === 6 && p.y === 6) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: p.x + dx, y: p.y + dy });
  }
  return false;
}

test("public footbridge: funding opens the island without a ferry and survives save import", () => {
  const state = newGameState(); state.money = 240;
  const tiles = [...MAPS.route1.tiles];
  assert.equal(canReachIsland(state), false);
  assert.equal(resolveCivicChoice(state, "cantiere", 0).ok, true);
  assert.equal(state.money, 0);
  assert.equal(state.morale.trust, 59); assert.equal(state.morale.cohesion, 70);
  assert.equal(canReachIsland(state), true);
  assert.equal(canReachIsland(parseGameState(JSON.stringify(state))!), true);
  assert.deepEqual(MAPS.route1.tiles, tiles);
  assert.equal(canReachIsland(newGameState()), false);
  assert.match(civicNpcReply(state, "viandante-r1")!.join(" "), /passerella porta all'isola/);
  const before = JSON.stringify(state);
  assert.equal(resolveCivicChoice(state, "cantiere", 2).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test("ceremony and report: the previewed funds and moral costs leave the crossing closed", () => {
  for (const index of [1, 2]) {
    const state = newGameState(); state.money = 500;
    assert.equal(resolveCivicChoice(state, "cantiere", index).ok, true);
    assert.equal(canReachIsland(state), false);
    assert.equal(state.money, index === 1 ? 500 : 420);
    assert.match(civicNpcReply(state, "viandante-r1")!.join(" "), index === 1 ? /traghetto/ : /zero attraversamenti/);
  }
  const poor = newGameState(); poor.money = 239;
  const before = JSON.stringify(poor);
  assert.equal(resolveCivicChoice(poor, "cantiere", 0).ok, false);
  assert.equal(JSON.stringify(poor), before);
});

test("bridge respects its four water tiles and never leaks to other maps or bulldozed terrain", () => {
  const state = newGameState(); resolveCivicChoice(state, "cantiere", 0);
  assert.equal(civicBridgeTile(state, "route1", 4, 7, "w"), "q");
  for (const [map, x, y, raw] of [["route2", 4, 7, "w"], ["route1", 3, 7, "w"], ["route1", 4, 6, "w"], ["route1", 4, 7, "."]] as const) {
    assert.equal(civicBridgeTile(state, map, x, y, raw), raw);
  }
});

function climb(state: ReturnType<typeof newGameState>): number {
  // Steps on foot from the top of the quarry stairs on Route 3 to its north exit.
  const map = MAPS.route3, start = { x: 6, y: 20, d: 0 }, seen = new Set<string>(), queue = [start];
  while (queue.length) {
    const p = queue.shift()!, key = `${p.x},${p.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = map.tiles[p.y]?.[p.x];
    if (!raw) continue;
    const tile = TILES[civicBridgeTile(state, map.id, p.x, p.y, raw)];
    if (!tile || tile.solid || tile.water || tile.ledge) continue;
    if (p.y === 0) return p.d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: p.x + dx, y: p.y + dy, d: p.d + 1 });
  }
  return Infinity;
}

test("quarry gap: only opening it shortens the climb on Route 3, and it never leaks to other maps", () => {
  const long = climb(newGameState());
  assert.ok(long >= 40, `the round-about climb is ${long} steps`);
  for (const index of [1, 2]) {
    const state = newGameState(); state.money = 500;
    assert.equal(resolveCivicChoice(state, "cava", index).ok, true);
    assert.equal(climb(state), long, "reporting or inaugurating leaves the wall shut");
  }
  const state = newGameState(); state.money = 220;
  const tiles = [...MAPS.route3.tiles];
  assert.equal(resolveCivicChoice(state, "cava", 0).ok, true);
  assert.equal(state.money, 0);
  assert.ok(climb(state) <= long - 12, `the gap saves a dozen steps (${long} → ${climb(state)})`);
  assert.equal(climb(parseGameState(JSON.stringify(state))!), climb(state), "survives save import");
  assert.deepEqual(MAPS.route3.tiles, tiles);
  assert.equal(civicBridgeTile(state, "route3", 14, 10, "R"), "=");
  for (const [map, x, y, raw] of [["route2", 14, 10, "R"], ["route3", 12, 10, "R"], ["route3", 14, 12, "R"], ["route3", 14, 10, "z"]] as const) assert.equal(civicBridgeTile(state, map, x, y, raw), raw);
  assert.match(civicNpcReply(state, "cavatore-r3")!.join(" "), /varco regge/);
  const poor = newGameState(); poor.money = 219;
  assert.equal(resolveCivicChoice(poor, "cava", 0).ok, false);
});
