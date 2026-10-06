/** Route trainers call out from a distance: the player may say yes or "not now", and "not now" is respected. */
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
  const boot = (x, y, facing = 'left') => {
   const state = newGameState(); state.party = [createMonster('giorgetta', 20)];
   state.flags['intro-done'] = true; state.badges = ['tv']; state.pos = { mapId: 'route3', x, y, facing };
   const stack = new SceneStack(), input = new Input();
   let direction = null;
   input.wasPressed = () => false; input.heldDirection = () => direction; input.isHeld = () => false;
   const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
   const walk = (dir, steps) => { for (let i = 0; i < steps; i++) { direction = dir; world.update(.02); direction = null; for (let t = 0; t < 12; t++) world.update(.05); } };
   return { state, stack, world, walk };
  };
  // Eminenza stands at (19,12) facing right with a four-tile line of sight.
  let { world, walk, stack, state } = boot(24, 12);
  walk('left', 1);
  for (let t = 0; t < 20; t++) world.update(.05);
  check(world.askMenu, 'the trainer did not offer a duel');
  const panel = world.uiPanel;
  check(panel.actions.map(a => a.label).join('|') === 'Accetto|Non ora', 'wrong choices: ' + panel.actions.map(a => a.label));
  check(stack.top === world && !state.defeatedTrainers.includes('eminenza'), 'ambushed without consent');
  panel.actions[1].run();
  check(!world.askMenu, 'menu still open after declining');
  world.msg.close();
  walk('left', 1); walk('right', 2);
  for (let t = 0; t < 20; t++) world.update(.05);
  check(!world.askMenu, 'asked again after "not now"');
  // Saying yes starts the duel.
  ({ world, walk, stack, state } = boot(24, 12));
  walk('left', 1);
  for (let t = 0; t < 20; t++) world.update(.05);
  check(world.askMenu, 'no offer on the second visit');
  world.uiPanel.actions[0].run();
  check(world.msg.isOpen || stack.top !== world, 'accepting did not start the duel');
  // Leaving and coming back: the offer is renewed.
  ({ world, walk, stack, state } = boot(24, 12));
  world.declinedInvites.add('eminenza'); world.loadMap('route3');
  check(world.declinedInvites.size === 0, 'a refusal outlived the visit');
  return true;
 });
 assert.equal(result, true); assert.deepEqual(errors, []);
 console.log('PASS: route trainers offer a duel from a distance; accepting fights, "not now" is respected until the map is reloaded.');
} finally { await browser.close(); }
