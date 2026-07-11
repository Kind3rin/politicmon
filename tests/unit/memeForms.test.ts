import assert from "node:assert/strict";
import test from "node:test";
import { createMonster, sanitizeMon, statsOf } from "../../src/game/monster.ts";
import { MEME_FORMS, currentMemeForms, formsForSpecies, grantSeasonalForm, isFormAvailable } from "../../src/game/memeForms.ts";

test("P6-T04: catalogo forme non crea specie Dex e dichiara stagione/provenienza", () => {
  for (const form of Object.values(MEME_FORMS)) {
    assert.ok(form.availableFrom <= form.availableTo);
    assert.ok(form.provenance.length >= 12);
    assert.match(form.sourceId, /^weekly:/);
    assert.ok(form.statPercent > 0 && form.statPercent <= 5);
  }
});

test("P6-T04: disponibilità stagionale è deterministica e la forma ottenuta resta", () => {
  const summer = MEME_FORMS.salvinator_spiaggia;
  assert.equal(isFormAvailable(summer, new Date(2026, 6, 11)), true);
  assert.equal(isFormAvailable(summer, new Date(2027, 0, 11)), false);
  assert.deepEqual(currentMemeForms(new Date(2026, 6, 11)).map((form) => form.id), [summer.id]);
  assert.equal(formsForSpecies("salvinator", [summer.id])[0]?.id, summer.id);
});

test("P6-T04: premio assegna la forma a un esemplare idoneo una sola volta", () => {
  const mon = createMonster("salvinator", 20);
  const first = grantSeasonalForm([mon], [], new Date(2026, 6, 11));
  assert.equal(first.formId, "salvinator_spiaggia");
  assert.equal(mon.memeFormId, first.formId);
  const second = grantSeasonalForm([mon], first.unlocked, new Date(2026, 6, 11));
  assert.equal(second.formId, undefined);
});

test("P6-T04: bonus è leggero e sanitize rimuove forme incompatibili", () => {
  const mon = createMonster("salvinator", 20);
  const base = statsOf(mon);
  mon.memeFormId = "salvinator_spiaggia";
  const boosted = statsOf(mon);
  assert.equal(boosted.def, Math.floor(base.def * 1.05));
  assert.equal(boosted.atk, base.atk);
  mon.speciesId = "giorgiagon";
  sanitizeMon(mon);
  assert.equal(mon.memeFormId, undefined);
});
