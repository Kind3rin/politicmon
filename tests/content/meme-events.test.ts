import { test } from "node:test";
import assert from "node:assert/strict";
import { activeMemeEvents, MEME_EVENTS } from "../../src/data/meme-events/index.ts";

test("meme events: id/fonti/fallback validi e unici", () => {
  assert.equal(new Set(MEME_EVENTS.map((event) => event.id)).size, MEME_EVENTS.length);
  for (const event of MEME_EVENTS) {
    assert.match(event.source.url, /^https:\/\//);
    assert.equal(event.choices.length, 2);
    assert.ok(event.editorial.fact.length > 20);
    assert.ok(event.editorial.fallback.length > 10);
  }
});

test("meme events: scadenza filtra i pack fragili senza perdere evergreen", () => {
  const during = activeMemeEvents(new Date("2026-07-10T12:00:00Z"));
  assert.equal(during.length, MEME_EVENTS.length);
  const later = activeMemeEvents(new Date("2028-01-01T00:00:00Z"));
  assert.deepEqual(later.map((event) => event.id), MEME_EVENTS.filter((event) => !event.active).map((event) => event.id));
  assert.ok(!later.some((event) => event.id === "diplomatic_selfie_reality"));
});
