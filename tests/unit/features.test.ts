import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_OVERRIDE_KEY,
  parseFeatureOverrides,
  resolveFeatures,
  runtimeFeatures
} from "../../src/game/features.ts";

test("feature flags: produzione abilita l'intera release", () => {
  const flags = resolveFeatures({ atto3: false, coalition: false, territories: true }, false);
  assert.deepEqual(flags, { atto3: true, coalition: true, territories: true, memeEvents: true, weeklyCampaign: true });
});

test("feature flags: DEV applica override validi rispettando le dipendenze", () => {
  const flags = resolveFeatures({ atto3: true, coalition: true, territories: true }, true);
  assert.equal(flags.atto3, true);
  assert.equal(flags.coalition, true);
  assert.equal(flags.territories, true);
  assert.equal(flags.memeEvents, true);
});

test("feature flags: una dipendenza spenta forza off il consumer", () => {
  const flags = resolveFeatures({ atto3: false, coalition: true, territories: true, weeklyCampaign: true }, true);
  assert.equal(flags.coalition, false);
  assert.equal(flags.territories, false);
  assert.equal(flags.weeklyCampaign, false);
});

test("feature flags: parser scarta JSON corrotto, chiavi ignote e valori non booleani", () => {
  assert.deepEqual(parseFeatureOverrides("{"), {});
  assert.deepEqual(parseFeatureOverrides(JSON.stringify({ atto3: true, intruso: true, coalition: "yes" })), { atto3: true });
});

test("feature flags: storage è letto solo in DEV e gli errori falliscono chiusi", () => {
  const storage = { getItem: (key: string) => key === FEATURE_OVERRIDE_KEY ? JSON.stringify({ atto3: true }) : null };
  assert.equal(runtimeFeatures(true, storage).atto3, true);
  assert.equal(runtimeFeatures(false, storage).atto3, true);
  assert.equal(runtimeFeatures(true, { getItem: () => { throw new Error("denied"); } }).atto3, true);
});
