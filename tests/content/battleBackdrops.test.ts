import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAPS } from "../../src/data/maps";
import { BATTLE_BACKDROPS, battleBackdropForMap, battleBackdropId } from "../../src/game/battle/backdrop";

test("gli incontri mantengono l'ambiente della mappa, inclusi interni e postgame", () => {
  const cases = {
    borgo: "piazza", route1: "prato", route2: "lago", route3: "cava", eurotown: "viale", capitale: "foro", mediopoli: "tv",
    grotta1: "grotta", grotta2: "grotta", "oblast-meme": "neve",
    gymtv: "studio", gymue: "palestra", gymglobal: "palestra",
    "bar-borgo": "bar", home: "casa", market1: "mercato", casino: "casino", lab: "laboratorio", bunker: "bunker",
    regia: "studio", commissione: "ufficio",
    palazzo: "palazzo", colle: "palazzo",
    stretto: "costa", offshore: "costa", "bar-stretto": "costa",
    futuro_sede: "rete", district_isole: "costa", palazzo_feed: "rete",
    palazzo_talkshow: "studio", palazzo_feed_terrazza: "piazza"
  };
  for (const [mapId, id] of Object.entries(cases)) {
    assert.ok(MAPS[mapId], `mappa mancante: ${mapId}`);
    assert.equal(battleBackdropId(mapId), id, mapId);
  }
  assert.equal(battleBackdropId("mappa-futura-sconosciuta"), "prato");
  assert.equal(battleBackdropId("__proto__"), "prato");
  for (const mapId of Object.keys(MAPS)) assert.ok(battleBackdropForMap(mapId));
});

test("gli sfondi hanno chiavi distinte, PNG nativi e un peso adatto all'offline mobile", () => {
  const ids = new Set<string>();
  let generatedBytes = 0;
  for (const [id, backdrop] of Object.entries(BATTLE_BACKDROPS)) {
    assert.ok(!ids.has(backdrop.spriteId), `chiave registry duplicata: ${id}`);
    ids.add(backdrop.spriteId);
    const png = readFileSync(new URL(`../../public/sprites/${backdrop.path}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", id);
    if (id === "prato") continue;
    assert.equal(png.readUInt32BE(16), 240, id);
    assert.equal(png.readUInt32BE(20), 136, id);
    generatedBytes += png.length;
  }
  // Nove interni a 16 KB l'uno portano il set a 344 KB: il limite cresce di proposito, non per tollerare un errore.
  assert.ok(generatedBytes < 360_000, `${generatedBytes} byte di nuovi sfondi`);
});


test("il fondale verticale della slice è nativo e resta leggero per il precache", () => {
  const png = readFileSync(new URL("../../public/sprites/ui/battle/prato-portrait.png", import.meta.url));
  assert.equal(png.readUInt32BE(16), 240); assert.equal(png.readUInt32BE(20), 360);
  assert.ok(png.length < 60000);
  const stage = readFileSync(new URL("../../public/sprites/ui/evolution-portrait.png", import.meta.url));
  assert.equal(stage.readUInt32BE(16), 480); assert.equal(stage.readUInt32BE(20), 720);
  assert.ok(stage.length < 150000);
  const starter = readFileSync(new URL("../../public/sprites/ui/starter-stage.png", import.meta.url));
  assert.equal(starter.readUInt32BE(16), 240); assert.equal(starter.readUInt32BE(20), 360);
  assert.ok(starter.length < 60000);
});
