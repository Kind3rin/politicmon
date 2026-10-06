import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_TIPS, WORLD_TIPS, markTip, nextBattleTip, nextWorldTip, tipSeen, type BattleSituation } from '../../src/game/coach';
import { newGameState } from '../../src/game/state';

const calm: BattleSituation = { wild: true, ownRatio: 1, foeRatio: 1, arrows: false, polemica: 0, intent: false, cards: 3, help: true };

test('nothing is said when there is nothing to say', () => {
  assert.equal(nextBattleTip(newGameState(), calm), undefined);
});

test('each situation has its tip, and the urgent ones come first', () => {
  const state = newGameState();
  assert.equal(nextBattleTip(state, { ...calm, arrows: true })?.id, 'efficacy');
  assert.equal(nextBattleTip(state, { ...calm, polemica: 1 })?.id, 'polemica');
  assert.equal(nextBattleTip(state, { ...calm, intent: true })?.id, 'intent');
  assert.equal(nextBattleTip(state, { ...calm, foeRatio: .4 })?.id, 'recruit');
  assert.equal(nextBattleTip(state, { ...calm, ownRatio: .2 })?.id, 'lowhp');
  assert.equal(nextBattleTip(state, { ...calm, polemica: 3 })?.id, 'fuorionda');
  assert.equal(nextBattleTip(state, { ...calm, arrows: true, polemica: 3, intent: true, ownRatio: .2, foeRatio: .3 })?.id, 'fuorionda');
  assert.equal(nextBattleTip(state, { ...calm, arrows: true, polemica: 1, intent: true })?.id, 'efficacy');
});

test('a tip is offered once: read, dismissed or acted upon, it stays gone', () => {
  const state = newGameState();
  const tip = nextBattleTip(state, { ...calm, arrows: true, polemica: 1, intent: true })!;
  markTip(state, tip.id);
  assert.ok(tipSeen(state, 'efficacy'));
  assert.equal(nextBattleTip(state, { ...calm, arrows: true })?.id, undefined);
  assert.equal(nextBattleTip(state, { ...calm, arrows: true, polemica: 1, intent: true })?.id, 'polemica');
  markTip(state, 'polemica'); markTip(state, 'intent');
  assert.equal(nextBattleTip(state, { ...calm, arrows: true, polemica: 1, intent: true }), undefined);
});

test('the recruit tip needs a candidate that is weak, alive, and a card to throw', () => {
  const state = newGameState();
  assert.equal(nextBattleTip(state, { ...calm, wild: false, foeRatio: .3 }), undefined);
  assert.equal(nextBattleTip(state, { ...calm, foeRatio: 0 }), undefined);
  assert.equal(nextBattleTip(state, { ...calm, foeRatio: .3, cards: 0 }), undefined);
  assert.equal(nextBattleTip(state, { ...calm, foeRatio: .51 }), undefined);
});

test('the low-HP tip needs a way to help and a companion still standing', () => {
  const state = newGameState();
  assert.equal(nextBattleTip(state, { ...calm, ownRatio: .2, help: false }), undefined);
  assert.equal(nextBattleTip(state, { ...calm, ownRatio: 0 }), undefined);
  assert.equal(nextBattleTip(state, { ...calm, ownRatio: .31 }), undefined);
});

test('the world tips wait for a calm moment, and the cards tip only once recruiting has begun', () => {
  const state = newGameState();
  const here = { calm: true, hurt: false, cards: 2, recruiting: true };
  assert.equal(nextWorldTip(state, here), undefined);
  assert.equal(nextWorldTip(state, { ...here, hurt: true, calm: false }), undefined);
  assert.equal(nextWorldTip(state, { ...here, hurt: true })?.id, 'tired');
  assert.equal(nextWorldTip(state, { ...here, cards: 0 })?.id, 'cards');
  assert.equal(nextWorldTip(state, { ...here, cards: 0, recruiting: false }), undefined);
  assert.equal(nextWorldTip(state, { ...here, hurt: true, cards: 0 })?.id, 'tired');
  markTip(state, 'tired');
  assert.equal(nextWorldTip(state, { ...here, hurt: true, cards: 0 })?.id, 'cards');
  markTip(state, 'cards');
  assert.equal(nextWorldTip(state, { ...here, hurt: true, cards: 0 }), undefined);
});

test('every tip fits the card: a short title and a body of three lines at most', () => {
  for (const tip of [...Object.values(BATTLE_TIPS), ...Object.values(WORLD_TIPS)]) {
    assert.ok(tip.title.length <= 26, `${tip.id} title`);
    assert.ok(tip.body.length <= 135, `${tip.id} body is ${tip.body.length} characters`);
  }
});
