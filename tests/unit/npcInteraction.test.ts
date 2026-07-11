import assert from "node:assert/strict";
import test from "node:test";
import type { NpcDef } from "../../src/data/maps";
import { routeNpcInteraction } from "../../src/game/world/npcInteraction";
import { newGameState } from "../../src/game/state";

const npc = (extra: Partial<NpcDef>): NpcDef => ({ id: "npc", pal: "aide", x: 1, y: 1, facing: "down", ...extra });

test("routing NPC: trainer ha priorità sulle capability secondarie", () => {
  const state = newGameState();
  const route = routeNpcInteraction(state, npc({ trainerId: "aide", shop: true }));
  assert.deepEqual(route, { kind: "trainer", availability: "first" });
});

test("routing NPC: trainer sconfitto non rivincibile ricade sul dialogo", () => {
  const state = newGameState();
  state.defeatedTrainers.push("boss");
  assert.deepEqual(routeNpcInteraction(state, npc({ trainerId: "boss", lines: ["CIAO"] })), { kind: "dialog", setFlag: undefined });
});

test("routing NPC: gift già riscosso ricade sul dialogo", () => {
  const state = newGameState();
  state.flags.gift = true;
  const target = npc({ gift: { itemId: "caffe", qty: 1, flag: "gift", lines: ["PREMIO"] }, lines: ["FINITO"] });
  assert.equal(routeNpcInteraction(state, target).kind, "dialog");
});

test("routing NPC: setFlag viene dichiarato senza mutare lo stato", () => {
  const state = newGameState();
  assert.deepEqual(routeNpcInteraction(state, npc({ setFlag: "parlato", lines: ["CIAO"] })), { kind: "dialog", setFlag: "parlato" });
  assert.equal(state.flags.parlato, undefined);
});
