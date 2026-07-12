import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_CATALOG } from "../../src/scenes/ContentScene";
import { newGameState } from "../../src/game/state";
import { applyMemeEffects, canApplyMemeEffects } from "../../src/game/memeEventRuntime";

test("release completa: il catalogo espone tutti i sistemi e requisiti leggibili", () => {
  assert.equal(CONTENT_CATALOG.length, 10);
  assert.ok(CONTENT_CATALOG.every((entry) => entry.title && entry.description && entry.requirement));
  assert.ok(CONTENT_CATALOG.every((entry) => !entry.title.includes("...") && !entry.requirement.includes("...")));
});

test("release completa: il catalogo segue i progressi di un save esistente", () => {
  const state = newGameState();
  assert.equal(CONTENT_CATALOG.find((entry) => entry.title.startsWith("ATTO 3"))?.unlocked(state), false);
  state.flags["ue-beaten"] = true;
  assert.equal(CONTENT_CATALOG.find((entry) => entry.title.startsWith("ATTO 3"))?.unlocked(state), true);
  state.flags.atto3Complete = true;
  assert.equal(CONTENT_CATALOG.find((entry) => entry.title === "CAMPAGNA SETTIMANALE")?.unlocked(state), true);
});

test("eventi meme: applicano effetti reali e rifiutano costi non coperti", () => {
  const state = newGameState();
  state.money = 100;
  state.sondaggi = 50;
  assert.equal(canApplyMemeEffects(state, [{ kind: "money", delta: -200 }]), false);
  const effects = [{ kind: "money", delta: 250 }, { kind: "sondaggi", delta: 4 }, { kind: "item", id: "schedona", qty: 2 }] as const;
  assert.equal(canApplyMemeEffects(state, effects), true);
  applyMemeEffects(state, effects);
  assert.equal(state.money, 350);
  assert.equal(state.sondaggi, 54);
  assert.equal(state.bag.schedona, 2);
});
