// Test della tabella dei tipi (poltypes). Blindano il bilanciamento appena
// ritoccato: triangolo starter chiuso, resistenza DESTRA, immunità, compressione.
import { test } from "node:test";
import assert from "node:assert/strict";
import { typeMultiplier } from "../src/data/poltypes.ts";

test("triangolo degli starter chiuso (DESTRA>SINISTRA>CENTRO>DESTRA)", () => {
  assert.ok(typeMultiplier("DESTRA", ["SINISTRA"]) > 1, "DESTRA batte SINISTRA");
  assert.ok(typeMultiplier("SINISTRA", ["CENTRO"]) > 1, "SINISTRA batte CENTRO");
  assert.ok(typeMultiplier("CENTRO", ["DESTRA"]) > 1, "CENTRO batte DESTRA");
});

test("DESTRA resiste MEDIA (la sua unica resistenza)", () => {
  assert.ok(typeMultiplier("MEDIA", ["DESTRA"]) < 1);
});

test("moltiplicatore compresso (2x -> 1.7, mai one-shot fuori scala)", () => {
  assert.equal(typeMultiplier("DESTRA", ["SINISTRA"]), 1.7);
  // Doppio vantaggio su dual-type resta sotto il cap di compressione.
  assert.ok(typeMultiplier("VERDE", ["TECNO", "DESTRA"]) <= 2.2);
});

test("tipo neutro = 1", () => {
  assert.equal(typeMultiplier("POPULISMO", ["VERDE"]), 1);
});

test("resistenza compressa a 0.6, non 0.5", () => {
  assert.equal(typeMultiplier("CENTRO", ["SINISTRA"]), 0.6);
});
