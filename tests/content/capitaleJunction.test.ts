import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps";

test("Caput Mundi: l'incrocio davanti al porto non contiene erba isolata", () => {
  const capitale = MAPS.capitale;
  for (let x = 4; x <= 25; x += 1) {
    assert.equal(capitale.tiles[19]?.[x], "=", `sentiero interrotto a (${x},19)`);
  }
});
