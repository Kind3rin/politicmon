import assert from "node:assert/strict";
import test from "node:test";
import { FUEL_MAX, FUEL_START, RIDE_STEPS_PER_LITRE, TRIP_LITRES, buyFuel, clampFuel, eur, fuelPrice, fuelQuote, priceLine, ridesOnFuel } from "../../src/game/fuel.ts";
import { newGameState, parseGameState } from "../../src/game/state.ts";
import { TransportScene } from "../../src/scenes/TransportScene.ts";
import { SceneStack } from "../../src/engine/scene.ts";

test("the price is the same for everyone on a day, moves from day to day, and stays in a believable band", () => {
  assert.equal(fuelPrice("2026-10-05", "borgo"), fuelPrice("2026-10-05", "borgo"));
  const prices = new Set<number>();
  for (let day = 1; day <= 28; day += 1) for (const map of ["borgo", "route1", "mediopoli", "eurotown"]) {
    const cents = fuelPrice(`2026-10-${String(day).padStart(2, "0")}`, map);
    assert.ok(cents >= 160 && cents <= 295, `price ${cents}`);
    prices.add(cents);
  }
  assert.ok(prices.size > 20, "it really varies");
  assert.equal(eur(231), "2,31 €");
  assert.notEqual(priceLine(150), priceLine(280));
});

test("a quote is limited by the room in the tank and by the money, and a purchase is exact", () => {
  const state = newGameState();
  state.fuel = 30; state.money = 1000;
  assert.equal(fuelQuote(state, FUEL_MAX, 200).litres, 10, "only ten litres of room");
  assert.equal(fuelQuote(state, 5, 200).total, 10);
  state.money = 7;
  assert.equal(fuelQuote(state, 10, 200).litres, 3, "three litres is all 7 € buys at 2 €/L");
  state.money = 0;
  assert.equal(fuelQuote(state, 10, 200).litres, 0);
  state.money = 100; state.fuel = 10;
  const quote = fuelQuote(state, 10, 200);
  assert.equal(buyFuel(state, quote), true);
  assert.deepEqual([state.fuel, state.money], [20, 80]);
  assert.equal(buyFuel(state, { litres: 30, cents: 100, total: 30 }), false, "never over the tank");
  assert.equal(buyFuel(state, { litres: 5, cents: 100, total: 999 }), false, "never on credit");
  assert.deepEqual([state.fuel, state.money], [20, 80]);
});

test("new games start with a tank, old saves get one, and a broken value is repaired", () => {
  const fresh = newGameState();
  assert.equal(fresh.fuel, FUEL_START);
  const text = JSON.stringify(fresh);
  const legacy = JSON.parse(text); delete legacy.fuel;
  assert.equal(parseGameState(JSON.stringify(legacy))?.fuel, FUEL_START);
  for (const [raw, expected] of [[7, 7], [999, FUEL_MAX], [-4, 0], ["x", FUEL_START], [null, FUEL_START]] as const) {
    assert.equal(parseGameState(JSON.stringify({ ...fresh, fuel: raw }))?.fuel, expected);
    assert.equal(clampFuel(raw), expected);
  }
  assert.ok(ridesOnFuel("monopattino") && ridesOnFuel("auto") && !ridesOnFuel("ruspa") && !ridesOnFuel("traghetto") && !ridesOnFuel(null));
  assert.ok(RIDE_STEPS_PER_LITRE > 5 && TRIP_LITRES < FUEL_MAX);
});

test("the blue car burns litres: it refuses with a dry tank and charges the trip when it leaves", () => {
  for (const [fuel, goes] of [[TRIP_LITRES - 1, false], [TRIP_LITRES, true], [FUEL_MAX, true]] as const) {
    const state = newGameState();
    state.flags["dex-received"] = true; state.badges = ["auditel"]; state.fuel = fuel;
    const stack = new SceneStack(), input = { reset() {} } as never; let traveled = 0;
    stack.push({ update() {}, draw() {} });
    const scene = new TransportScene(stack, input, state, "borgo", () => { traveled += 1; });
    stack.push(scene);
    const panel = scene.uiPanel;
    const destination = panel.actions.find(action => /mediopoli/i.test(action.label))!;
    assert.equal(Boolean(destination.disabled), !goes, `row ${fuel} L`);
    destination.run();
    const confirm = scene.uiPanel.actions[0];
    if (goes) { confirm.run(); assert.equal(traveled, 1); assert.equal(state.fuel, fuel - TRIP_LITRES); }
    else { assert.equal(scene.uiPanel.title, "Auto blu", "stays on the list"); assert.equal(traveled, 0); assert.equal(state.fuel, fuel); }
  }
});
