import assert from "node:assert/strict";
import test from "node:test";
import { buildNpcDrawCommand, npcMarkerVisible, npcNameplateLayout, type RuntimeNpc } from "../../src/game/world/npcRenderer.ts";
import type { Screen } from "../../src/engine/screen";

test("targhetta NPC: appare soltanto quando il centro del personaggio è in camera", () => {
  assert.equal(npcMarkerVisible(20, 100), true);
  assert.equal(npcMarkerVisible(-9, 100), false);
  assert.equal(npcMarkerVisible(240, 100), false);
  assert.equal(npcMarkerVisible(20, -9), false);
  assert.equal(npcMarkerVisible(20, 180), false);
});

test("targhetta NPC: resta visibile sugli ultimi pixel utili della camera", () => {
  assert.equal(npcMarkerVisible(-8, -8), true);
  assert.equal(npcMarkerVisible(231, 171), true);
});

test("targhetta Luca: segue il personaggio e resta sopra lo sprite", () => {
  const layout = npcNameplateLayout("LUCA - GUIDA", 80, 90);
  assert.deepEqual(layout, { x: 50, y: 73, width: 76 });
  // Lo sprite alto 22 px parte a screenY-6: la targhetta finisce a 81,
  // lasciando tre pixel prima della testa a y=84.
  assert.ok(layout && layout.y + 8 <= 81);
  assert.equal(npcNameplateLayout("LUCA - GUIDA", -20, 90), null);
});

test("legendary cue remains visible and still with reduced effects", () => {
  const draw = (time: number, reduceEffects: boolean) => {
    const calls: unknown[][] = [];
    const screen = { rect: (...args: unknown[]) => calls.push(["rect", ...args]), text: (...args: unknown[]) => calls.push(["text", ...args]) } as unknown as Screen;
    const npc = { pal: "test-no-image", x: 5, y: 5, dispX: 80, dispY: 80, currentFacing: "down", stepFrom: null } as RuntimeNpc;
    buildNpcDrawCommand({ screen, npc, camX: 0, camY: 0, time, reduceEffects, exclaim: false, rematchReady: false, legendaryReady: true, drawShadow: () => {} }).draw();
    return calls;
  };
  assert.deepEqual(draw(.1, true), draw(2.6, true));
  assert.notDeepEqual(draw(.1, false), draw(2.6, false));
  assert.ok(draw(.1, true).some(call => call[0] === "text" && call[1] === "LEGGENDARIO"));
});
