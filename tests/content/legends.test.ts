import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { TILES } from "../../src/art/tiles.ts";
import { ITEMS } from "../../src/data/items.ts";
import { MAPS } from "../../src/data/maps.ts";
import { QUESTS } from "../../src/data/quests.ts";
import { SPECIES } from "../../src/data/species.ts";
import { AREA_EVENTS, chooseLegendEvent } from "../../src/game/battle/fieldEvents.ts";
import { RITES, RELIC_IDS, riteProgress, syncRites } from "../../src/game/legends.ts";
import { newGameState } from "../../src/game/state.ts";

const allNpcs = Object.values(MAPS).flatMap(map => map.npcs.map(npc => ({ map: map.id, npc })));

test("each legend has a rite, a door, a sacrario with the legend in it, and a relic that exists with its icon", () => {
  assert.equal(RITES.length, 4);
  for (const rite of RITES) {
    assert.ok(SPECIES[rite.speciesId], `${rite.id}: species`);
    assert.ok(ITEMS[rite.relic] && ITEMS[rite.relic].kind === "key", `${rite.id}: relic item`);
    assert.ok(existsSync(`public/sprites/items/${rite.relic}.png`), `${rite.id}: relic icon`);
    const room = MAPS[rite.sacrario];
    assert.ok(room && room.outdoor === false, `${rite.id}: sacrario is an interior`);
    const legend = room.npcs.find(npc => npc.legendary?.speciesId === rite.speciesId);
    assert.ok(legend, `${rite.id}: the legend waits in its sacrario`);
    assert.equal(legend!.legendary!.flag, rite.goneFlag);
    assert.equal(legend!.legendary!.relic, rite.relic);
    const door = Object.values(MAPS).flatMap(map => map.warps.map(warp => ({ map: map.id, warp }))).find(entry => entry.warp.requiresFlag === rite.openFlag);
    assert.ok(door && door.warp.toMap === rite.sacrario, `${rite.id}: a door opened by ${rite.openFlag} leads there`);
    assert.ok(door!.warp.lockedLines && door!.warp.lockedLines.length >= 2, `${rite.id}: the locked door explains itself`);
    assert.ok(room.warps.every(warp => warp.toMap === door!.map), `${rite.id}: the room leads back to the door's map`);
    assert.ok(AREA_EVENTS.some(event => event.id === rite.field) && chooseLegendEvent(rite.speciesId)?.id === rite.field, `${rite.id}: fights under its own rule`);
  }
  assert.equal(new Set(RELIC_IDS).size, 4);
});

test("legends are not in the grass and stand nowhere but in their sacrario", () => {
  const legends = new Set(RITES.map(rite => rite.speciesId));
  for (const map of Object.values(MAPS)) for (const entry of map.encounters ?? []) assert.ok(!legends.has(entry.speciesId), `${map.id} still spawns ${entry.speciesId}`);
  const homes = allNpcs.filter(({ npc }) => npc.legendary && legends.has(npc.legendary.speciesId) && !npc.showIfFlag?.startsWith("berlu-encore"));
  for (const { map, npc } of homes) assert.ok(RITES.some(rite => rite.sacrario === map && rite.speciesId === npc.legendary!.speciesId), `${npc.id} stands in ${map}`);
});

test("every step of a rite can be completed in the world", () => {
  const flagSteps = new Set<string>();
  const setFlags = new Set(allNpcs.map(({ npc }) => npc.setFlag).filter((flag): flag is string => Boolean(flag)));
  for (const rite of RITES) for (const step of rite.steps) {
    const fresh = newGameState();
    assert.equal(step.done(fresh), false, `${rite.id}/${step.id} starts undone`);
    const viaTalk = [...setFlags].filter(flag => { const s = newGameState(); s.flags[flag] = true; return step.done(s); });
    if (viaTalk.length) flagSteps.add(`${rite.id}/${step.id}`);
  }
  assert.deepEqual([...flagSteps].sort(), ["berlusconix/fan", "berlusconix/retroscena", "bunkerput/medico", "draghimon/sherpa", "mattarellux/garante"]);
  // The other steps ride on the civic system, the morale menu, a trainer and the trust gauge.
  const state = newGameState();
  state.morale.decisions = ["remix", "remix:hook", "sportello", "sportello:pledge", "citofono", "citofono:consent"];
  state.morale.promises = [{ id: "bus", status: "kept", dueAt: 3 }];
  state.morale.trust = 70; state.defeatedTrainers = ["bunkerista"];
  state.morale.decisions.push("cantiere", "pompa", "bus");
  const done = new Set(RITES.flatMap(rite => rite.steps.filter(step => step.done(state)).map(step => `${rite.id}/${step.id}`)));
  for (const id of ["berlusconix/ritornello", "draghimon/sportello", "draghimon/promessa", "mattarellux/fiducia", "mattarellux/dossier", "bunkerput/bunkerista", "bunkerput/citofono"]) assert.ok(done.has(id), `${id} completes`);
});

test("a door opens only when the prerequisite and all three steps are done, once", () => {
  const state = newGameState();
  state.flags["leg-berlusconix-fan"] = true; state.flags["leg-berlusconix-retro"] = true; state.morale.decisions = ["remix", "remix:answer"];
  assert.deepEqual(syncRites(state), [], "Sua Emittenza still stands");
  state.flags["legend-berlusconix-ready"] = true;
  assert.deepEqual(syncRites(state).map(rite => rite.id), ["berlusconix"]);
  assert.equal(state.flags["rito-berlusconix-open"], true);
  assert.deepEqual(syncRites(state), [], "announced once");
  const progress = riteProgress(state, RITES[0]);
  assert.equal(progress.doneCount, 3); assert.equal(progress.open, true);
});

test("the rites are listed among the optional missions with their steps", () => {
  const ids = QUESTS.filter(quest => quest.id.startsWith("leggenda-"));
  assert.equal(ids.length, 4);
  for (const quest of ids) { assert.equal(quest.side, true); assert.equal(quest.progress!(newGameState()).length, 3); }
});

test("in every sacrario you can walk from the door to the legend, the keeper and the sign", () => {
  for (const rite of RITES) {
    const room = MAPS[rite.sacrario], at = (x: number, y: number) => { const tile = TILES[room.tiles[y]?.[x] ?? ""]; return Boolean(tile && !tile.solid && !tile.water); };
    for (const npc of room.npcs) assert.ok(at(npc.x, npc.y), `${npc.id} stands on open ground`);
    const blocked = new Set(room.npcs.map(npc => `${npc.x},${npc.y}`)), seen = new Set<string>(), queue: [number, number][] = [[5, 6]];
    seen.add("5,6");
    while (queue.length) { const [x, y] = queue.shift()!; for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const nx = x + dx, ny = y + dy, key = `${nx},${ny}`; if (!seen.has(key) && !blocked.has(key) && at(nx, ny)) { seen.add(key); queue.push([nx, ny]); } } }
    for (const npc of room.npcs) assert.ok([[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => seen.has(`${npc.x + dx},${npc.y + dy}`)), `${npc.id} can be talked to`);
    for (const sign of room.signs) assert.ok([[0, 1], [0, -1], [-1, 0], [1, 0]].some(([dx, dy]) => seen.has(`${sign.x + dx},${sign.y + dy}`)), `sign at ${sign.x},${sign.y} can be read`);
    assert.ok(seen.has("5,7") && seen.has("6,7"), "the way out is walkable");
  }
});
