import test from "node:test";
import assert from "node:assert/strict";
import { COPPA_RULES, coppaRule, prepareCoppaParty } from "../../src/game/tournament.ts";
import { createMonster, statsOf } from "../../src/game/monster.ts";

test("P6-T02: rotazione COPPA espone cinque regole complete e deterministiche", () => {
  assert.deepEqual(COPPA_RULES.map((rule) => rule.id), ["monotype", "level50", "team3", "noitems", "oneheal"]);
  assert.equal(coppaRule("2026-07-11"), coppaRule("2026-07-11"));
  assert.ok(COPPA_RULES.every((rule) => rule.name && rule.description));
});

test("P6-T02: livello 50 e squadra 3 preparano copie senza mutare il party storia", () => {
  const party = [createMonster("giorgetta", 42), createMonster("ellyna", 44), createMonster("renzino", 46), createMonster("telecrate", 48)];
  const original = party.map((mon) => mon.level);
  const level50 = prepareCoppaParty(party, COPPA_RULES.find((rule) => rule.id === "level50")!);
  assert.equal(level50.ok, true); if (!level50.ok) return;
  assert.ok(level50.party.every((mon) => mon.level === 50 && mon.hp === statsOf(mon).hp));
  assert.deepEqual(party.map((mon) => mon.level), original);
  const team3 = prepareCoppaParty(party, COPPA_RULES.find((rule) => rule.id === "team3")!);
  assert.equal(team3.ok && team3.party.length, 3);
});

test("P6-T02: monotipo rifiuta prima della quota o seleziona almeno tre idonei", () => {
  const rule = COPPA_RULES.find((item) => item.id === "monotype")!;
  const denied = prepareCoppaParty([createMonster("giorgetta", 50), createMonster("ellyna", 50)], rule);
  assert.equal(denied.ok, false);
  const allowed = prepareCoppaParty([createMonster("salistrobo", 50), createMonster("salisound", 50), createMonster("ellyna", 50), createMonster("giorgetta", 50)], rule);
  assert.equal(allowed.ok, true); if (allowed.ok) assert.ok(allowed.party.length >= 3);
});

test("P6-T02: limiti borsa sono espliciti", () => {
  assert.equal(COPPA_RULES.find((rule) => rule.id === "noitems")?.maxHealingItems, 0);
  assert.equal(COPPA_RULES.find((rule) => rule.id === "oneheal")?.maxHealingItems, 1);
});
