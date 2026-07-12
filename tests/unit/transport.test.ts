import assert from "node:assert/strict";
import { test } from "node:test";
import { newGameState } from "../../src/game/state.ts";
import { availableTransportDestinations } from "../../src/game/world/transport.ts";

test("trasporti: senza progressi offre solo Borgo e mai la mappa corrente", () => {
  const state = newGameState();
  assert.deepEqual(availableTransportDestinations(state, "capitale").map((entry) => entry.mapId), ["borgo"]);
  assert.deepEqual(availableTransportDestinations(state, "borgo").map((entry) => entry.mapId), []);
});

test("trasporti: le medaglie sbloccano destinazioni senza saltare la progressione", () => {
  const state = newGameState();
  state.flags["dex-received"] = true;
  state.badges = ["auditel", "spread"];
  assert.deepEqual(
    availableTransportDestinations(state, "mediopoli").map((entry) => entry.mapId),
    ["borgo", "eurotown", "capitale"]
  );
});
