import assert from "node:assert/strict";
import test from "node:test";
import { createMonster } from "../../src/game/monster";
import { EFFECT_HANDLERS, EFFECT_PHASE_ORDER, resolveEndTurn, resolveFuturoPhase, resolvePreMove, statDropBlockReason, statusBlockReason } from "../../src/game/battle/effectContract";
import { makeCombatant } from "../../src/game/battle/sim";

test("effect contract: fasi complete e handler ordinati", () => {
  assert.deepEqual(EFFECT_PHASE_ORDER, ["preMove", "damage", "postMove", "switch", "ko", "endTurn"]);
  const indexes = EFFECT_HANDLERS.map((handler) => EFFECT_PHASE_ORDER.indexOf(handler.phase));
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
  assert.equal(new Set(EFFECT_HANDLERS.map((handler) => handler.id)).size, EFFECT_HANDLERS.length);
  assert.deepEqual(new Set(EFFECT_HANDLERS.map((handler) => handler.phase)), new Set(EFFECT_PHASE_ORDER));
});

test("pre-move: INDAGATO precede GAFFE e non ne consuma i turni", () => {
  const combatant = makeCombatant(createMonster("giorgetta", 10));
  combatant.mon.status = "indagato";
  combatant.gaffeTurns = 2;
  const result = resolvePreMove(combatant, () => 0);
  assert.deepEqual(result, { canAct: false, gaffeTurns: 2, event: "indagato", selfDamage: 0 });
});

test("pre-move: GAFFE termina prima di valutare l'autodanno", () => {
  const combatant = makeCombatant(createMonster("giorgetta", 10));
  combatant.gaffeTurns = 1;
  assert.deepEqual(resolvePreMove(combatant, () => 0), { canAct: true, gaffeTurns: 0, event: "gaffeEnd", selfDamage: 0 });
});

test("boss Futuro: sotto metà PV resetta solo i malus e dà VEL +1 una volta", () => {
  const combatant = makeCombatant(createMonster("generorso", 50));
  combatant.mon.hp = Math.floor(combatant.mon.hp / 2);
  combatant.stages = { atk: -2, def: 2, spc: -6, spd: -1 };
  const phase = resolveFuturoPhase(combatant, false);
  assert.equal(phase.triggered, true);
  assert.deepEqual(phase.stages, { atk: 0, def: 2, spc: 0, spd: 1 });
  assert.equal(resolveFuturoPhase(combatant, true).triggered, false);
});

test("immunità condivise: abilità e hold hanno motivazione esplicita", () => {
  const teflon = createMonster("contemorfo", 30);
  assert.equal(statusBlockReason(teflon, "scandalo"), "teflon");
  const camera = createMonster("giorgetta", 10); camera.heldItem = "telecamera";
  assert.equal(statusBlockReason(camera, "gaffe"), "telecamera");
  assert.equal(statusBlockReason(camera, "scandalo"), null);
  const poltrona = createMonster("tajanide", 30);
  assert.equal(statDropBlockReason(poltrona), "poltrona");
});

test("fine turno: SCANDALO precede cure e CAFFETTIERA è opzionale PvE", () => {
  const mon = createMonster("conteblob", 30);
  mon.status = "scandalo"; mon.heldItem = "caffettiera";
  const combatant = makeCombatant(mon);
  const shared = resolveEndTurn(combatant, false);
  const pve = resolveEndTurn(combatant, true);
  assert.equal(shared[0].id, "scandalo");
  assert.equal(pve.at(-1)?.id, "caffettiera");
  assert.equal(shared.some((effect) => effect.id === "caffettiera"), false);
});
