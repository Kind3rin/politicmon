import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps";

const EXPECTED_MAP_IDS = [
  "attico", "bar-borgo", "bar-bruxelles", "bar-cap", "bar-euro", "bar-medio",
  "bar-offshore", "bar-stretto", "bistrot", "borgo", "bruxelles", "campo_largo", "capitale",
  "casino", "chiosco", "circolo", "colle", "commissione", "covo",
  "diplomacy_autonomy", "diplomacy_home", "diplomacy_lobby", "diplomacy_loyalty", "diplomacy_terrace",
  "district_centro", "district_feed", "district_isole", "district_nord", "district_sud",
  "eurotown",
  "futuro_piazza", "futuro_rebrand", "futuro_scissione", "futuro_sede", "futuro_tesoreria",
  "genova_techno", "grotta1", "grotta2", "gymglobal", "gymtv", "gymue", "home", "lab",
  "lobbystudio", "market1", "market2", "mediopoli", "oblast-meme", "offshore",
  "palazzo", "palazzo_algoritmo", "palazzo_factcheck", "palazzo_feed", "palazzo_feed_studio", "palazzo_feed_terrazza",
  "palazzo_silenzio", "palazzo_talkshow", "redazione", "retropalco_campo", "retroscena", "route1", "route2", "route3", "salotto",
  "stretto", "tour_feed"
];

test("registry mappe: conserva le 40 mappe baseline e le 26 mappe Atto 3 approvate", () => {
  assert.deepEqual(Object.keys(MAPS).sort(), EXPECTED_MAP_IDS);
});

test("registry mappe: chiave, id e riferimenti warp restano coerenti", () => {
  for (const [id, map] of Object.entries(MAPS)) {
    assert.equal(map.id, id);
    for (const warp of map.warps) {
      assert.ok(MAPS[warp.toMap], `${id}: warp verso mappa inesistente ${warp.toMap}`);
    }
    for (const edge of Object.values(map.edges ?? {})) {
      if (edge) assert.ok(MAPS[edge.toMap], `${id}: edge verso mappa inesistente ${edge.toMap}`);
    }
  }
});
