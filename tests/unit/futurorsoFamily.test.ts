import assert from "node:assert/strict";
import test from "node:test";
import { ITEMS } from "../../src/data/items.ts";
import { SPECIES } from "../../src/data/species.ts";
import { createMonster, itemEvolution, levelEvolution } from "../../src/game/monster.ts";
import { resolveEntryAbility } from "../../src/game/battle/effectContract.ts";
import { applySwitch, makeDuelSim } from "../../src/game/battle/duelsim.ts";
import { makeCombatant } from "../../src/game/battle/sim.ts";
import { sanitizeTurnlog } from "../../src/net/duelproto.ts";

test("FUTURORSO: curva approvata e parità con GENERORSO", () => {
  const future = SPECIES.futurorso;
  const general = SPECIES.generorso;
  const bst = (base: typeof future.base) => Object.values(base).reduce((sum, value) => sum + value, 0);
  assert.equal(bst(future.base), 390);
  assert.ok(Math.abs(bst(future.base) - bst(general.base)) <= 2);
  assert.deepEqual(future.types, ["DESTRA", "CENTRO"]);
  assert.equal(future.ability, "tabularasa");
  assert.equal(ITEMS.tessera_futuro.kind, "evo");
});

test("VANNACCIX: la TESSERA FUTURO sceglie il ramo item senza rompere GENERORSO", () => {
  const mon = createMonster("vannaccix", 20);
  assert.equal(itemEvolution(mon, "tessera_futuro"), "futurorso");
  assert.equal(itemEvolution(mon, "tessera"), undefined);
  assert.equal(levelEvolution(mon, 50), "generorso");
});

test("TABULA RASA: azzera soltanto gli stage di entrambi", () => {
  const future = makeCombatant(createMonster("futurorso", 40));
  const foe = makeCombatant(createMonster("generorso", 40));
  future.stages = { atk: 2, def: -1, spc: 3, spd: -2 };
  foe.stages = { atk: -3, def: 4, spc: -1, spd: 2 };
  future.mon.status = "scandalo";
  const hp = future.mon.hp;
  const result = resolveEntryAbility(future, foe);
  assert.equal(result.triggered, true);
  assert.deepEqual(result.entrantStages, { atk: 0, def: 0, spc: 0, spd: 0 });
  assert.deepEqual(result.opponentStages, { atk: 0, def: 0, spc: 0, spd: 0 });
  assert.equal(future.mon.status, "scandalo");
  assert.equal(future.mon.hp, hp);
});

test("TABULA RASA: switch PvP emette evento autoritativo e resetta entrambi", () => {
  const sim = makeDuelSim(
    [createMonster("generorso", 40), createMonster("futurorso", 40)],
    [createMonster("giorgiagon", 40)]
  );
  sim.host.active.stages.atk = 3;
  sim.guest.active.stages.def = -2;
  const events: Parameters<typeof applySwitch>[3] = [];
  assert.equal(applySwitch(sim, "host", 1, events), true);
  assert.deepEqual(events, [
    { e: "switch", side: "host", index: 1 },
    { e: "stageReset", side: "host" }
  ]);
  assert.deepEqual(sim.host.active.stages, { atk: 0, def: 0, spc: 0, spd: 0 });
  assert.deepEqual(sim.guest.active.stages, { atk: 0, def: 0, spc: 0, spd: 0 });
  assert.deepEqual(sanitizeTurnlog(events), events);
  assert.equal(sanitizeTurnlog([{ e: "stageReset", side: "intruso" }]), null);
});
