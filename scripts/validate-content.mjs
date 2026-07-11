import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ABILITIES } from "../src/data/abilities.ts";
import { ITEMS } from "../src/data/items.ts";
import { MAPS } from "../src/data/maps.ts";
import { MEME_EVENTS } from "../src/data/memeevents.ts";
import { MOVES } from "../src/data/moves.ts";
import { TYPE_COLORS } from "../src/data/poltypes.ts";
import { QUESTS } from "../src/data/quests.ts";
import { SPECIES } from "../src/data/species.ts";
import { STREET_EVENTS } from "../src/data/streetevents.ts";
import { TRAINERS } from "../src/data/trainers.ts";
import { TILES } from "../src/art/tiles.ts";

const errors = [];
const fail = (scope, message) => errors.push(`${scope}: ${message}`);
const inBounds = (map, x, y) => Number.isInteger(x) && Number.isInteger(y) && y >= 0 && y < map.tiles.length && x >= 0 && x < map.tiles[y].length;
const tileAt = (map, x, y) => map.tiles[y]?.[x] ?? "";

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}

function validateRegistry(name, registry) {
  for (const [key, value] of Object.entries(registry)) {
    if (!value || value.id !== key) fail(name, `chiave ${key} non coincide con id ${value?.id ?? "mancante"}`);
  }
}

for (const [name, registry] of Object.entries({ SPECIES, MOVES, ITEMS, ABILITIES, TRAINERS, MAPS })) validateRegistry(name, registry);

const types = new Set(Object.keys(TYPE_COLORS));
for (const species of Object.values(SPECIES)) {
  const scope = `species ${species.id}`;
  if (species.name.length > 18) fail(scope, `nome oltre budget single-line 18: ${species.name.length}`);
  if (!species.types.length || species.types.some((type) => !types.has(type))) fail(scope, "tipo inesistente o lista vuota");
  if (!species.learnset.length) fail(scope, "learnset vuoto");
  const learned = new Set();
  let lastLevel = 0;
  for (const [level, moveId] of species.learnset) {
    if (!MOVES[moveId]) fail(scope, `mossa learnset inesistente ${moveId}`);
    if (!Number.isInteger(level) || level < 1 || level < lastLevel) fail(scope, `livello learnset non valido/non ordinato ${level}`);
    if (learned.has(moveId)) fail(scope, `mossa duplicata nel learnset ${moveId}`);
    learned.add(moveId); lastLevel = level;
  }
  if (species.ability && !ABILITIES[species.ability]) fail(scope, `abilità inesistente ${species.ability}`);
  for (const evolution of species.evolutions ?? []) if (!SPECIES[evolution.id]) fail(scope, `evoluzione inesistente ${evolution.id}`);
  const spritePath = resolve("public", "sprites", "monsters", `${species.id}.png`);
  if (!existsSync(spritePath)) fail(scope, `sprite PNG mancante ${spritePath}`);
  else {
    const png = readFileSync(spritePath);
    if (png.length < 24 || png.toString("hex", 1, 4) !== "504e47") fail(scope, "sprite non è un PNG valido");
    else if (png.readUInt32BE(16) === 0 || png.readUInt32BE(20) === 0) fail(scope, "sprite PNG con dimensioni zero");
  }
}

for (const move of Object.values(MOVES)) {
  const scope = `move ${move.id}`;
  if (move.name.length > 23) fail(scope, `nome oltre budget single-line 23: ${move.name.length}`);
  if (!types.has(move.type)) fail(scope, `tipo inesistente ${move.type}`);
  if (!Number.isFinite(move.power) || move.power < 0) fail(scope, `power invalido ${move.power}`);
  if (!Number.isFinite(move.accuracy) || move.accuracy < 0 || move.accuracy > 100) fail(scope, `accuracy invalida ${move.accuracy}`);
  if (!Number.isInteger(move.pp) || move.pp < 1) fail(scope, `PP invalidi ${move.pp}`);
}
for (const item of Object.values(ITEMS)) {
  if (item.name.length > 24) fail(`item ${item.id}`, `nome oltre budget single-line 24: ${item.name.length}`);
  if (item.moveId && !MOVES[item.moveId]) fail(`item ${item.id}`, `mossa inesistente ${item.moveId}`);
}

for (const trainer of Object.values(TRAINERS)) {
  const scope = `trainer ${trainer.id}`;
  if (!trainer.team.length) fail(scope, "team vuoto non consentito nel registry fisso");
  for (const [speciesId, level, moves, heldItem] of trainer.team) {
    if (!SPECIES[speciesId]) fail(scope, `specie inesistente ${speciesId}`);
    if (!Number.isInteger(level) || level < 1 || level > 60) fail(scope, `livello invalido ${level}`);
    for (const moveId of moves ?? []) if (!MOVES[moveId]) fail(scope, `mossa inesistente ${moveId}`);
    if (heldItem && ITEMS[heldItem]?.kind !== "hold") fail(scope, `hold item inesistente/non hold ${heldItem}`);
  }
  if (trainer.reward && !ITEMS[trainer.reward.itemId]) fail(scope, `reward inesistente ${trainer.reward.itemId}`);
}

const globalPickupIds = new Set();
for (const map of Object.values(MAPS)) {
  const scope = `map ${map.id}`;
  if (!map.tiles.length || !map.tiles[0].length) { fail(scope, "tilemap vuota"); continue; }
  const width = map.tiles[0].length;
  map.tiles.forEach((row, y) => {
    if (row.length !== width) fail(scope, `riga ${y} larga ${row.length}, atteso ${width}`);
    [...row].forEach((char, x) => { if (!TILES[char]) fail(scope, `tile '${char}' inesistente @${x},${y}`); });
  });
  const localNpcIds = new Set();
  for (const npc of map.npcs) {
    if (localNpcIds.has(npc.id)) fail(scope, `NPC id duplicato ${npc.id}`); localNpcIds.add(npc.id);
    if (!inBounds(map, npc.x, npc.y)) fail(scope, `NPC ${npc.id} fuori mappa @${npc.x},${npc.y}`);
    if (npc.trainerId && !TRAINERS[npc.trainerId] && !npc.trainerId.startsWith("rival-")) fail(scope, `NPC ${npc.id}: trainer inesistente ${npc.trainerId}`);
    if (npc.gift && !ITEMS[npc.gift.itemId]) fail(scope, `NPC ${npc.id}: gift inesistente ${npc.gift.itemId}`);
    if (npc.legendary && !SPECIES[npc.legendary.speciesId]) fail(scope, `NPC ${npc.id}: leggendario inesistente ${npc.legendary.speciesId}`);
  }
  for (const pickup of map.pickups) {
    if (globalPickupIds.has(pickup.id)) fail(scope, `pickup id globale duplicato ${pickup.id}`); globalPickupIds.add(pickup.id);
    if (!inBounds(map, pickup.x, pickup.y)) fail(scope, `pickup ${pickup.id} fuori mappa`);
    if (!ITEMS[pickup.itemId]) fail(scope, `pickup ${pickup.id}: item inesistente ${pickup.itemId}`);
  }
  for (const warp of map.warps) {
    const target = MAPS[warp.toMap];
    if (!inBounds(map, warp.x, warp.y)) fail(scope, `warp fuori mappa @${warp.x},${warp.y}`);
    if (!target) fail(scope, `warp verso mappa inesistente ${warp.toMap}`);
    else if (!inBounds(target, warp.toX, warp.toY)) fail(scope, `warp ${warp.toMap}: target fuori mappa @${warp.toX},${warp.toY}`);
  }
  for (const edge of Object.values(map.edges ?? {})) if (edge && !MAPS[edge.toMap]) fail(scope, `edge verso mappa inesistente ${edge.toMap}`);
}

const questIds = new Set();
for (const quest of QUESTS) {
  const scope = `quest ${quest.id}`;
  if (questIds.has(quest.id)) fail(scope, "id duplicato"); questIds.add(quest.id);
  if (quest.title.length > 28) fail(scope, `titolo oltre budget single-line 28: ${quest.title.length}`);
  if (quest.target) {
    const map = MAPS[quest.target.mapId];
    if (!map) fail(scope, `target map inesistente ${quest.target.mapId}`);
    else if (!inBounds(map, quest.target.x, quest.target.y)) fail(scope, `target fuori mappa @${quest.target.x},${quest.target.y}`);
  }
}
const questSource = readFileSync(resolve("src/data/quests.ts"), "utf8");
const questFlags = [...questSource.matchAll(/s\.flags\["([^"]+)"\]/g)].map((match) => match[1]);
const nonQuestSource = sourceFiles(resolve("src")).filter((path) => !path.endsWith("quests.ts"))
  .map((path) => readFileSync(path, "utf8")).join("\n");
for (const flag of new Set(questFlags)) {
  if (!nonQuestSource.includes(`"${flag}"`)) fail("QUESTS", `flag di completamento senza producer noto: ${flag}`);
}

const streetIds = new Set();
for (const event of STREET_EVENTS) {
  if (streetIds.has(event.id)) fail(`streetEvent ${event.id}`, "id duplicato"); streetIds.add(event.id);
  if (!event.lines.length) fail(`streetEvent ${event.id}`, "testo vuoto");
  if (!event.sondaggi && !event.money) fail(`streetEvent ${event.id}`, "nessun effetto");
}
const memeIds = new Set();
for (const event of MEME_EVENTS) {
  const scope = `memeEvent ${event.id}`;
  if (memeIds.has(event.id)) fail(scope, "id duplicato"); memeIds.add(event.id);
  if (!event.source.label || !event.source.url.startsWith("https://")) fail(scope, "fonte HTTPS obbligatoria");
  if (event.choices.length !== 2) fail(scope, "servono esattamente due scelte");
  for (const choice of event.choices) if (!choice.label || !choice.lines.length || !choice.effects.length) fail(scope, "scelta senza label, testo o effetto");
  for (const choice of event.choices) for (const effect of choice.effects) {
    if (effect.kind === "item" && (!ITEMS[effect.id] || !Number.isInteger(effect.qty) || effect.qty < 1)) fail(scope, `effetto item invalido ${effect.id}`);
    if (effect.kind === "flag" && !effect.id) fail(scope, "effetto flag senza id");
    if ((effect.kind === "money" || effect.kind === "sondaggi" || effect.kind === "territory") && !Number.isFinite(effect.delta)) fail(scope, `delta ${effect.kind} invalido`);
  }
  if (event.active && (!(Date.parse(event.active.from) < Date.parse(event.active.until)))) fail(scope, "finestra active non valida");
}

if (errors.length) {
  console.error(`CONTENT VALIDATION FAILED (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`OK — contenuti validi: ${Object.keys(SPECIES).length} specie, ${Object.keys(MOVES).length} mosse, ${Object.keys(TRAINERS).length} trainer, ${Object.keys(MAPS).length} mappe, ${QUESTS.length} quest, ${MEME_EVENTS.length} meme event.`);
}
