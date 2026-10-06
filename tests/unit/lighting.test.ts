import assert from 'node:assert/strict';
import test from 'node:test';
import { ambientLight, lightNeed } from '../../src/game/world/lighting';

test('the light moves smoothly through the day: no hour jumps', () => {
  let last = ambientLight(0);
  for (let minute = 1; minute <= 24 * 60; minute++) {
    const now = ambientLight(minute / 60);
    assert.ok(Math.abs(now.alpha - last.alpha) < .02, `alpha jumps at ${(minute / 60).toFixed(2)}`);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(now.rgb[c] - last.rgb[c]) <= 6, `colour jumps at ${(minute / 60).toFixed(2)}`);
    last = now;
  }
});

test('noon is clear, midnight is dark, and the lamps are worth something only when it is dark', () => {
  assert.equal(ambientLight(12).alpha, 0);
  assert.ok(ambientLight(0).alpha > .5);
  assert.equal(lightNeed(ambientLight(12)), 0);
  assert.ok(lightNeed(ambientLight(23)) > .8);
  assert.ok(lightNeed(ambientLight(18.5)) > 0 && lightNeed(ambientLight(18.5)) < lightNeed(ambientLight(21)));
  assert.ok(lightNeed(ambientLight(7)) < .35, 'the lamps go out in the morning');
});

test('the clock wraps', () => {
  assert.deepEqual(ambientLight(25), ambientLight(1));
  assert.deepEqual(ambientLight(-1), ambientLight(23));
});
