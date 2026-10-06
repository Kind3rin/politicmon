import assert from "node:assert/strict";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { CIVIC_EVENTS, CIVIC_NPCS } from "../../src/data/civicEvents.ts";
import { MAPS } from "../../src/data/maps.ts";
import { newGameState } from "../../src/game/state.ts";
import { CIVIC_SCENES, civicBridgeTile, civicSceneNpcs } from "../../src/game/world/civicBridge.ts";

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]] as const;
const stateWith = (decision?: string) => { const s = newGameState(); if (decision) s.morale.decisions = [decision.split(":")[0], decision]; return s; };
const open = (ch: string | undefined) => { const tile = ch ? TILES[ch] : undefined; return Boolean(tile && !tile.solid && !tile.water && !tile.ledge); };

function reachable(mapId: string, state: ReturnType<typeof stateWith>) {
  const map = MAPS[mapId], blocked = new Set(civicSceneNpcs(state, mapId).map(npc => `${npc.x},${npc.y}`));
  for (const npc of map.npcs) blocked.add(`${npc.x},${npc.y}`);
  const at = (x: number, y: number) => civicBridgeTile(state, mapId, x, y, map.tiles[y]?.[x] ?? "");
  const seen = new Set<string>(), queue: [number, number][] = [];
  const seeds = [...map.warps.map(w => [w.x, w.y] as [number, number]), [Math.floor(map.tiles[0].length / 2), map.tiles.length - 1] as [number, number]];
  for (const [sx, sy] of seeds) for (const [dx, dy] of [[0, 0], ...DIRS]) { const x = sx + dx, y = sy + dy; if (open(at(x, y)) && !blocked.has(`${x},${y}`) && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); queue.push([x, y]); } }
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, key = `${nx},${ny}`; if (!seen.has(key) && !blocked.has(key) && open(at(nx, ny))) { seen.add(key); queue.push([nx, ny]); } }
  }
  return seen;
}

test("every scene belongs to a real choice of a real event", () => {
  for (const scene of CIVIC_SCENES) {
    const [event, choice] = scene.decision.split(":");
    assert.ok(CIVIC_EVENTS[event]?.choices.some(c => c.id === choice), `${scene.decision} is not a choice`);
    assert.ok(MAPS[scene.map], `${scene.decision}: map ${scene.map}`);
    assert.ok(scene.title.length > 0 && scene.title.length <= 32, `${scene.decision}: banner length`);
  }
  for (const [npcId, event] of Object.entries(CIVIC_NPCS)) assert.ok(CIVIC_SCENES.some(scene => scene.decision.startsWith(`${event}:`)), `${event} (${npcId}) changes nothing in the world`);
});

test("the tiles a scene edits are what the map says, and the people stand on open ground", () => {
  const ids = new Set<string>();
  for (const scene of CIVIC_SCENES) {
    const map = MAPS[scene.map], state = stateWith(scene.decision);
    for (const edit of scene.tiles ?? []) for (let y = edit.y[0]; y <= edit.y[1]; y++) for (let x = edit.x[0]; x <= edit.x[1]; x++) assert.equal(map.tiles[y][x], edit.from, `${scene.decision}: ${x},${y} is ${map.tiles[y][x]}`);
    const cells = new Set<string>();
    for (const npc of scene.npcs ?? []) {
      assert.ok(npc.id.startsWith("civic-") && !ids.has(npc.id), `${npc.id} unique`); ids.add(npc.id);
      assert.ok(open(civicBridgeTile(state, scene.map, npc.x, npc.y, map.tiles[npc.y]?.[npc.x] ?? "")), `${npc.id} stands on open ground`);
      const key = `${npc.x},${npc.y}`;
      assert.ok(!cells.has(key), `${npc.id} overlaps another civic person`); cells.add(key);
      assert.ok(!map.npcs.some(n => n.x === npc.x && n.y === npc.y), `${npc.id} overlaps a map person`);
      assert.ok(!map.warps.some(w => w.x === npc.x && w.y === npc.y) && !map.pickups.some(p => p.x === npc.x && p.y === npc.y) && !map.signs.some(s => s.x === npc.x && s.y === npc.y), `${npc.id} overlaps a door, pickup or sign`);
      assert.ok((npc.lines ?? []).length >= 2, `${npc.id} has something to say`);
    }
  }
});

test("no decision closes a road: everything reachable before is reachable after", () => {
  for (const scene of CIVIC_SCENES) {
    const before = reachable(scene.map, stateWith()), after = reachable(scene.map, stateWith(scene.decision));
    const edited = new Set<string>(), occupied = new Set((scene.npcs ?? []).map(npc => `${npc.x},${npc.y}`));
    for (const edit of scene.tiles ?? []) for (let y = edit.y[0]; y <= edit.y[1]; y++) for (let x = edit.x[0]; x <= edit.x[1]; x++) edited.add(`${x},${y}`);
    for (const cell of before) if (!edited.has(cell) && !occupied.has(cell)) assert.ok(after.has(cell), `${scene.decision} cuts off ${cell}`);
  }
});

test("a pledge that is later paid shows the same world as paying at once", () => {
  const state = stateWith("bus:pledge");
  assert.equal(civicSceneNpcs(state, "borgo").length, 0);
  state.morale.promises = [{ id: "bus", status: "kept", dueAt: 3 }];
  assert.equal(civicSceneNpcs(state, "borgo").some(npc => npc.id === "civic-passeggera"), true);
});
