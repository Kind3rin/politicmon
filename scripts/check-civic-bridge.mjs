import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const browser = await chromium.launch();
try {
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.goto(`${process.env.BASE_URL ?? 'http://127.0.0.1:5179'}/scripts/perf-harness.html`, { waitUntil: 'networkidle' });
 const result = await page.evaluate(async () => {
  const { newGameState, parseGameState } = await import('/src/game/state.ts');
  const { createMonster } = await import('/src/game/monster.ts');
  const { WorldScene } = await import('/src/game/world/WorldScene.ts');
  const { SceneStack } = await import('/src/engine/scene.ts');
  const { Screen } = await import('/src/engine/screen.ts');
  const { Input } = await import('/src/engine/input.ts');
  const { audio } = await import('/src/engine/audio.ts'); audio.enabled = false;
  const { preloadSprites, waitForSprites } = await import('/src/engine/assets.ts');
  const { preloadCoreSprites } = await import('/src/engine/preload.ts');
  await preloadCoreSprites();
  preloadSprites({ 'civic:cantiere': 'ui/civic/cantiere.png', 'tile:q': 'tiles/deck_wood.png' });
  await waitForSprites(['civic:cantiere', 'tile:q'], 8000);
  const state = newGameState(); state.party = [createMonster('giorgetta', 7)]; state.money = 240;
  state.flags['intro-done'] = true; state.pos = { mapId: 'route1', x: 10, y: 8, facing: 'left' };
  const stack = new SceneStack(), input = new Input(), screen = new Screen(document.createElement('canvas'));
  let pressed = '', direction = null;
  input.wasPressed = button => pressed === button; input.heldDirection = () => direction; input.isHeld = () => false;
  const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
  const snapshots = {}, check = (value, label) => { if (!value) throw Error(label); };
  // Civic dossiers are native panels now: A runs the selected action, B the back action.
  const press = (scene, button) => {
   const panel = scene.uiPanel;
   if (panel) { const action = button === 'b' ? panel.back : panel.actions[panel.selected ?? panel.primary ?? 0]; action?.run(); return; }
   pressed = button; scene.update(.02); pressed = '';
  };
  const capture = (name, scene) => { scene.draw(screen); snapshots[name] = screen.ctx.canvas.toDataURL('image/png'); };
  const before = JSON.stringify(state);
  check(world.isBlocked(7, 7), 'water crossing open before public works');
  press(world, 'a'); check(stack.top.constructor.name === 'CivicScene', 'NPC did not open dossier');
  capture('cantiere-choice', stack.top); press(stack.top, 'b');
  check(stack.top === world && JSON.stringify(state) === before, 'B changed funds or decisions');
  press(world, 'a'); const civic = stack.top; press(civic, 'a');
  check(state.money === 0 && state.morale.decisions.includes('cantiere:build'), 'choice not committed exactly once');
  for (let n = 0; n < 50 && stack.top === civic; n++) press(civic, 'a');
  check(stack.top === world && !world.isBlocked(7, 7), 'same world did not open bridge immediately');
  state.pos = { mapId: 'route1', x: 8, y: 7, facing: 'left' }; world.moving = false;
  for (const x of [7, 6]) {
   direction = 'left'; world.update(.02); direction = null;
   check(state.pos.x === x && world.moving, 'real walking input failed on funded bridge');
   world.update(.4); world.msg.close();
  }
  state.pos.facing = 'up'; const count = state.bag.schedona ?? 0;
  press(world, 'a'); world.msg.close();
  check(state.bag.schedona === count + 2 && state.pickedItems.includes('pk-r1-isola'), 'island reward not collected');
  const saved = parseGameState(JSON.stringify(state));
  const restored = new WorldScene(new SceneStack(), input, saved); restored.msg.close();
  check(!restored.isBlocked(7, 7), 'save import closed funded bridge');
  const amount = state.bag.schedona; press(world, 'a'); world.msg.close();
  check(state.bag.schedona === amount, 'reward farmable');
  capture('cantiere-funded', world);
  const fresh = newGameState(); fresh.flags['intro-done'] = true; fresh.pos = { mapId: 'route1', x: 8, y: 7, facing: 'left' };
  const other = new WorldScene(new SceneStack(), input, fresh); other.msg.close(); other.fadeT = 0;
  check(other.isBlocked(7, 7), 'bridge leaked into another campaign'); capture('cantiere-unfunded', other);
  return { snapshots, money: state.money, reward: state.bag.schedona - count, bridgeTiles: [4,5,6,7].map(x => world.tileAt(x, 7)) };
 });
 mkdirSync('artifacts/screens/world-redesign', { recursive: true });
 for (const [name, data] of Object.entries(result.snapshots)) writeFileSync(`artifacts/screens/world-redesign/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
 assert.deepEqual(errors, []); assert.deepEqual(result.bridgeTiles, ['q','q','q','q']);
 console.log('PASS: NPC → civic choice → B cancellation → funding → real walking input → island pickup → no duplicate reward → save import → isolated campaign.');
} finally { await browser.close(); }
