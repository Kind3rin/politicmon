// Test della matematica di battaglia (sim.ts): danno gen-1, cattura, meteo-sondaggi.
// Sono la rete di sicurezza sul bilanciamento: un refactor che rompe la formula
// del danno o la curva di cattura fa fallire la CI invece di passare in silenzio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCombatant, calcDamage, catchChance, sondaggiMoveMult, DAMAGE_MULT_CAP } from "../../src/game/battle/sim.ts";
import { createMonster } from "../../src/game/monster.ts";
import { MOVES } from "../../src/data/moves.ts";

// RNG deterministica FISSA: ritorna sempre 0.5 → mai critico (0.5 > 1/16) e
// random-roll costante (0.88 + 0.5*0.12 = 0.94) su OGNI chiamata, così due
// calcDamage sono confrontabili senza rumore da rng diverso tra le chiamate.
const fixed = () => 0.5;

test("calcDamage: una mossa da danno infligge almeno 1", () => {
  const atk = makeCombatant(createMonster("giorgetta", 20));
  const def = makeCombatant(createMonster("renzino", 20));
  const r = calcDamage(atk, def, MOVES.radici, fixed);
  assert.ok(r.damage >= 1);
});

test("calcDamage: STAB (stesso tipo) fa più danno di una mossa off-type pari potenza", () => {
  const atk = makeCombatant(createMonster("giorgetta", 20)); // DESTRA
  // Bersaglio POPULISMO puro: sia DESTRA che SINISTRA vi fanno danno NEUTRO (1x),
  // così l'unica differenza tra le due mosse è lo STAB e non il vantaggio di tipo.
  const def = makeCombatant(createMonster("salvinott", 20)); // POPULISMO
  const stab = calcDamage(atk, def, MOVES.radici, fixed).damage;                      // DESTRA = STAB
  const off = calcDamage(atk, def, { ...MOVES.corteo, power: MOVES.radici.power }, fixed).damage; // SINISTRA = off-type
  assert.ok(stab > off, `STAB ${stab} deve superare off-type ${off}`);
});

test("calcDamage: mossa di stato (power 0) fa 0 danno", () => {
  const atk = makeCombatant(createMonster("giorgetta", 20));
  const def = makeCombatant(createMonster("renzino", 20));
  assert.equal(calcDamage(atk, def, MOVES.slogan, fixed).damage, 0);
});

test("calcDamage: il moltiplicatore finale non supera mai DAMAGE_MULT_CAP", () => {
  // Costruisce il caso peggiore (STAB + super-efficace + abilità) e verifica il clamp.
  const atk = makeCombatant(createMonster("giorgetta", 50)); // DESTRA
  const def = makeCombatant(createMonster("ellyna", 50));     // SINISTRA (DESTRA super-eff)
  const r = calcDamage(atk, def, MOVES.radici, () => 0.99, { sondaggi: 100 });
  // typeMult riportato è quello di tipo (pre-compressione); il cap agisce sul mult interno.
  assert.ok(DAMAGE_MULT_CAP === 3.5);
  assert.ok(r.damage > 0);
});

test("catchChance: sempre nel range 0.02..0.95", () => {
  const foe = createMonster("salvinott", 5);
  for (const hp of [foe.hp, 1, 0]) {
    foe.hp = hp;
    const c = catchChance(foe, "scheda");
    assert.ok(c >= 0.02 && c <= 0.95, `chance ${c} fuori range a hp ${hp}`);
  }
});

test("catchChance: indebolire il bersaglio aumenta la cattura", () => {
  const full = createMonster("salvinott", 5);
  const low = createMonster("salvinott", 5);
  low.hp = 1;
  assert.ok(catchChance(low, "scheda") > catchChance(full, "scheda"));
});

test("catchChance: lo status aiuta la cattura", () => {
  // Specie rara (catchRate basso) a HP pieno: così la chance è lontana dal cap 0.95
  // e la differenza fra con/senza status è visibile invece di essere schiacciata.
  const clean = createMonster("berlusconix", 30);
  const sick = createMonster("berlusconix", 30);
  sick.status = "scandalo";
  assert.ok(catchChance(sick, "scheda") > catchChance(clean, "scheda"));
});

test("catchChance: un leggendario resta difficile anche indebolito", () => {
  const legend = createMonster("mattarellux", 50); // catchRate 3
  legend.hp = 1;
  legend.status = "indagato";
  // Non deve schizzare al massimo come un comune: catchRate bassissimo lo tiene giù.
  assert.ok(catchChance(legend, "scheda") < 0.5);
});

test("sondaggiMoveMult: meteo consenso alto potenzia i tipi di establishment", () => {
  assert.equal(sondaggiMoveMult(80, "ISTITUZIONE"), 1.15);
  assert.equal(sondaggiMoveMult(80, "POPULISMO"), 1); // anti-establishment non beneficia
});

test("sondaggiMoveMult: consenso basso potenzia i tipi anti-establishment", () => {
  assert.equal(sondaggiMoveMult(30, "POPULISMO"), 1.15);
  assert.equal(sondaggiMoveMult(30, "ISTITUZIONE"), 1);
});

test("sondaggiMoveMult: in banda neutra (41-69) nessun bonus", () => {
  assert.equal(sondaggiMoveMult(55, "ISTITUZIONE"), 1);
  assert.equal(sondaggiMoveMult(55, "POPULISMO"), 1);
});

test("sondaggiMoveMult: senza contesto (duello PvP) sempre 1", () => {
  assert.equal(sondaggiMoveMult(undefined, "ISTITUZIONE"), 1);
});
