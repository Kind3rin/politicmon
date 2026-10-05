import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { NPC_WITH_PNG, PORTRAIT_PALS, dialoguePortrait } from "../../src/art/characters";

test("every role with a dialogue bust has its file, and the files are real transparent PNGs", () => {
  for (const pal of PORTRAIT_PALS) {
    const path = `public/sprites/portraits/${pal}.png`;
    assert.ok(existsSync(path), `${pal} has a bust`);
    const header = readFileSync(path).subarray(0, 33);
    assert.equal(header.subarray(1, 4).toString(), "PNG");
    assert.equal(header.readUInt32BE(16), 96, `${pal} is 96 wide`);
    assert.equal(header.readUInt32BE(20), 96, `${pal} is 96 tall`);
    assert.equal(header[25], 6, `${pal} keeps an alpha channel`);
  }
});

test("a speaker gets the bust, then the walking sprite, then nothing", () => {
  assert.equal(dialoguePortrait("professor"), "/sprites/portraits/professor.png");
  assert.equal(dialoguePortrait("civic-mayor"), "/sprites/portraits/civic-mayor.png");
  assert.equal(dialoguePortrait("tour-hub"), undefined);
  assert.ok([...NPC_WITH_PNG].every(pal => PORTRAIT_PALS.has(pal)), "all ten base roles have a bust");
});
