import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES } from "../../src/data/species";
import { MOVES } from "../../src/data/moves";
import { MAPS } from "../../src/data/maps";
import { createMonster } from "../../src/game/monster";
import { newGameState, parseGameState } from "../../src/game/state";
import { defensiveMatchups, dexAcquisitionNotes, dexHabitats, dexMatches, evolutionCondition, reachableDexMaps } from "../../src/game/dexGuide";
import { damageRange, fieldTactics, moveTactics, switchPreview } from "../../src/game/battle/tactics";
import { calcDamage, catchChance, makeCombatant } from "../../src/game/battle/sim";

test("temporary GAFFE boosts capture like persistent statuses, without stacking twice", () => {
  const foe = createMonster("giorgetta", 30);
  const base = catchChance(foe, "scheda");
  assert.equal(catchChance(foe, "scheda", 1, true), Math.min(.95, base * 2));
  foe.status = "indagato";
  assert.equal(catchChance(foe, "scheda", 1, true), catchChance(foe, "scheda"));
});

test("tactical inspection does not consume first-hit abilities, holds, PP or random draws", () => {
  const a = makeCombatant(createMonster("mediocrate", 30));
  const d = makeCombatant(createMonster("berlusconix", 30));
  a.mon.heldItem = "invalid-legacy-hold";
  a.stages.atk = 2; d.stages.def = 1;
  const before = JSON.stringify([a, d]);
  const originalRandom = Math.random;
  Math.random = () => { throw new Error("Inspection consumed RNG"); };
  try {
    for (const move of Object.values(MOVES)) {
      damageRange(a, d, move, { sondaggi: 80 }); moveTactics(a, d, move, { sondaggi: 80 });
    }
    fieldTactics(a, d, { sondaggi: 80 });
  } finally { Math.random = originalRandom; }
  assert.equal(JSON.stringify([a, d]), before);
});

test("damage estimate encloses actual noncritical rolls across species, political weather and LODO", () => {
  const ids = Object.keys(SPECIES);
  for (let i = 0; i < ids.length; i++) {
    const a = makeCombatant(createMonster(ids[i], 30));
    const d = makeCombatant(createMonster(ids[(i + 7) % ids.length], 30));
    a.stages.spc = 2; d.stages.def = -1;
    const move = MOVES[a.mon.moves.find((s) => MOVES[s.id].power > 0)!.id];
    for (const sondaggi of [20, 50, 80]) {
      const range = damageRange(a, d, move, { sondaggi });
      for (const roll of [.01, .35, .5, .8, .99]) {
        let calls = 0;
        const actual = calcDamage(structuredClone(a), structuredClone(d), move, () => calls++ === 0 ? .99 : roll, { sondaggi });
        assert.equal(actual.crit, false);
        assert.ok(actual.damage >= range.min && actual.damage <= range.max, `${ids[i]}: ${actual.damage} outside ${JSON.stringify(range)}`);
      }
    }
  }
});

test("status and stat forecasts report immunity and stage caps", () => {
  const a = makeCombatant(createMonster("giorgetta", 20));
  const d = makeCombatant(createMonster("contemorfo", 20));
  assert.match(moveTactics(a, d, MOVES.telepromessa).join(" "), /BLOCCATO DA TEFLON/);
  d.stages.def = -6;
  assert.match(moveTactics(a, d, MOVES.slogan).join(" "), /FACCIA TOSTA \+0/);
  d.gaffeTurns = 3;
  assert.match(moveTactics(d, a, MOVES.comizio).join(" "), /33%/);
});

test("switch inspection applies entry abilities on snapshots without changing the party or live foe", () => {
  const mon=createMonster("futurorso",45), foe=makeCombatant(createMonster("berlusconix",45));
  mon.hp=23;mon.status="scandalo";mon.heldItem="caffettiera";
  foe.stages.atk=4;foe.stages.spd=-2;foe.firstHitTaken=true;foe.gaffeTurns=3;
  const before=JSON.stringify([mon,foe]);
  const preview=switchPreview(mon,foe);
  assert.deepEqual(preview.entrant.stages,{atk:0,def:0,spc:0,spd:0});
  assert.deepEqual(preview.opponent.stages,{atk:0,def:0,spc:0,spd:0});
  assert.equal(preview.opponent.firstHitTaken,true);assert.equal(preview.opponent.gaffeTurns,3);
  assert.equal(preview.entrant.mon.hp,23);assert.equal(preview.entrant.mon.status,"scandalo");
  assert.equal(preview.entrant.mon.heldItem,"caffettiera");
  preview.entrant.mon.moves[0].pp--;
  assert.equal(JSON.stringify([mon,foe]),before);
});

test("switch inspection preserves ordinary opponent stages and includes VOLTAGABBANA speed on entry", () => {
  const mon=createMonster("renzino",30), foe=makeCombatant(createMonster("giorgiagon",30));
  foe.stages.def=3;
  const preview=switchPreview(mon,foe);
  assert.equal(preview.entrant.stages.spd,1);
  assert.equal(preview.opponent.stages.def,3);
  assert.notEqual(preview.opponent.stages,foe.stages);
});

test("field guide exposes accurate branch conditions and incoming type matchups", () => {
  const rules = SPECIES.salvinott.evolutions!;
  assert.match(evolutionCondition(rules[0]), /SONDAGGI DA 50/);
  assert.match(evolutionCondition(rules[1], rules.slice(0, 1)), /SONDAGGI SOTTO 50/);
  assert.match(evolutionCondition(SPECIES.salvinator.evolutions![0]), /TESSERA/);
  assert.equal(defensiveMatchups("giorgetta").length, 8);
  const state = newGameState(); state.browserSeed = 2;
  assert.deepEqual(dexHabitats("contemorfo", state), []);
  assert.match(dexAcquisitionNotes("contemorfo", state).join(" "), /ALTRA VERSIONE.*SCAMBIO ONLINE/);
  assert.match(dexAcquisitionNotes("salvinurlo", state).join(" "), /SONDAGGI SOTTO 50/);
});

test("habitats are restricted to open travel gates and version-adjusted encounter pools", () => {
  const state = newGameState(); state.browserSeed = 2;
  const reachable = reachableDexMaps(state);
  assert.ok(reachable.has("borgo"));
  for (const id of Object.keys(SPECIES)) {
    for (const h of dexHabitats(id, state, reachable)) {
      assert.ok(reachable.has(h.mapId)); assert.ok(h.share > 0 && h.share <= 1);
      assert.ok(MAPS[h.mapId].encounters!.some((e) => e.speciesId === id));
    }
  }
  state.pos.mapId = "campo-largo";
  const off = reachableDexMaps(state, { territories: false, atto3: false });
  const on = reachableDexMaps(state, { territories: true, atto3: true });
  assert.ok([...off].every((id) => on.has(id)));
  state.pos.mapId = "borgo";
  assert.equal(dexMatches("salvinott", "here", state), true);
  assert.equal(dexMatches("contemorfo", "here", state), false);
  state.dex.salvinott = "seen";
  assert.equal(dexMatches("salvinott", "seen", state), true);
  assert.equal(dexMatches("salvinott", "caught", state), false);
  state.dex.salvinott = "caught";
  assert.equal(dexMatches("salvinott", "missing", state), false);
});

test("battle speed migration accepts only supported presentation speeds", () => {
  const legacy = newGameState(); delete (legacy as Partial<typeof legacy>).battleSpeed;
  assert.equal(parseGameState(JSON.stringify(legacy))!.battleSpeed, 1);
  for (const value of [0, -1, "2", 200, null]) assert.equal(parseGameState(JSON.stringify({ ...legacy, battleSpeed: value }))!.battleSpeed, 1);
  assert.equal(parseGameState(JSON.stringify({ ...legacy, battleSpeed: 2 }))!.battleSpeed, 2);
});
