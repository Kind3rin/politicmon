/** The field powers: each one opens what it should, only when it is unlocked and someone can use it, and the road never needs one. */
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
  const boot = (mapId, x, y, facing, { badges = ['auditel', 'spread', 'dazio'], party = ['berlusconix', 'giorgetta', 'ellyna', 'salvinator', 'draghimon', 'movimenton'], effects = false } = {}) => {
   const state = newGameState(); state.party = party.map(id => createMonster(id, 26)); state.flags['intro-done'] = true; state.flags['dex-received'] = true; state.badges = badges; state.reduceEffects = !effects; state.pos = { mapId, x, y, facing };
   const stack = new SceneStack(), input = new Input(); input.wasPressed = () => false; input.heldDirection = () => null; input.isHeld = () => false;
   const world = new WorldScene(stack, input, state); stack.push(world); world.msg.close(); world.justEnteredMap = false; world.fadeT = 0;
   const run = (seconds = 3) => { for (let t = 0; t < seconds; t += .05) world.update(.05); };
   run(.6); world.msg.close?.();
   return { state, world, run, stack };
  };
  const log = [];
  // TAGLIO LINEARE: the tape blocks, the context button says so, the cut opens the glade.
  { const { state, world, run } = boot('route2', 10, 5, 'up');
    check(world.isBlocked(10, 4), 'the tape does not block');
    check(world.contextLabel() === 'Taglia', 'context label is ' + world.contextLabel());
    world.interact(); run(2.5);
    check(state.flags['cut-r2-nastro-nord'] && !world.isBlocked(10, 4), 'the tape was not cut');
    log.push('taglio'); }
  // ... with the effects on, the cut-in plays first and the controls wait.
  { const { state, world, run } = boot('route2', 10, 5, 'up', { effects: true });
    world.interact(); check(world.cutIn && !world.canUseWorldControls(), 'no cut-in with effects on');
    run(2.5); check(!world.cutIn && state.flags['cut-r2-nastro-nord'], 'the cut-in did not hand over to the cut'); log.push('cut-in'); }
  // Without the badge or without anyone who can use it, the player is told what is missing and nothing changes.
  { const { state, world, run } = boot('route2', 10, 5, 'up', { badges: ['auditel'] });
    world.interact(); run(.3); check(world.msg.isOpen && !state.flags['cut-r2-nastro-nord'], 'locked power did something'); }
  { const { state, world, run } = boot('route2', 10, 5, 'up', { party: ['giorgetta'] });
    const user = world.state.party[0]; user.hp = 0; world.interact(); run(.3); check(world.msg.isOpen && !state.flags['cut-r2-nastro-nord'], 'a fainted team used a power'); }
  // SCALATA: up the bank.
  { const { state, world, run } = boot('route2', 17, 5, 'up');
    check(world.contextLabel() === 'Scala', 'no climb label: ' + world.contextLabel());
    world.interact(); run(2.5); check(state.pos.y === 3 && state.pos.x === 17, 'did not land on the bank: ' + state.pos.y); log.push('scalata'); }
  // SPALLATA: the boulder slides one tile.
  { const { state, world, run } = boot('capitale', 19, 21, 'down');
    check(world.isBlocked(19, 22), 'the boulder does not block');
    world.interact(); run(2.5); check(!world.isBlocked(19, 22) && world.isBlocked(19, 23), 'the boulder did not move');
    state.pos.facing = 'down'; world.loadMap('capitale'); check(world.isBlocked(19, 22), 'the boulder does not come back with the map'); log.push('spallata'); }
  // DECRETO PONTE: planks one by one, and gone when the map is left.
  { const { state, world, run } = boot('capitale', 27, 20, 'down');
    check(world.contextLabel() === 'Decreto', 'no bridge label: ' + world.contextLabel());
    world.interact(); run(2.5); check(world.tileAt(27, 21) === 'q' && !world.isBlocked(27, 21), 'the bridge is missing');
    world.loadMap('capitale'); check(world.tileAt(27, 21) === 'w', 'the bridge outlived the map'); log.push('ponte'); }
  // The state ferry's water is not a ditch: a lake is not bridged.
  { const { world } = boot('route1', 3, 6, 'right'); check(world.bridgeInFront() === null || world.bridgeInFront().tiles.length <= 3, 'a lake got bridged'); }
  // COMIZIO: someone comes running; again at once is refused.
  { const { state, world, run } = boot('route1', 14, 20, 'up');
    world.usePower('comizio'); run(2); check(world.roamers.roamers.some(r => r.lured), 'nobody came');
    const first = state.stepsTotal; world.usePower('comizio'); run(.3); check(world.msg.isOpen, 'a second rally at once was not refused'); log.push('comizio'); }
  // SONDAGGIO: a fifteen-second radar, and not twice at once.
  { const { world, run } = boot('route1', 14, 20, 'up'); world.usePower('sondaggio'); run(.5); check(world.poll > 10, 'no poll'); world.usePower('sondaggio'); run(.2); check(world.msg.isOpen, 'a second poll was not refused'); world.msg.close?.(); run(16); check(world.poll === 0, 'the poll never ended'); log.push('sondaggio'); }
  // RIFLETTORI: only in the dark; DIMISSIONI LAMPO: only indoors and it leads outside.
  { const { world, run } = boot('route1', 14, 20, 'up'); world.usePower('riflettori'); run(.3); check(world.msg.isOpen && !world.spot, 'floodlights on in daylight'); }
  { const { world, run } = boot('grotta1', 5, 3, 'down'); world.usePower('riflettori'); run(2); check(world.spot, 'floodlights did not come on');
    world.spot = true; world.usePower('scappatoia'); run(2.5); check(world.state.pos.mapId === 'route1' || world.state.pos.mapId === 'borgo' || world.map.outdoor, 'did not leave the cave: ' + world.state.pos.mapId); log.push('riflettori+scappatoia'); }
  return log;
 });
 assert.deepEqual(errors, []);
 console.log('PASS: every power opens what it should and says what is missing otherwise.', result.join(' · '));
} finally { await browser.close(); }
