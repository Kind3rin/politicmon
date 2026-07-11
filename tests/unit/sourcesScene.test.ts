import assert from "node:assert/strict";
import test from "node:test";
import { MEME_EVENTS } from "../../src/data/memeevents.ts";
import { openSource, SOURCE_ENTRIES } from "../../src/scenes/SourcesScene.ts";

test("P6-T06: crediti coprono ogni evento con titolo, fonte e HTTPS", () => {
  assert.equal(SOURCE_ENTRIES.length, MEME_EVENTS.length);
  for (const entry of SOURCE_ENTRIES) { assert.ok(entry.title); assert.ok(entry.label); assert.match(entry.url, /^https:\/\//); }
});
test("P6-T06: il link si apre solo tramite chiamata esplicita e rifiuta HTTP", () => {
  const opened: string[] = [];
  assert.equal(openSource(SOURCE_ENTRIES[0], (url) => opened.push(url)), true); assert.deepEqual(opened, [SOURCE_ENTRIES[0].url]);
  assert.equal(openSource({ title: "X", label: "X", url: "http://insicuro" }, (url) => opened.push(url)), false); assert.equal(opened.length, 1);
});
