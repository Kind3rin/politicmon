import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MEME_EVENTS } from "../../src/data/memeevents.ts";
test("P7-T07: ogni evento reale ha una review satirica completa", () => {
  const reviews = JSON.parse(readFileSync("design/editorial/satire-review.json", "utf8")); assert.equal(reviews.length, MEME_EVENTS.length); assert.deepEqual(new Set(reviews.map((review: any) => review.id)), new Set(MEME_EVENTS.map((event) => event.id))); assert.ok(reviews.every((review: any) => review.sourceVerified && review.publicEvent && review.clearParody && review.noUnprovenAccusation && review.noProtectedTarget && review.balancedTone && review.evergreenReadable));
});
