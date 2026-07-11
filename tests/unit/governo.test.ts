// Test della stat SONDAGGI (governo.ts): clamp e notifiche milestone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addSondaggi, bumpSondaggi } from "../../src/game/governo.ts";
import { newGameState } from "../../src/game/state.ts";

test("addSondaggi: clamp entro 0..100", () => {
  const s = newGameState();
  s.sondaggi = 95;
  assert.equal(addSondaggi(s, 20), 100, "non supera 100");
  s.sondaggi = 5;
  assert.equal(addSondaggi(s, -20), 0, "non scende sotto 0");
});

test("addSondaggi: applica il delta arrotondato", () => {
  const s = newGameState();
  s.sondaggi = 50;
  assert.equal(addSondaggi(s, 7), 57);
  assert.equal(addSondaggi(s, -3), 54);
});

test("bumpSondaggi: annuncia la soglia superata in salita", () => {
  const s = newGameState();
  s.sondaggi = 38;
  const r = bumpSondaggi(s, 5); // 38 -> 43, supera 40
  assert.equal(r.value, 43);
  assert.ok(r.milestone && r.milestone.includes("40%"), "milestone 40 annunciata");
});

test("bumpSondaggi: nessun annuncio se non si attraversa una soglia", () => {
  const s = newGameState();
  s.sondaggi = 42;
  const r = bumpSondaggi(s, 3); // 42 -> 45, nessuna soglia nel mezzo
  assert.equal(r.milestone, null);
});

test("bumpSondaggi: scendendo non annuncia milestone", () => {
  const s = newGameState();
  s.sondaggi = 45;
  const r = bumpSondaggi(s, -10); // scende sotto 40
  assert.equal(r.milestone, null);
});

test("bumpSondaggi: superando più soglie in un colpo annuncia la più alta", () => {
  const s = newGameState();
  s.sondaggi = 20;
  const r = bumpSondaggi(s, 60); // 20 -> 80, supera 25/40/55/70
  assert.ok(r.milestone && r.milestone.includes("70%"), "annuncia la soglia massima raggiunta");
});
