import assert from 'node:assert/strict';
import test from 'node:test';
import { SLOTS, SLOT_BY_ID, IN_ONDA_WEIGHT, currentSlot, gameClock, hourOf, nextSlot, palinsestoOpen, shiftToTune, slotAtHour, slotWeight, typesOnAir } from '../../src/game/palinsesto';
import { MAPS } from '../../src/data/maps';
import { SLOT_ENCOUNTERS } from '../../src/data/maps/slotEncounters';
import { SPECIES } from '../../src/data/species';
import { WANDERERS, pickWanderer } from '../../src/data/encounters';
import { newGameState, parseGameState } from '../../src/game/state';

const at = (h: number, m = 0) => new Date(2026, 9, 6, h, m, 0);

test('the four slots tile the whole day with no gap and no overlap, the night wrapping over midnight', () => {
  for (let h = 0; h < 24; h += 0.25) assert.equal(SLOTS.filter(slot => slotAtHour(h).id === slot.id).length, 1);
  assert.deepEqual([4.99, 5, 11.99, 12, 17.99, 18, 21.99, 22, 0, 23.99].map(h => slotAtHour(h).id), ['notte', 'mattina', 'mattina', 'giorno', 'giorno', 'sera', 'sera', 'notte', 'notte', 'notte']);
  assert.equal(slotAtHour(-1).id, 'notte');
  assert.equal(slotAtHour(25).id, 'notte');
  assert.deepEqual(SLOTS.map(slot => nextSlot(slot).id), ['giorno', 'sera', 'notte', 'mattina']);
});

test('the slots put every political type on the air exactly once, so every candidate has a good hour', () => {
  const counts = new Map<string, number>();
  for (const slot of SLOTS) for (const type of slot.types) counts.set(type, (counts.get(type) ?? 0) + 1);
  assert.equal(counts.size, 8);
  assert.ok([...counts.values()].every(n => n === 1));
});

test('the remote control lands in the middle of the wanted slot from every real hour, with a whole number of hours', () => {
  for (const slot of SLOTS) for (let h = 0; h < 24; h += 0.25) {
    const real = at(Math.floor(h), Math.round((h % 1) * 60));
    const shift = shiftToTune(slot, real);
    assert.ok(Number.isInteger(shift) && shift >= 0 && shift < 24, `${slot.id} from ${h}: ${shift}`);
    assert.equal(currentSlot({ clockShift: shift }, real).id, slot.id, `${slot.id} from ${h}`);
  }
});

test('the game clock is the real one moved by the shift, and a save without a shift behaves like the real clock', () => {
  assert.equal(hourOf(gameClock({ clockShift: 5 }, at(10, 30))), 15.5);
  assert.equal(hourOf(gameClock({ clockShift: 0 }, at(10, 30))), 10.5);
  assert.equal(currentSlot({ clockShift: undefined as never }, at(10)).id, 'mattina');
});

test('a type on the air doubles, a slot-only candidate is absent elsewhere, anything else is untouched', () => {
  const sera = SLOT_BY_ID.sera, notte = SLOT_BY_ID.notte;
  assert.ok(typesOnAir(sera, 'vannaccix') && !typesOnAir(notte, 'vannaccix'));
  assert.equal(slotWeight({ speciesId: 'vannaccix', weight: 10 }, sera), 10 * IN_ONDA_WEIGHT);
  assert.equal(slotWeight({ speciesId: 'vannaccix', weight: 10 }, notte), 10);
  assert.equal(slotWeight({ speciesId: 'vannaccix', weight: 10, slots: ['notte'] }, sera), 0);
  assert.equal(slotWeight({ speciesId: 'bojoon', weight: 10, slots: ['notte'] }, notte), 10 * IN_ONDA_WEIGHT);
  assert.equal(slotWeight({ speciesId: 'nonexistent', weight: 10 }, sera), 10);
});

test('the slot-only candidates are real species at sensible levels, in maps that have a table, with no duplicate in a slot', () => {
  for (const [mapId, entries] of Object.entries(SLOT_ENCOUNTERS)) {
    const map = MAPS[mapId];
    assert.ok(map?.encounters?.length, `${mapId} has a table`);
    const own = map.encounters!.filter(e => !e.slots);
    const ceiling = Math.max(...own.map(e => e.maxLv)), floor = Math.min(...own.map(e => e.minLv));
    const seen = new Set<string>();
    for (const entry of entries) {
      assert.ok(SPECIES[entry.speciesId], `${mapId}: ${entry.speciesId}`);
      assert.ok(entry.slots?.length && entry.slots.every(id => id in SLOT_BY_ID));
      assert.ok(entry.minLv <= entry.maxLv && entry.weight > 0);
      assert.ok(entry.minLv >= floor - 1 && entry.maxLv <= ceiling + 2, `${mapId}: ${entry.speciesId} L${entry.minLv}-${entry.maxLv} sits outside the map's own ${floor}-${ceiling}`);
      for (const slot of entry.slots!) { const key = `${slot}:${entry.speciesId}`; assert.ok(!seen.has(key), `${mapId} ${key} twice`); seen.add(key); }
      assert.ok(map.encounters!.includes(entry), `${mapId}: ${entry.speciesId} is in the table`);
    }
  }
});

test('the first routes only get the weakest species at night and in the morning, so the opening stays gentle', () => {
  for (const mapId of ['borgo', 'route1']) for (const entry of SLOT_ENCOUNTERS[mapId]) {
    const b = SPECIES[entry.speciesId].base, total = b.hp + b.atk + b.def + b.spc + b.spd;
    assert.ok(total <= 360 && entry.maxLv <= 7, `${mapId}: ${entry.speciesId} (${total}, L${entry.maxLv}) is too strong this early`);
  }
});

test('every slot has wandering challengers at every stage of the story, with room to avoid a repeat', () => {
  for (const slot of SLOTS) for (let badges = 0; badges <= 8; badges++) {
    const state = newGameState(); state.badges = Array.from({ length: badges }, (_, i) => `b${i}`);
    const pool = WANDERERS.filter(w => badges >= w.minBadges && (!w.slots || w.slots.includes(slot.id)));
    assert.ok(pool.length >= 4, `${slot.id} with ${badges} badges has only ${pool.length} challengers`);
    assert.ok(pickWanderer(state, pool.slice(0, 3).map(w => w.id), .5, slot.id), `${slot.id}/${badges}: nobody to pick`);
  }
  const state = newGameState();
  assert.ok(pickWanderer(state, [], .5), 'with no slot every challenger still qualifies');
  for (let r = 0; r < 20; r++) { const w = pickWanderer(state, [], r / 20, 'notte'); assert.ok(!w!.slots || w!.slots.includes('notte')); }
});

test('the schedule opens after the first duel with Gianni', () => {
  const state = newGameState();
  assert.equal(palinsestoOpen(state), false);
  state.flags['rival1-beaten'] = true;
  assert.equal(palinsestoOpen(state), true);
});

test('the clock shift is saved, defaults to zero and is clamped to a day', () => {
  const state = newGameState();
  assert.equal(state.clockShift, 0);
  const load = (clockShift: unknown) => parseGameState(JSON.stringify({ ...state, clockShift }))!.clockShift;
  assert.equal(load(7), 7);
  assert.equal(load(31), 7);
  assert.equal(load(-1), 23);
  assert.equal(load('x'), 0);
  assert.equal(load(undefined), 0);
  assert.equal(load(Number.NaN), 0);
});

test('the daily quests about the types on the air only exist once the schedule is open, and always come three and distinct', async () => {
  const { todaysDailyQuests, DAILY_QUEST_POOL } = await import('../../src/game/dailyquests');
  assert.ok(DAILY_QUEST_POOL.some(q => q.needs === 'palinsesto'));
  for (let day = 1; day <= 60; day++) {
    const key = `2026-11-${String(day % 28 + 1).padStart(2, '0')}`;
    for (const open of [false, true]) {
      const quests = todaysDailyQuests(key, open);
      assert.equal(new Set(quests.map(q => q.id)).size, 3);
      if (!open) assert.ok(quests.every(q => !q.needs), `${key}: a closed schedule is never asked for`);
    }
  }
  assert.ok(Array.from({ length: 60 }, (_, d) => todaysDailyQuests(`2026-12-${String(d % 28 + 1).padStart(2, '0')}`, true)).some(q => q.some(x => x.needs)), 'they do come up');
});
