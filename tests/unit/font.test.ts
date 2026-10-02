import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getGlyph, CHAR_W, GLYPH_W, GLYPH_H, textWidth } from "../../src/engine/font.ts";

// Pixel digest captured from the original uncompressed 66-glyph font.
test("packed font preserves every original glyph pixel and Italian accents", () => {
  const keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", ".", ",", "!", "?", "'", "\"", "-", "+", ":", ";", "/", "(", ")", "%", "►", "◄", "▼", "▲", "♂", "♀", "È", "É", "À", "Ì", "Ò", "Ù", "★", "♪", "…", "€"];
  const pixels = keys.map(key => [key, getGlyph(key)] as const).sort(([a], [b]) => a.localeCompare(b, "en"));
  assert.equal(createHash("sha256").update(JSON.stringify(pixels)).digest("hex"), "7ddb0323f2c8df2ace09ef4f1c4c70a64c8704360d3606ad6e393d12cf8a9eee");
  for (const key of keys) {
    assert.equal(getGlyph(key)?.length, GLYPH_H);
    assert.ok(getGlyph(key)?.every(row => row.length === GLYPH_W));
    assert.strictEqual(getGlyph(key.toLowerCase()), getGlyph(key));
  }
  assert.equal(getGlyph("未"), undefined);
  assert.equal(textWidth("FIDUCIA"), 7 * CHAR_W - 1);
});
