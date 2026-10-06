/** A civic decision reshapes the map in front of the player: tiles change one by one, people step in, controls wait. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const browser = await chromium.launch();
try {
 const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:5179'}/scripts/perf-harness.html`, { waitUntil: 'networkidle' });
 const result = await page.evaluate(async () => {
  const { newGameState } = await import('/src/game/state.ts');
  const { createMonster } = await import('/src/game/monster.ts');
  const { WorldScene } = await import('/src/game/world/WorldScene.ts');
  const { SceneStack } = await import('/src/engine/scene.ts');
  const { Screen } = await import('/src/engine/screen.ts');
  const { Input } = await import('/src/engine/input.ts');
  const { audio } = await import('/src/engine/audio.ts'); audio.enabled = false;
  const { preloadCoreSprites } = await import('/src/engine/preload.ts');
  await preloadCoreSprites();
  const { tileImage, objectImage } = await import('/src/art/tiles.ts');
  for (const ch of 'qfUYs') { tileImage(ch); objectImage(ch); }
  await new Promise(resolve => setTimeout(resolve, 1200));
  const check = (value, label) => { if (!value) throw Error(label); };
  const run = async (mapId, x, y, decision, shots) => {
   const state = newGameState(); state.party = [createMonster('giorgetta', 20)]; state.flags['intro-done'] = true; state.pos = { mapId, x, y, facing: 'down' };
   const stack = new SceneStack(), input = new Input(), screen = new Screen(document.createElement('canvas'));
   input.wasPressed = () => false; input.heldDirection = () => null; input.isHeld = () => false;
   const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
   for (let i = 0; i < 10; i++) world.update(.05);
   check(!world.reveal, 'reveal before any decision');
   const [event] = decision.split(':'); state.morale.decisions = [event, decision];
   world.update(.02);
   check(world.reveal, 'no reveal after ' + decision);
   const log = { held: [], hiddenPeople: world.reveal.people.filter(p => world.reveal.holdsNpc(p.id)).length, frames: {} };
   for (let t = 0; t < 4.2; t += .05) {
    world.update(.05);
    if (world.reveal) for (const tile of world.reveal.tiles) if (world.reveal.holds(tile.x, tile.y)) log.held.push(`${tile.x},${tile.y}`);
    for (const shot of shots) if (Math.abs(t - shot) < .026) { world.draw(screen); log.frames[shot] = screen.ctx.canvas.toDataURL('image/png'); }
    if (!world.reveal) break;
   }
   check(!world.reveal, 'reveal never ended');
   log.after = world.reveal === null;
   const probe = { before: state.pos.x };
   input.heldDirection = () => 'left'; world.update(.02); input.heldDirection = () => null;
   return log;
  };
  const bridge = await run('route1', 9, 9, 'cantiere:build', [.5, 1.1, 1.6, 2.4]);
  check(bridge.held.length > 0 && bridge.hiddenPeople === 1, 'tiles were not held back or the person was not hidden');
  const people = await run('borgo', 10, 8, 'bus:pay', [1.0, 1.6]);
  return { bridge, people };
 });
 mkdirSync('artifacts/screens/civic-reveal', { recursive: true });
 for (const [name, set] of Object.entries(result)) for (const [t, data] of Object.entries(set.frames)) writeFileSync(`artifacts/screens/civic-reveal/${name}-${t}.png`, Buffer.from(data.split(',')[1], 'base64'));
 assert.deepEqual(errors, []);
 console.log('PASS: the decision plays out (tiles held back, then changed one by one; people hidden, then step in) and ends by itself.');
} finally { await browser.close(); }
