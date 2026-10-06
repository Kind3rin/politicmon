/** The main road is no longer a straight line north: the cities open side gates and Percorso 2 goes round the lake. */
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
  await preloadCoreSprites();
  const check = (value, label) => { if (!value) throw Error(label); };
  const boot = (mapId, x, y, badges) => {
   const state = newGameState(); state.party = [createMonster('giorgetta', 20)]; state.flags['intro-done'] = true; state.badges = badges; state.reduceEffects = true;
   state.pos = { mapId, x, y, facing: 'right' };
   const stack = new SceneStack(), input = new Input(); let direction = null;
   input.wasPressed = () => false; input.heldDirection = () => direction; input.isHeld = () => false;
   const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
   const walk = (dir, n) => { for (let i = 0; i < n; i++) { direction = dir; world.update(.02); direction = null; for (let t = 0; t < 14; t++) world.update(.05); } };
   const settle = () => { for (let t = 0; t < 30; t++) world.update(.05); world.msg.close?.(); };
   return { state, world, walk, settle };
  };
  const log = [];
  // Mediopoli's east gate needs the first badge.
  let { state, world, walk, settle } = boot('mediopoli', 26, 12, []);
  walk('right', 3); settle(); check(state.pos.mapId === 'mediopoli', 'the gate opened without the badge');
  ({ state, world, walk, settle } = boot('mediopoli', 26, 12, ['auditel']));
  walk('right', 3); settle(); check(state.pos.mapId === 'route2' && state.pos.x === 1, 'Mediopoli east gate did not lead into Percorso 2: ' + state.pos.mapId + state.pos.x);
  log.push(`mediopoli → ${state.pos.mapId} ${state.pos.x},${state.pos.y}`);
  // The way back.
  walk('left', 1); settle(); check(state.pos.mapId === 'mediopoli' && state.pos.x === 27, 'the way back from Percorso 2');
  // Percorso 2 north gate leads to Eurotown's east gate, Eurotown's gate leads back.
  ({ state, world, walk, settle } = boot('route2', 2, 7, ['auditel']));
  walk('left', 2); settle(); check(state.pos.mapId === 'eurotown' && state.pos.x === 27, 'Percorso 2 top gate → Eurotown');
  walk('right', 2); settle(); check(state.pos.mapId === 'route2' && state.pos.x === 1, 'Eurotown east gate → Percorso 2');
  // Percorso 3 leaves west into Caput Mundi, which opens east.
  ({ state, world, walk, settle } = boot('route3', 2, 2, ['auditel', 'spread']));
  walk('left', 2); settle(); check(state.pos.mapId === 'capitale' && state.pos.x === 27, 'Percorso 3 west exit → Caput Mundi');
  walk('right', 2); settle(); check(state.pos.mapId === 'route3' && state.pos.x === 1, 'Caput Mundi east gate → Percorso 3');
  // The guide points along the real roads: from Percorso 2 to Caput Mundi the first hop is the top gate, not "north".
  ({ state, world } = boot('route2', 20, 20, ['auditel', 'spread']));
  const hop = world.nextHop('capitale'); check(hop && hop.map === 'eurotown' && hop.warp, 'the guide takes the gate to Eurotown first: ' + JSON.stringify(hop));
  ({ state, world } = boot('mediopoli', 10, 12, ['auditel']));
  check(world.nextHop('eurotown').map === 'route2', 'Mediopoli → Eurotown goes through Percorso 2');
  ({ state, world } = boot('eurotown', 10, 12, ['auditel']));
  check(world.nextHop('capitale').map === 'route3' && world.nextHop('capitale').edge === 'north', 'Eurotown → Caput Mundi goes up the north road to Percorso 3');
  return log;
 });
 assert.deepEqual(errors, []);
 console.log('PASS: side gates both ways, the first-badge gate, and a guide that follows the real road graph.', result.join(' '));
} finally { await browser.close(); }
