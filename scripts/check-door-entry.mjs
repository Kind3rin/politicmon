/** Every door is one tile on the centre line: the player walks straight in and out of it, and walking is not interrupted at every tile. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:5179'}/scripts/perf-harness.html`, { waitUntil: 'networkidle' });
 const result = await page.evaluate(async () => {
  const { newGameState } = await import('/src/game/state.ts');
  const { createMonster } = await import('/src/game/monster.ts');
  const { WorldScene } = await import('/src/game/world/WorldScene.ts');
  const { SceneStack } = await import('/src/engine/scene.ts');
  const { Input } = await import('/src/engine/input.ts');
  const { audio } = await import('/src/engine/audio.ts'); audio.enabled = false;
  const { preloadCoreSprites } = await import('/src/engine/preload.ts');
  const { MAPS } = await import('/src/data/maps.ts');
  const { TILES } = await import('/src/art/tiles.ts');
  await preloadCoreSprites();
  const check = (value, label) => { if (!value) throw Error(label); };
  const boot = (mapId, x, y, facing = 'up') => {
   const state = newGameState(); state.party = [createMonster('giorgetta', 20)]; state.flags['intro-done'] = true; state.reduceEffects = true; state.pos = { mapId, x, y, facing };
   const stack = new SceneStack(), input = new Input(); let direction = null;
   input.wasPressed = () => false; input.heldDirection = () => direction; input.isHeld = () => false;
   const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
   for (let i = 0; i < 12; i++) world.update(.05);
   const hold = (dir, seconds, dt = 1 / 60, each) => { direction = dir; const start = state.pos.mapId; for (let t = 0; t < seconds; t += dt) { world.update(dt); each?.(); if (state.pos.mapId !== start) break; } direction = null; };
   const settle = () => { for (let t = 0; t < 40; t++) world.update(.05); };
   return { state, world, hold, settle };
  };
  const walkable = (map, x, y) => { const ch = map.tiles[y]?.[x]; return ch !== undefined && !TILES[ch]?.solid; };
  const log = [];
  // Every outdoor door: one warp tile, entered straight from the street in front and left straight back out.
  let doors = 0;
  for (const [mapId, map] of Object.entries(MAPS)) {
   if (!map.outdoor) continue;
   for (const warp of map.warps) {
    const target = MAPS[warp.toMap]; if (!target || target.outdoor || !'dDg'.includes(map.tiles[warp.y][warp.x]) || warp.requiresBadges || warp.requiresFlag || warp.requiresFeature || warp.confirm) continue;
    check(!map.warps.some(w => w.y === warp.y && Math.abs(w.x - warp.x) === 1 && 'dDg'.includes(map.tiles[w.y][w.x])), `${mapId}: the door at ${warp.x},${warp.y} is still two tiles wide`);
    if (!walkable(map, warp.x, warp.y + 1)) continue;
    const { state, world, hold, settle } = boot(mapId, warp.x, warp.y + 1);
    hold('up', 1.5); settle();
    check(state.pos.mapId === warp.toMap, `${mapId}: the door to ${warp.toMap} did not open`);
    // The way out, where the arrival stands above an exit mat: walking back out lands on the street in front of the door.
    if (target.tiles[warp.toY + 1]?.[warp.toX] === 'c') {
     hold('down', 1.5); settle();
     check(state.pos.mapId === mapId, `${warp.toMap}: the way out did not lead back to ${mapId}`);
     check(state.pos.x === warp.x && state.pos.y === warp.y + 1, `${mapId}: came out at ${state.pos.x},${state.pos.y}, not in front of the door ${warp.x},${warp.y}`);
    }
    doors++;
   }
  }
  // 28 open doors: the Palazzo of Capitale (14,5) is locked behind badges and is not walked here.
  check(doors >= 28, 'too few outdoor doors checked: ' + doors);
  log.push(`${doors} doors in and out`);
  // Every interior exit mat: walking onto it from the floor above leaves the room.
  let mats = 0;
  for (const [mapId, map] of Object.entries(MAPS)) {
   if (map.outdoor) continue;
   for (const warp of map.warps) {
    if (map.tiles[warp.y][warp.x] !== 'c' || !walkable(map, warp.x, warp.y - 1) || warp.requiresBadges || warp.requiresFlag || warp.requiresFeature || warp.confirm) continue;
    const { state, hold, settle } = boot(mapId, warp.x, warp.y - 1, 'down');
    hold('down', 1.5); settle();
    check(state.pos.mapId !== mapId, `${mapId}: the mat at ${warp.x},${warp.y} did not lead out`);
    mats++;
   }
  }
  check(mats >= 40, 'too few interior mats checked: ' + mats);
  log.push(`${mats} mats`);
  // The road between two zones fades like a door and keeps walking if the direction is still held.
  { const { state, world } = boot('borgo', 14, 1); world.input.heldDirection = () => 'up'; let dark = false, crossed = false;
    for (let i = 0; i < 120; i++) { world.update(1 / 60); if (world.fadeOut > 0) dark = true; if (state.pos.mapId === 'route1') crossed = true; }
    check(dark && crossed, `leaving Borgo by the road: fade ${dark}, crossed ${crossed}`); check(state.pos.y < MAPS.route1.tiles.length - 1, 'did not keep walking after the crossing'); }
  // Holding a direction never stops between tiles, at a steady or a jittery frame rate.
  for (const [name, dtOf] of [['steady', () => 1 / 60], ['jitter', i => (i % 3 ? 1 / 75 : 1 / 40)]]) {
   const { state, world } = boot('route1', 14, 29); let direction = 'up'; const input = world.input; input.heldDirection = () => direction;
   const point = () => state.pos.y + (world.moving ? (world.fromY - state.pos.y) * (1 - world.moveT) : 0);
   let last = point(), still = 0;
   for (let i = 0; i < 200; i++) { world.update(dtOf(i)); const now = point(); if (Math.abs(now - last) < 1e-9) still++; last = now; }
   check(still <= 2, `${name}: ${still} frozen frames while holding a direction`);
   log.push(`${name}: ${still} still`);
  }
  // A tap route across open ground is a straight run and a corner, not a staircase.
  { const { world } = boot('route1', 10, 29); const found = world.searchRoute(18, 24);
    check(typeof found !== 'string', 'no route'); let turns = 0, prev = null, at = { x: 10, y: 29 };
    for (const step of found.route) { const dir = `${step.x - at.x},${step.y - at.y}`; if (prev && dir !== prev) turns++; prev = dir; at = step; }
    check(turns <= 3, `the route zig-zags: ${turns} turns over ${found.route.length} steps`); log.push(`route ${found.route.length} steps, ${turns} turns`); }
  return log;
 });
 assert.deepEqual(errors, []);
 console.log('PASS: single centred doors in and out, mats, steady stride, straight routes.', result.join(' · '));
} finally { await browser.close(); }
