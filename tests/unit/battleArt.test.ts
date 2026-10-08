import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { BattleFx, GAG_ART, audienceReaction } from "../../src/game/battle/view";

test("the audience reads the fight: applause for a clear lead, booing for a clear deficit, phones on a full Polemica bar", () => {
  assert.equal(audienceReaction(.8, .4, 0), "applause");
  assert.equal(audienceReaction(.3, .7, 1), "boo");
  assert.equal(audienceReaction(.5, .5, 0), "neutral");
  assert.equal(audienceReaction(.2, .3, 2), "neutral", "a small difference does not move the crowd");
  assert.equal(audienceReaction(.1, .9, 3), "phones", "a full Polemica bar takes the phones out, whatever the score");
});

test("every audience reaction and every gag has its sprite in public/sprites/battle", () => {
  for (const reaction of ["neutral", "applause", "boo", "phones"]) {
    assert.ok(existsSync(`public/sprites/battle/crowd_${reaction}.png`), `crowd_${reaction}.png`);
  }
  for (const art of Object.values(GAG_ART)) {
    assert.ok(existsSync(`public/sprites/battle/${art}.png`), `${art}.png`);
  }
});

test("the satirical moves carry a gag; the others do not", () => {
  assert.deepEqual(Object.keys(GAG_ART).sort(), ["decreto", "piazza_aperta", "tweet"]);
  const fx = new BattleFx();
  fx.playGag("player", "tratto_normale");
  assert.equal(fx.gagFx, null);
  fx.playGag("player", "tweet");
  assert.equal(fx.gagFx?.art, "gag_tweet");
  fx.update(.8);
  assert.equal(fx.gagFx, null, "the gag is over after its flight");
});

test("reduced effects start no gag", () => {
  const fx = new BattleFx();
  fx.reduceEffects = true;
  fx.playGag("foe", "decreto");
  assert.equal(fx.gagFx, null);
});
