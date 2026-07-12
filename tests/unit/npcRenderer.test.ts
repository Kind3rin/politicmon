import assert from "node:assert/strict";
import test from "node:test";
import { npcMarkerVisible, npcNameplateLayout } from "../../src/game/world/npcRenderer.ts";

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
