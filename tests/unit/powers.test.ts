import assert from 'node:assert/strict';
import test from 'node:test';
import { POWERS, POWER_ORDER, powerStatus, powerUnlocked, powerUsers, unlockedPowers } from '../../src/game/powers';
import { createMonster } from '../../src/game/monster';
import { newGameState } from '../../src/game/state';
import { SPECIES } from '../../src/data/species';
import { flightDestinations } from '../../src/game/world/transport';

const withParty = (ids: string[], badges: string[] = [], flags: Record<string, boolean> = {}) => {
  const state = newGameState(); state.party = ids.map(id => createMonster(id, 20)); state.badges = badges; Object.assign(state.flags, flags); return state;
};
const starters = Object.keys(SPECIES).slice(0, 3);

test('the powers open with the story, in order, and the first one after the first duel with Gianni', () => {
  const state = withParty(starters);
  assert.deepEqual(unlockedPowers(state), []);
  state.flags['rival1-beaten'] = true;
  assert.deepEqual(unlockedPowers(state), ['comizio']);
  state.badges = ['auditel'];
  assert.deepEqual(unlockedPowers(state), ['comizio', 'riflettori', 'scappatoia']);
  state.badges = ['auditel', 'spread'];
  assert.ok(['taglio', 'volo', 'scalata', 'sondaggio'].every(id => powerUnlocked(state, id as never)));
  assert.ok(!powerUnlocked(state, 'ponte') && !powerUnlocked(state, 'spallata'));
  state.badges.push('dazio');
  assert.equal(unlockedPowers(state).length, POWER_ORDER.length);
});

test('every power can be used by a good share of the roster, so no team is shut out of a whole power', () => {
  const species = Object.values(SPECIES);
  for (const id of POWER_ORDER) {
    const power = POWERS[id];
    if (power.users === 'any') continue;
    const share = species.filter(s => s.types.some(t => (power.users as readonly string[]).includes(t))).length / species.length;
    assert.ok(share >= .3, `${id}: only ${Math.round(share * 100)}% of the roster can use it`);
  }
});

test('the user is the first healthy member with a fitting type; a fainted one does not count', () => {
  const comizio = withParty(starters, [], { 'rival1-beaten': true });
  assert.equal(powerUsers(comizio, 'comizio').length, 3);
  comizio.party[0].hp = 0;
  const status = powerStatus(comizio, 'comizio');
  assert.equal(status.kind, 'ready');
  if (status.kind === 'ready') assert.equal(status.user, comizio.party[1]);
  for (const mon of comizio.party) mon.hp = 0;
  assert.equal(powerStatus(comizio, 'comizio').kind, 'nobody');
  assert.equal(powerStatus(withParty(starters), 'comizio').kind, 'locked');
});

test('the state flight lists the four cities and only opens the far places once you have been there', () => {
  const state = withParty(starters, ['auditel', 'spread', 'dazio'], { 'dex-received': true });
  const open = (current: string) => flightDestinations(state, current).filter(f => f.open).map(f => f.destination.mapId);
  assert.deepEqual(open('borgo'), ['mediopoli', 'eurotown', 'capitale']);
  state.flags['visited-stretto'] = true;
  assert.ok(open('borgo').includes('stretto'));
  assert.ok(!open('stretto').includes('stretto'));
  state.flags['garante-beaten'] = true; state.flags['visited-bruxelles'] = true;
  assert.ok(open('borgo').includes('bruxelles') && !open('borgo').includes('offshore'));
});
