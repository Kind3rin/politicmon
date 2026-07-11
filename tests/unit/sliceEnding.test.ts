import { test } from "node:test";
import assert from "node:assert/strict";
import { addAlly, applyLineRedEvent } from "../../src/game/coalition.ts";
import { newGameState } from "../../src/game/state.ts";
import { deriveSliceEnding } from "../../src/scenes/SliceEndingScene.ts";

test("slice ending: coalizione senza tensioni produce finale stabile", () => {
  const state = newGameState();
  const result = addAlly(state.coalition, "campo_secretary");
  assert.equal(result.ok, true);
  if (result.ok) state.coalition = result.state;
  assert.equal(deriveSliceEnding(state), "stable");
});

test("slice ending: una linea rossa tesa produce finale fratturato", () => {
  const state = newGameState();
  const result = addAlly(state.coalition, "quantum_centrist");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  state.coalition = applyLineRedEvent(result.state, 13).state;
  assert.equal(deriveSliceEnding(state), "fractured");
});
