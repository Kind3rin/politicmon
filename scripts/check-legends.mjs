/** The legends' rites: a closed door, three steps, an open door, a sacrario, a relic, and a rule of their own in battle. */
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
  const { BattleScene } = await import('/src/game/battle/BattleScene.ts');
  const { SceneStack } = await import('/src/engine/scene.ts');
  const { Screen } = await import('/src/engine/screen.ts');
  const { Input } = await import('/src/engine/input.ts');
  const { audio } = await import('/src/engine/audio.ts'); audio.enabled = false;
  const { preloadCoreSprites } = await import('/src/engine/preload.ts');
  await preloadCoreSprites();
  await new Promise(resolve => setTimeout(resolve, 800));
  const check = (value, label) => { if (!value) throw Error(label); };
  const shots = {};
  const state = newGameState(); state.party = [createMonster('giorgetta', 20)]; state.flags['intro-done'] = true; state.badges = ['auditel'];
  state.pos = { mapId: 'gymtv', x: 2, y: 2, facing: 'left' };
  const stack = new SceneStack(), input = new Input(), screen = new Screen(document.createElement('canvas'));
  let direction = null; input.wasPressed = () => false; input.heldDirection = () => direction; input.isHeld = () => false;
  const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
  const walk = (dir, n) => { for (let i = 0; i < n; i++) { direction = dir; world.update(.02); direction = null; for (let t = 0; t < 14; t++) world.update(.05); } };
  // 1. The door is closed before the rite.
  walk('left', 1);
  check(world.map.id === 'gymtv', 'the closed door let the player in');
  world.msg.close();
  // 2. Three steps, then the door opens by itself and says so.
  state.flags['legend-berlusconix-ready'] = true; state.flags['leg-berlusconix-fan'] = true; state.flags['leg-berlusconix-retro'] = true; state.morale.decisions = ['remix', 'remix:hook'];
  for (let i = 0; i < 10; i++) world.update(.05);
  check(state.flags['rito-berlusconix-open'] === true, 'the rite did not open the door');
  check(world.msg.isOpen, 'no announcement'); world.msg.close();
  // 3. Through the door.
  state.pos = { mapId: 'gymtv', x: 2, y: 2, facing: 'left' };
  walk('left', 1); for (let i = 0; i < 12; i++) world.update(.05);
  check(world.map.id === 'regia', 'the open door did not lead to the regia');
  world.msg.close(); for (let i = 0; i < 40; i++) world.update(.05);
  world.draw(screen); shots.regia = screen.ctx.canvas.toDataURL('image/png');
  const legend = world.npcs.find(npc => npc.id === 'berlusconix-legend'); check(legend, 'the legend is not in its sacrario');
  // 4. Recruiting it hands over the relic once.
  world.startWildBattle = (id, level, after) => after('caught');
  world.beginLegendaryBattle(legend.legendary); for (let i = 0; i < 20; i++) { world.msg.advance?.(); world.update(.2); }
  check(state.bag.telecomando === 1, 'no relic after the recruitment');
  check(state.flags['legend-berlusconix-gone'] === true, 'the legend flag was not set');
  // 5. In battle the legend in the party has its aura, its entrance and its rule, once.
  const party = createMonster('berlusconix', 20); const bstate = newGameState(); bstate.party = [party, createMonster('ellyna', 12)]; bstate.badges = ['auditel']; bstate.flags['intro-done'] = true; bstate.pos = { mapId: 'regia', x: 5, y: 6, facing: 'up' };
  bstate.bag.telecomando = 1;
  const bstack = new SceneStack(); const battle = new BattleScene(bstack, input, { state: bstate, foeTeam: [createMonster('muskrat', 20)], onEnd: () => {} }); bstack.push(battle);
  for (let i = 0; i < 6; i++) battle.update(.1);
  battle.draw(screen); shots.entry = screen.ctx.canvas.toDataURL('image/png');
  for (let i = 0; i < 120 && battle.msg.isOpen; i++) { battle.msg.advance?.(); battle.update(.3); }
  const action = () => battle.uiPanel.actions.find(item => item.label === 'Leggenda');
  check(action(), 'the legend has no rule to evoke');
  const before = [battle.player.stages.atk, battle.foe.stages.atk];
  action().run(); for (let i = 0; i < 40; i++) battle.update(.1);
  check(battle.player.stages.atk === before[0] + 1 && battle.foe.stages.atk === before[1] + 1, 'DIRETTA TV did not raise both attacks');
  check(!action(), 'the rule can be evoked twice');
  battle.draw(screen); shots.rule = screen.ctx.canvas.toDataURL('image/png');
  return shots;
 });
 mkdirSync('artifacts/screens/legends', { recursive: true });
 for (const [name, data] of Object.entries(result)) writeFileSync(`artifacts/screens/legends/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
 assert.deepEqual(errors, []);
 console.log('PASS: closed door, rite, open door, sacrario, relic once, aura and rule of the legend in battle.');
} finally { await browser.close(); }
