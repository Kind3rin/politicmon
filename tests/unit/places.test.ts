import assert from "node:assert/strict";
import test from "node:test";
import { MAPS } from "../../src/data/maps.ts";
import { compass, mapPlaces, placeName } from "../../src/game/world/places.ts";
import { planOf, planKind } from "../../src/game/world/localPlan.ts";
import { terraceLevels } from "../../src/game/world/terraces.ts";
import { PLAN } from "../../src/ui/kit/plan.ts";

test("Borgo's places are its four doors and the road north, named the way people say them", () => {
  const places = mapPlaces(MAPS.borgo, MAPS);
  assert.deepEqual(places.map(place => place.label).sort(), ["Bar", "Casa tua", "Circolo", "Laboratorio", "Percorso 1"]);
  const lab = places.find(place => place.to === "lab")!;
  assert.equal(lab.x2 - lab.x, 1, "two warps side by side are one door");
  assert.ok(lab.signY < lab.y, "the sign hangs above the roof");
  const road = places.find(place => place.kind === "exit")!;
  assert.equal(road.edge, "north");
  assert.equal(road.y, 0);
  assert.equal(places.find(place => place.to === "bar-borgo")!.detail, "Cura gratis · box squadra");
});

test("every map yields places and a plan without gaps, and every place sits on its own map", () => {
  for (const map of Object.values(MAPS)) {
    const places = mapPlaces(map, MAPS);
    for (const place of places) {
      assert.ok(place.label.length > 0, `${map.id}: a place without a name`);
      assert.ok(place.x >= 0 && place.y >= 0 && place.y < map.tiles.length, `${map.id}: ${place.id} inside the map`);
    }
    const plan = planOf(map, terraceLevels(map), []);
    assert.equal(plan.tiles.length, plan.cols * plan.rows);
    assert.equal(plan.levels.length, plan.tiles.length);
  }
});

test("a door that opens onto a street is a door, a landing on the water is a dock", () => {
  assert.equal(mapPlaces(MAPS.capitale, MAPS).find(place => place.to === "stretto")!.kind, "dock");
  assert.equal(mapPlaces(MAPS.borgo, MAPS).find(place => place.to === "lab")!.kind, "door");
});

test("short names: bars are Bar, long registry names fall back to sentence case", () => {
  assert.equal(placeName("bar-cap"), "Bar");
  assert.equal(placeName("lab"), "Laboratorio");
  assert.equal(placeName("route1"), "Percorso 1");
  assert.equal(placeName("stretto"), "Stretto di messina");
});

test("compass words: where something is from where you stand", () => {
  assert.equal(compass(10, 10, 10, 2), "nord");
  assert.equal(compass(10, 10, 2, 10), "ovest");
  assert.equal(compass(10, 10, 16, 4), "nord-est");
  assert.equal(compass(10, 10, 11, 11), "qui");
});

test("the plan tells terrace faces and stairs from ground", () => {
  assert.equal(planKind("%", true), PLAN.bank);
  assert.equal(planKind("&", true), PLAN.wall);
  assert.equal(planKind("E", true), PLAN.stairs);
  assert.equal(planKind("=", true), PLAN.path);
  assert.equal(planKind("w", true), PLAN.water);
  assert.equal(planKind(".", false), PLAN.floor);
});
