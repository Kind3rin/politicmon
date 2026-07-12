import assert from "node:assert/strict";
import test from "node:test";
import { mafiaOptionDetails } from "../../src/scenes/MafiaScene.ts";

test("retrobottega: ogni voce spiega effetto, costo e rischio prima dell'acquisto", () => {
  const market = mafiaOptionDetails(0, false).join(" ");
  const recommendation = mafiaOptionDetails(1, false).join(" ");
  const protection = mafiaOptionDetails(2, false).join(" ");
  const bet = mafiaOptionDetails(3, false).join(" ");
  assert.match(market, /DIRETTIVE.+3-4 SOND/);
  assert.match(recommendation, /CURA TUTTA.+2 SCHEDE.+400€.+-2 SOND/);
  assert.match(protection, /RIDUCE GLI INCONTRI.+PERMANENTE.+1200€.+-5 SOND/);
  assert.match(bet, /200€.+25%.+600€.+22%.+53%/);
});

test("retrobottega: protezione acquistata mostra chiaramente lo stato permanente", () => {
  assert.match(mafiaOptionDetails(2, true).join(" "), /GIÀ ATTIVA.+RESTANO RIDOTTI/);
});
