import assert from 'node:assert/strict';
import test from 'node:test';
import { bridgePlan, climbLanding, pushTarget, type Grid } from '../../src/game/world/powerWorld';

const grid = (rows: string[]): Grid => ({
  width: rows[0].length, height: rows.length,
  water: (x, y) => rows[y]?.[x] === 'w',
  open: (x, y) => rows[y]?.[x] === '.'
});

test('a bridge crosses one to three tiles of water and lands on open ground', () => {
  const g = grid(['.w.....', '.ww....', '.www...', '.wwww..']);
  assert.deepEqual(bridgePlan(g, { x: 0, y: 0 }, 1, 0)?.landing, { x: 2, y: 0 });
  assert.equal(bridgePlan(g, { x: 0, y: 1 }, 1, 0)?.tiles.length, 2);
  assert.equal(bridgePlan(g, { x: 0, y: 2 }, 1, 0)?.tiles.length, 3);
  assert.equal(bridgePlan(g, { x: 0, y: 3 }, 1, 0), null, 'four tiles is a lake, not a ditch');
});

test('no bridge from dry land to dry land, off the map or onto a wall', () => {
  const g = grid(['..w#', '.....']);
  assert.equal(bridgePlan(g, { x: 0, y: 1 }, 1, 0), null, 'nothing to cross');
  assert.equal(bridgePlan(g, { x: 1, y: 0 }, 1, 0), null, 'the far side is a wall');
  assert.equal(bridgePlan(grid(['.w']), { x: 0, y: 0 }, 1, 0), null, 'the far side is off the map');
});

test('climbing needs open ground two rows up; pushing needs the next tile free', () => {
  const g = grid(['.#.', '...', '...']);
  assert.deepEqual(climbLanding(g, { x: 0, y: 2 }), { x: 0, y: 0 });
  assert.equal(climbLanding(g, { x: 1, y: 2 }), null);
  assert.deepEqual(pushTarget(g, { x: 0, y: 1 }, 1, 0), { x: 1, y: 1 });
  assert.equal(pushTarget(g, { x: 1, y: 1 }, 0, -1), null);
  assert.equal(pushTarget(g, { x: 2, y: 1 }, 1, 0), null);
});
